import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { accessToken, refreshToken, expiresAt, email } = body

    if (!accessToken || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if account already exists
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
          accessToken,
          refreshToken,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      })
      return NextResponse.json({ success: true, account: existing })
    }

    // Create new account
    const account = await prisma.googleAccount.create({
      data: {
        userId: session.user.id,
        email,
        accessToken,
        refreshToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('Error connecting Google account:', error)
    return NextResponse.json(
      { error: 'Failed to connect Google account' },
      { status: 500 }
    )
  }
}

