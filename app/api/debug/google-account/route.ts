import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const googleAccounts = await prisma.googleAccount.findMany({
      where: { userId: session.user.id },
    })

    return NextResponse.json({
      userId: session.user.id,
      email: session.user.email,
      googleAccounts: googleAccounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        hasAccessToken: !!acc.accessToken,
        accessTokenLength: acc.accessToken?.length || 0,
        expiresAt: acc.expiresAt,
        isExpired: acc.expiresAt ? new Date(acc.expiresAt) < new Date() : null,
      })),
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Failed to debug', details: String(error) },
      { status: 500 }
    )
  }
}

