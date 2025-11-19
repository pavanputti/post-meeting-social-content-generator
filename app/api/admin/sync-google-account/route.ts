import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// This endpoint syncs the Google account from NextAuth Account table to GoogleAccount table
// Call it once: GET /api/admin/sync-google-account
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the Google account in NextAuth's Account table
    const nextAuthAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    })

    if (!nextAuthAccount) {
      return NextResponse.json({ 
        success: false,
        message: 'No Google account found in NextAuth Account table. Please sign out and sign back in.',
      })
    }

    if (!nextAuthAccount.access_token) {
      return NextResponse.json({ 
        success: false,
        message: 'No access token found in NextAuth Account. Please sign out and sign back in.',
      })
    }

    const userEmail = session.user.email || nextAuthAccount.providerAccountId

    if (!userEmail) {
      return NextResponse.json({ 
        success: false,
        message: 'No email found for user.',
      })
    }

    // Calculate expiration time
    const expiresAt = nextAuthAccount.expires_at
      ? new Date(nextAuthAccount.expires_at * 1000)
      : null

    // Sync to GoogleAccount table
    const googleAccount = await prisma.googleAccount.upsert({
      where: {
        userId_email: {
          userId: session.user.id,
          email: userEmail,
        },
      },
      update: {
        accessToken: nextAuthAccount.access_token,
        refreshToken: nextAuthAccount.refresh_token || undefined,
        expiresAt,
      },
      create: {
        userId: session.user.id,
        email: userEmail,
        accessToken: nextAuthAccount.access_token,
        refreshToken: nextAuthAccount.refresh_token || undefined,
        expiresAt,
      },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Google account synced successfully',
      account: {
        id: googleAccount.id,
        email: googleAccount.email,
        hasAccessToken: !!googleAccount.accessToken,
        expiresAt: googleAccount.expiresAt,
      },
    })
  } catch (error: any) {
    console.error('Error syncing Google account:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message,
      note: 'Make sure DATABASE_URL is set and database tables exist'
    }, { status: 500 })
  }
}

