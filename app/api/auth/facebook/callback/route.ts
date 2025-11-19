import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import axios from 'axios'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (error) {
      return NextResponse.redirect(`${baseUrl}/settings?error=facebook_auth_failed`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/settings?error=missing_params`)
    }

    // Verify state matches user ID
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.id !== state) {
      return NextResponse.redirect(`${baseUrl}/settings?error=invalid_state`)
    }

    // Exchange code for access token
    const tokenResponse = await axios.get(
      'https://graph.facebook.com/v18.0/oauth/access_token',
      {
        params: {
          client_id: process.env.FACEBOOK_CLIENT_ID!,
          client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/facebook/callback`,
          code,
        },
      }
    )

    const { access_token, expires_in } = tokenResponse.data
    
    // Get long-lived token (60 days) if possible
    let longLivedToken = access_token
    try {
      const longLivedResponse = await axios.get(
        'https://graph.facebook.com/v18.0/oauth/access_token',
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: process.env.FACEBOOK_CLIENT_ID!,
            client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
            fb_exchange_token: access_token,
          },
        }
      )
      longLivedToken = longLivedResponse.data.access_token
      console.log('Got long-lived Facebook token')
    } catch (error) {
      console.log('Could not get long-lived token, using short-lived token')
    }

    // Fetch user's Facebook pages using GET /me/accounts
    let pages: any[] = []
    try {
      const pagesResponse = await axios.get(
        'https://graph.facebook.com/v18.0/me/accounts',
        {
          params: {
            access_token: longLivedToken,
            fields: 'id,name,category,access_token',
          },
        }
      )
      pages = pagesResponse.data.data || []
      console.log(`Found ${pages.length} Facebook pages`)
    } catch (error: any) {
      console.error('Error fetching Facebook pages:', error.response?.data || error.message)
      // Continue even if pages fetch fails
    }

    // Save to user settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      include: { facebookPages: true },
    })

    if (settings) {
      await prisma.userSettings.update({
        where: { id: settings.id },
        data: {
          facebookAccessToken: longLivedToken,
        },
      })

      // Delete existing pages and recreate
      await prisma.facebookPage.deleteMany({
        where: { userId: session.user.id },
      })
    } else {
      await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          facebookAccessToken: longLivedToken,
        },
      })
    }

    // Save Facebook pages (page_id and page_access_token)
    if (pages.length > 0) {
      await prisma.facebookPage.createMany({
        data: pages.map((page) => ({
          userId: session.user.id,
          pageId: page.id,
          pageName: page.name,
          accessToken: page.access_token,
          category: page.category || null,
        })),
      })

      // Auto-select first page if none selected
      if (!settings?.facebookSelectedPageId && pages.length > 0) {
        await prisma.userSettings.update({
          where: { userId: session.user.id },
          data: {
            facebookSelectedPageId: pages[0].id,
          },
        })
      }
    }

    return NextResponse.redirect(`${baseUrl}/settings?success=facebook_connected`)
  } catch (error: any) {
    console.error('Facebook OAuth error:', error)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    // Provide more specific error messages
    let errorType = 'facebook_auth_failed'
    if (error.response?.data?.error) {
      const fbError = error.response.data.error
      console.error('Facebook API error:', fbError)
      
      if (fbError.code === 190 || fbError.code === 102) {
        errorType = 'facebook_invalid_token'
      } else if (fbError.code === 200) {
        errorType = 'facebook_permission_denied'
      } else if (fbError.message?.includes('redirect_uri')) {
        errorType = 'facebook_redirect_mismatch'
      }
    }
    
    return NextResponse.redirect(`${baseUrl}/settings?error=${errorType}`)
  }
}
