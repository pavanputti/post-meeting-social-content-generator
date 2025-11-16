import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { checkBotStatus } from '@/lib/recall'
import axios from 'axios'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recallApiKey = process.env.RECALL_API_KEY
    if (!recallApiKey) {
      return NextResponse.json(
        { error: 'Recall API key not configured' },
        { status: 500 }
      )
    }

    // Get all meetings with recall bots that haven't completed OR are done but missing/broken transcript
    const meetings = await prisma.meeting.findMany({
      where: {
        userId: session.user.id,
        recallBotId: { not: null },
        OR: [
          { recallBotStatus: { notIn: ['done', 'completed'] } },
          { 
            recallBotStatus: { in: ['done', 'completed'] },
            OR: [
              { transcript: null },
              // Also fetch if transcript contains [object Object] (broken)
            ],
          },
        ],
      },
    })

    const updated: any[] = []

    for (const meeting of meetings) {
      if (!meeting.recallBotId) continue

      try {
        const botStatus = await checkBotStatus(recallApiKey, meeting.recallBotId)

        // Fetch transcript if available or if existing transcript is broken
        let transcript = meeting.transcript
        const needsTranscript = !transcript || 
          (typeof transcript === 'string' && transcript.includes('[object Object]')) ||
          typeof transcript !== 'string'
        
        if (botStatus.transcriptUrl && needsTranscript) {
          try {
            const transcriptResponse = await axios.get(botStatus.transcriptUrl, {
              headers: {
                'Accept': 'application/json, text/plain, */*',
              },
            })
            
            // Handle different transcript formats from Recall.ai
            // According to docs: https://docs.recall.ai/docs/quickstart
            // The transcript is a JSON file, typically with segments array
            let segments: any[] = []
            
            if (typeof transcriptResponse.data === 'string') {
              // Try to parse as JSON
              try {
                const parsed = JSON.parse(transcriptResponse.data)
                if (Array.isArray(parsed)) {
                  segments = parsed
                } else if (parsed.segments || parsed.transcript) {
                  segments = parsed.segments || parsed.transcript || []
                } else {
                  // It's a plain text string
                  transcript = transcriptResponse.data
                }
              } catch {
                // It's actually a plain text string
                transcript = transcriptResponse.data
              }
            } else if (Array.isArray(transcriptResponse.data)) {
              // Transcript is an array of segments
              segments = transcriptResponse.data
            } else if (transcriptResponse.data.segments) {
              // Transcript has segments property
              segments = transcriptResponse.data.segments
            } else if (transcriptResponse.data.transcript) {
              // Transcript has transcript property (could be array or object)
              const transcriptData = transcriptResponse.data.transcript
              segments = Array.isArray(transcriptData) ? transcriptData : []
            } else if (transcriptResponse.data.words) {
              // Transcript has words array (different format)
              segments = transcriptResponse.data.words.map((word: any, idx: number) => ({
                text: word.word || word.text || '',
                speaker: word.speaker || 'Speaker',
                start_time: word.start_time || word.start || '',
              }))
            }
            
            // Format segments into readable text
            if (segments.length > 0) {
              transcript = segments
                .map((segment: any) => {
                  // Extract speaker name - handle both string and object formats
                  let speaker = 'Speaker'
                  if (segment.speaker) {
                    speaker = typeof segment.speaker === 'string' 
                      ? segment.speaker 
                      : segment.speaker.name || segment.speaker.display_name || segment.speaker.id || 'Speaker'
                  } else if (segment.participant) {
                    speaker = typeof segment.participant === 'string'
                      ? segment.participant
                      : segment.participant.name || segment.participant.display_name || segment.participant.id || 'Speaker'
                  } else if (segment.participant_name) {
                    speaker = typeof segment.participant_name === 'string'
                      ? segment.participant_name
                      : segment.participant_name.name || segment.participant_name.display_name || 'Speaker'
                  }
                  
                  const text = segment.text || 
                    segment.words?.map((w: any) => w.word || w.text || '').join(' ') || 
                    segment.word || ''
                  const time = segment.start_time || segment.start || segment.timestamp || ''
                  
                  if (!text) return null
                  
                  return time ? `[${time}] ${speaker}: ${text}` : `${speaker}: ${text}`
                })
                .filter((line: string | null) => line !== null)
                .join('\n')
            }
            
            // If we still don't have a transcript, try to extract any text from the response
            if (!transcript || transcript.trim().length === 0) {
              // Last resort: stringify with formatting
              transcript = JSON.stringify(transcriptResponse.data, null, 2)
            }
            
            console.log(`Fetched transcript for meeting ${meeting.id}, length: ${transcript?.length || 0}, segments: ${segments.length}`)
          } catch (error: any) {
            console.error(`Error fetching transcript for meeting ${meeting.id}:`, error.message)
            // Don't fail the whole operation if one transcript fails
          }
        }

        // Only update transcript if we got a new one
        const updateData: any = {
          recallBotStatus: botStatus.status,
          transcriptUrl: botStatus.transcriptUrl || undefined,
        }
        
        if (transcript) {
          // Ensure transcript is always a string
          updateData.transcript = typeof transcript === 'string' 
            ? transcript 
            : JSON.stringify(transcript)
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

