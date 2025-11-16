import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../[...nextauth]/route'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect('/api/auth/signin')
  }

  // Twitter OAuth 1.0a flow
  // Note: Twitter API v2 requires paid access for posting
  // This is a simplified implementation
  
  const clientId = process.env.TWITTER_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`
  const state = session.user.id

  // Twitter uses OAuth 2.0 for API v2
  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.write%20users.read&state=${state}&code_challenge=challenge&code_challenge_method=plain`

  return NextResponse.redirect(authUrl)
}

