import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../[...nextauth]/route'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect('/api/auth/signin')
  }

  // LinkedIn OAuth flow
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/linkedin/callback`
  const state = session.user.id // Use user ID as state for security

  // Validate environment variables
  if (!clientId) {
    console.error('LINKEDIN_CLIENT_ID is not set in environment variables')
    return NextResponse.redirect('/settings?error=linkedin_not_configured')
  }

  if (!process.env.NEXTAUTH_URL) {
    console.error('NEXTAUTH_URL is not set in environment variables')
    return NextResponse.redirect('/settings?error=nextauth_not_configured')
  }

  // Request OpenID Connect scopes (openid profile) + posting scope (w_member_social)
  // LinkedIn deprecated r_liteprofile, so we use OpenID Connect instead
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=openid%20profile%20w_member_social`

  return NextResponse.redirect(authUrl)
}

