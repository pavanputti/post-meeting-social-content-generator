import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const googleAccounts = await prisma.googleAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ accounts: googleAccounts })
  } catch (error) {
    console.error('Error fetching Google accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Google accounts' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Verify the account belongs to the user
    const account = await prisma.googleAccount.findUnique({
      where: { id: accountId },
    })

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 404 }
      )
    }

    // Prevent deleting the primary login account
    if (session.user.email && account.email === session.user.email) {
      return NextResponse.json(
        { error: 'Cannot disconnect primary login account' },
        { status: 400 }
      )
    }

    await prisma.googleAccount.delete({
      where: { id: accountId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting Google account:', error)
    return NextResponse.json(
      { error: 'Failed to delete Google account' },
      { status: 500 }
    )
  }
}

