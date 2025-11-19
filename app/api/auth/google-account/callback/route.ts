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
      return NextResponse.redirect(`${baseUrl}/settings?error=google_auth_failed`)
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
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google-account/callback`,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const { access_token, refresh_token, expires_in } = tokenResponse.data

    // Get user info to get email
    const userInfoResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    const email = userInfoResponse.data.email

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/settings?error=no_email`)
    }

    // Calculate expiration time
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null

    // Save to GoogleAccount table
    const existing = await prisma.googleAccount.findUnique({
      where: {
        userId_email: {
          userId: session.user.id,
          email,
        },
      },
    })

    if (existing) {
      // Update existing account
      await prisma.googleAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token || undefined,
          expiresAt,
        },
      })
    } else {
      // Create new account
      await prisma.googleAccount.create({
        data: {
          userId: session.user.id,
          email,
          accessToken: access_token,
          refreshToken: refresh_token || undefined,
          expiresAt,
        },
      })
    }

    return NextResponse.redirect(`${baseUrl}/settings?success=google_connected`)
  } catch (error: any) {
    console.error('Error in Google account callback:', error)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      `${baseUrl}/settings?error=google_auth_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`
    )
  }
}

