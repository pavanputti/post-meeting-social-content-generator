import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect('/api/auth/signin')
  }

  // Facebook OAuth flow
  const clientId = process.env.FACEBOOK_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/facebook/callback`
  const state = session.user.id

  // Request permissions for posting to user feed and pages
  const scope = 'pages_manage_posts,pages_read_engagement,publish_to_groups,user_posts'
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`

  return NextResponse.redirect(authUrl)
}

