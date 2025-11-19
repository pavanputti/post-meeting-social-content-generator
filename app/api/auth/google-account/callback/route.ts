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
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(`${baseUrl}/settings?error=google_auth_failed`)
    }

    if (!code || !state) {
      console.error('Missing OAuth parameters:', { code: !!code, state: !!state })
      return NextResponse.redirect(`${baseUrl}/settings?error=missing_params`)
    }

    // Get session first
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.error('No session found in callback')
      return NextResponse.redirect(`${baseUrl}/settings?error=no_session`)
    }

    // Verify state matches user ID
    if (session.user.id !== state) {
      console.error('State mismatch:', { 
        sessionUserId: session.user.id, 
        state,
        sessionEmail: session.user.email 
      })
      return NextResponse.redirect(`${baseUrl}/settings?error=invalid_state`)
    }

    console.log('Session validated, proceeding with token exchange for user:', session.user.id)

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth credentials not configured')
      return NextResponse.redirect(`${baseUrl}/settings?error=google_not_configured`)
    }

    // Exchange code for access token
    let tokenResponse
    try {
      tokenResponse = await axios.post(
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
    } catch (error: any) {
      console.error('Error exchanging code for token:', error.response?.data || error.message)
      return NextResponse.redirect(
        `${baseUrl}/settings?error=token_exchange_failed&message=${encodeURIComponent(error.message || 'Token exchange failed')}`
      )
    }

    const { access_token, refresh_token, expires_in } = tokenResponse.data

    if (!access_token) {
      console.error('No access token received from Google')
      return NextResponse.redirect(`${baseUrl}/settings?error=no_access_token`)
    }

    // Get user info to get email
    let userInfoResponse
    try {
      userInfoResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
    } catch (error: any) {
      console.error('Error fetching user info:', error.response?.data || error.message)
      return NextResponse.redirect(
        `${baseUrl}/settings?error=user_info_failed&message=${encodeURIComponent(error.message || 'Failed to fetch user info')}`
      )
    }

    const email = userInfoResponse.data.email

    if (!email) {
      console.error('No email in user info response:', userInfoResponse.data)
      return NextResponse.redirect(`${baseUrl}/settings?error=no_email`)
    }

    console.log('Successfully retrieved email from Google:', email)

    // Check if this email is already linked to another user account
    const emailLinkedToOtherUser = await prisma.googleAccount.findFirst({
      where: {
        email,
        userId: {
          not: session.user.id,
        },
      },
    })

    if (emailLinkedToOtherUser) {
      console.error('Email already linked to another user:', emailLinkedToOtherUser.userId)
      return NextResponse.redirect(
        `${baseUrl}/settings?error=email_already_linked&message=${encodeURIComponent('This email is already linked to another account')}`
      )
    }

    // Calculate expiration time
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null

    // Save to GoogleAccount table
    try {
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
        console.log('Updating existing Google account:', existing.id)
        await prisma.googleAccount.update({
          where: { id: existing.id },
          data: {
            accessToken: access_token,
            refreshToken: refresh_token || undefined,
            expiresAt,
          },
        })
        console.log('Successfully updated Google account')
      } else {
        // Create new account
        console.log('Creating new Google account for user:', session.user.id, 'email:', email)
        await prisma.googleAccount.create({
          data: {
            userId: session.user.id,
            email,
            accessToken: access_token,
            refreshToken: refresh_token || undefined,
            expiresAt,
          },
        })
        console.log('Successfully created Google account')
      }
    } catch (dbError: any) {
      console.error('Database error saving Google account:', dbError)
      return NextResponse.redirect(
        `${baseUrl}/settings?error=database_error&message=${encodeURIComponent(dbError.message || 'Database error')}`
      )
    }

    console.log('Google account linking completed successfully')
    return NextResponse.redirect(`${baseUrl}/settings?success=google_connected`)
  } catch (error: any) {
    console.error('Error in Google account callback:', error)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      `${baseUrl}/settings?error=google_auth_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`
    )
  }
}

