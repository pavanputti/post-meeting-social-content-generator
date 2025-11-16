import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"'
import { prisma } from '@/lib/prisma'
import { createRecallBot } from '@/lib/recall'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { enabled } = body

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const recallApiKey = process.env.RECALL_API_KEY
    if (!recallApiKey) {
      return NextResponse.json(
        { error: 'Recall API key not configured' },
        { status: 500 }
      )
    }

    // Get user settings for bot join time
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    const botJoinMinutesBefore = settings?.botJoinMinutesBefore || 5

    let recallBotId = meeting.recallBotId
    let recallBotStatus = meeting.recallBotStatus

    if (enabled && !meeting.recallBotId && meeting.meetingLink) {
      // Create recall bot
      try {
        const bot = await createRecallBot(recallApiKey, meeting.meetingLink, botJoinMinutesBefore)
        recallBotId = bot.id
        recallBotStatus = 'scheduled'
      } catch (error) {
        console.error('Error creating recall bot:', error)
        return NextResponse.json(
          { error: 'Failed to create recall bot' },
          { status: 500 }
        )
      }
    }

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        notetakerEnabled: enabled,
        recallBotId,
        recallBotStatus,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notetaker status:', error)
    return NextResponse.json(
      { error: 'Failed to update notetaker status' },
      { status: 500 }
    )
  }
}

