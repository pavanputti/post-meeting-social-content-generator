import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect("/api/auth/signin")
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/facebook/callback`
  const state = session.user.id

  if (!clientId) {
    console.error("FACEBOOK_CLIENT_ID is not set")
    return NextResponse.redirect("/settings?error=facebook_not_configured")
  }

  if (!process.env.NEXTAUTH_URL) {
    console.error("NEXTAUTH_URL is not set")
    return NextResponse.redirect("/settings?error=nextauth_not_configured")
  }

  const scope = "pages_read_engagement,pages_manage_posts,pages_show_list"
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}&response_type=code`

  return NextResponse.redirect(authUrl)
}
