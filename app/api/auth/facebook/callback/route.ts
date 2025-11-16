import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect('/settings?error=facebook_auth_failed')
    }

    if (!code || !state) {
      return NextResponse.redirect('/settings?error=missing_params')
    }

    // Verify state matches user ID
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.id !== state) {
      return NextResponse.redirect('/settings?error=invalid_state')
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

    // Save to user settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    if (settings) {
      await prisma.userSettings.update({
        where: { id: settings.id },
        data: {
          facebookAccessToken: longLivedToken,
        },
      })
    } else {
      await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          facebookAccessToken: longLivedToken,
        },
      })
    }

    return NextResponse.redirect('/settings?success=facebook_connected')
  } catch (error) {
    console.error('Facebook OAuth error:', error)
    return NextResponse.redirect('/settings?error=facebook_auth_failed')
  }
}

