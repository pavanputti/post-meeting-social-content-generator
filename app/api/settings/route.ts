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

    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    if (!settings) {
      // Create default settings
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          botJoinMinutesBefore: 5,
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { botJoinMinutesBefore, facebookAccessToken } = body

    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    const updateData: any = {}
    if (botJoinMinutesBefore !== undefined) {
      updateData.botJoinMinutesBefore = botJoinMinutesBefore || 5
    }
    if (facebookAccessToken !== undefined) {
      updateData.facebookAccessToken = facebookAccessToken
    }

    if (settings) {
      settings = await prisma.userSettings.update({
        where: { id: settings.id },
        data: updateData,
      })
    } else {
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          botJoinMinutesBefore: botJoinMinutesBefore || 5,
          facebookAccessToken: facebookAccessToken || undefined,
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

