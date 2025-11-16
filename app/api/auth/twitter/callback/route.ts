import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect('/settings?error=twitter_auth_failed')
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
    const tokenResponse = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.TWITTER_CLIENT_ID!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`,
        code_verifier: 'challenge', // Should match code_challenge from auth
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: process.env.TWITTER_CLIENT_ID!,
          password: process.env.TWITTER_CLIENT_SECRET!,
        },
      }
    )

    const { access_token } = tokenResponse.data

    // Save to user settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    if (settings) {
      await prisma.userSettings.update({
        where: { id: settings.id },
        data: {
          twitterAccessToken: access_token,
        },
      })
    } else {
      await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          twitterAccessToken: access_token,
        },
      })
    }

    return NextResponse.redirect('/settings?success=twitter_connected')
  } catch (error) {
    console.error('Twitter OAuth error:', error)
    return NextResponse.redirect('/settings?error=twitter_auth_failed')
  }
}

