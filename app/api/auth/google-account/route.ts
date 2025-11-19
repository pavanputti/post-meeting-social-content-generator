import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect('/api/auth/signin')
  }

  // Google OAuth flow for connecting additional accounts
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google-account/callback`
  const state = session.user.id // Use user ID as state for security

  // Validate environment variables
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID is not set in environment variables')
    return NextResponse.redirect('/settings?error=google_not_configured')
  }

  if (!process.env.NEXTAUTH_URL) {
    console.error('NEXTAUTH_URL is not set in environment variables')
    return NextResponse.redirect('/settings?error=nextauth_not_configured')
  }

  // Request calendar access scope
  const scope = 'openid email profile https://www.googleapis.com/auth/calendar.readonly'
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`

  return NextResponse.redirect(authUrl)
}

