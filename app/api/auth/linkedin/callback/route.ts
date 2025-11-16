import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (error) {
      return NextResponse.redirect(`${baseUrl}/settings?error=linkedin_auth_failed`)
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
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data

    // Log the scopes received (for debugging)
    console.log('LinkedIn token received with scopes:', scope)
    
    // Verify that w_member_social scope is included
    if (scope && !scope.includes('w_member_social')) {
      console.warn('Warning: w_member_social scope not found in token. Scopes received:', scope)
    }

    // Save to user settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    if (settings) {
      await prisma.userSettings.update({
        where: { id: settings.id },
        data: {
          linkedInAccessToken: access_token,
          linkedInRefreshToken: refresh_token,
        },
      })
    } else {
      await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          linkedInAccessToken: access_token,
          linkedInRefreshToken: refresh_token,
        },
      })
    }
    
    console.log('LinkedIn token saved successfully for user:', session.user.id)

    return NextResponse.redirect(`${baseUrl}/settings?success=linkedin_connected`)
  } catch (error: any) {
    console.error('LinkedIn OAuth error:', error)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    // Provide more specific error messages
    let errorParam = 'linkedin_auth_failed'
    if (error.response?.data) {
      console.error('LinkedIn API error details:', error.response.data)
      if (error.response.status === 400) {
        errorParam = 'linkedin_invalid_request'
      } else if (error.response.status === 401) {
        errorParam = 'linkedin_unauthorized'
      }
    }
    
    return NextResponse.redirect(`${baseUrl}/settings?error=${errorParam}`)
  }
}

