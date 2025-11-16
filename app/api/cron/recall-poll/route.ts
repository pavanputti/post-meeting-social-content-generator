import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkBotStatus } from '@/lib/recall'
import axios from 'axios'

// This endpoint should be called periodically (e.g., via Vercel Cron or similar)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if needed
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recallApiKey = process.env.RECALL_API_KEY
    if (!recallApiKey) {
      return NextResponse.json(
        { error: 'Recall API key not configured' },
        { status: 500 }
      )
    }

    // Get all meetings with recall bots that haven't completed OR are done but missing transcript
    const meetings = await prisma.meeting.findMany({
      where: {
        recallBotId: { not: null },
        OR: [
          { recallBotStatus: { notIn: ['done', 'completed'] } },
          { 
            recallBotStatus: { in: ['done', 'completed'] },
            transcript: null,
          },
        ],
      },
    })

    const updated: any[] = []

    for (const meeting of meetings) {
      if (!meeting.recallBotId) continue

      try {
        const botStatus = await checkBotStatus(recallApiKey, meeting.recallBotId)

        // Fetch transcript if available
        let transcript = meeting.transcript
        if (botStatus.transcriptUrl && !transcript) {
          try {
            const transcriptResponse = await axios.get(botStatus.transcriptUrl, {
              headers: {
                'Accept': 'application/json, text/plain, */*',
              },
            })
            
            // Handle different transcript formats from Recall.ai
            if (typeof transcriptResponse.data === 'string') {
              transcript = transcriptResponse.data
            } else if (Array.isArray(transcriptResponse.data)) {
              // Transcript is an array of segments - format it nicely
              transcript = transcriptResponse.data
                .map((segment: any) => {
                  const speaker = segment.speaker || segment.participant || 'Speaker'
                  const text = segment.text || segment.words?.map((w: any) => w.word).join(' ') || ''
                  const time = segment.start_time || segment.start || ''
                  return time ? `[${time}] ${speaker}: ${text}` : `${speaker}: ${text}`
                })
                .join('\n')
            } else if (transcriptResponse.data.transcript || transcriptResponse.data.segments) {
              // Transcript is an object with transcript/segments property
              const segments = transcriptResponse.data.transcript || transcriptResponse.data.segments || []
              transcript = segments
                .map((segment: any) => {
                  const speaker = segment.speaker || segment.participant || 'Speaker'
                  const text = segment.text || segment.words?.map((w: any) => w.word).join(' ') || ''
                  const time = segment.start_time || segment.start || ''
                  return time ? `[${time}] ${speaker}: ${text}` : `${speaker}: ${text}`
                })
                .join('\n')
            } else {
              // Fallback: stringify the whole object
              transcript = JSON.stringify(transcriptResponse.data, null, 2)
            }
          } catch (error: any) {
            console.error(`Error fetching transcript for meeting ${meeting.id}:`, error.message)
          }
        }

        // Only update transcript if we got a new one
        const updateData: any = {
          recallBotStatus: botStatus.status,
          transcriptUrl: botStatus.transcriptUrl || undefined,
        }
        
        if (transcript) {
          updateData.transcript = transcript
        }
        
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: updateData,
        })

        updated.push({
          id: meeting.id,
          status: botStatus.status,
          hasTranscript: !!transcript,
        })
      } catch (error) {
        console.error(`Error checking bot ${meeting.recallBotId}:`, error)
      }
    }

    return NextResponse.json({ updated, count: updated.length })
  } catch (error) {
    console.error('Error polling recall bots:', error)
    return NextResponse.json(
      { error: 'Failed to poll recall bots' },
      { status: 500 }
    )
  }
}

