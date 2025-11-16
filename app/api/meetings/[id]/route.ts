import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import { generatePost, generateFollowUpEmail } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        googleAccount: true,
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Ensure transcript is a string (not an object) - fix existing data
    let transcriptString = null
    const transcriptIsBroken = meeting.transcript && (
      typeof meeting.transcript !== 'string' ||
      meeting.transcript.includes('[object Object]')
    )
    
    if (meeting.transcript) {
      if (typeof meeting.transcript === 'string' && !meeting.transcript.includes('[object Object]')) {
        transcriptString = meeting.transcript
      } else {
        // Transcript is broken - try to re-fetch if we have a transcriptUrl
        if (transcriptIsBroken && meeting.transcriptUrl) {
          try {
            const { checkBotStatus } = await import('@/lib/recall')
            const recallApiKey = process.env.RECALL_API_KEY
            if (recallApiKey && meeting.recallBotId) {
              const botStatus = await checkBotStatus(recallApiKey, meeting.recallBotId)
              if (botStatus.transcriptUrl) {
                const axios = (await import('axios')).default
                const transcriptResponse = await axios.get(botStatus.transcriptUrl, {
                  headers: {
                    'Accept': 'application/json, text/plain, */*',
                  },
                })
                
                // Parse the transcript properly
                let segments: any[] = []
                if (Array.isArray(transcriptResponse.data)) {
                  segments = transcriptResponse.data
                } else if (transcriptResponse.data.segments) {
                  segments = transcriptResponse.data.segments
                } else if (transcriptResponse.data.transcript) {
                  const transcriptData = transcriptResponse.data.transcript
                  segments = Array.isArray(transcriptData) ? transcriptData : []
                }
                
                if (segments.length > 0) {
                  transcriptString = segments
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
                  
                  // Update in database
                  await prisma.meeting.update({
                    where: { id: meeting.id },
                    data: { transcript: transcriptString },
                  })
                }
              }
            }
          } catch (error) {
            console.error('Error re-fetching broken transcript:', error)
            // Fallback to stringifying the object
            transcriptString = typeof meeting.transcript === 'string' 
              ? meeting.transcript 
              : JSON.stringify(meeting.transcript)
          }
        } else {
          // Convert object to string
          transcriptString = typeof meeting.transcript === 'string' 
            ? meeting.transcript 
            : JSON.stringify(meeting.transcript)
        }
      }
    }

    const meetingData = {
      ...meeting,
      transcript: transcriptString,
    }

    return NextResponse.json({ meeting: meetingData })
  } catch (error) {
    console.error('Error fetching meeting:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, platform, automationId, generateEmail } = body

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (action === 'generate') {
      if (!meeting.transcript) {
        return NextResponse.json(
          { error: 'No transcript available' },
          { status: 400 }
        )
      }

      // Ensure transcript is a string
      const transcriptString = typeof meeting.transcript === 'string' 
        ? meeting.transcript 
        : JSON.stringify(meeting.transcript)

      // Note: We now use free alternatives (Gemini API or template-based)
      // No API key required for basic functionality

      let automation = null
      if (automationId) {
        automation = await prisma.automation.findFirst({
          where: {
            id: automationId,
            userId: session.user.id,
          },
        })
      }

      try {
        const automationForPost = automation ? {
          description: automation.description,
          example: automation.example || undefined,
        } : undefined
        const post = await generatePost(transcriptString, automationForPost)

        if (!post || post.trim().length === 0) {
          return NextResponse.json(
            { error: 'Failed to generate post. Please try again.' },
            { status: 500 }
          )
        }

        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { generatedPost: post },
        })

        return NextResponse.json({ post })
      } catch (error: any) {
        console.error('Error generating post:', error)
        return NextResponse.json(
          { error: error.message || 'Failed to generate post. Please try again.' },
          { status: 500 }
        )
      }
    }

    if (action === 'generate-email') {
      if (!meeting.transcript) {
        return NextResponse.json(
          { error: 'No transcript available' },
          { status: 400 }
        )
      }

      // Ensure transcript is a string and clean it
      let transcriptString = typeof meeting.transcript === 'string' 
        ? meeting.transcript 
        : JSON.stringify(meeting.transcript)
      
      // Clean up any [object Object]: markers that might be in the transcript
      transcriptString = transcriptString.replace(/\[object Object\]:\s*/g, '')

      try {
        const email = await generateFollowUpEmail(transcriptString)

        if (!email || email.trim().length === 0) {
          return NextResponse.json(
            { error: 'Failed to generate follow-up email. Please try again.' },
            { status: 500 }
          )
        }

        // Ensure the generated email is not just the transcript
        // Check if email looks like a transcript (contains speaker patterns or [object Object])
        const looksLikeTranscript = email.includes('[object Object]:') ||
          email.match(/^[^:]+:\s*[A-Z]/) || // Starts with "Speaker: Text"
          email === transcriptString ||
          email.length > 5000 // Transcripts are usually very long

        if (looksLikeTranscript) {
          console.error('Generated email looks like transcript, not saving')
          return NextResponse.json(
            { error: 'Failed to generate a proper email. The generated content appears to be a transcript. Please try again.' },
            { status: 500 }
          )
        }

        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { followUpEmail: email },
        })

        return NextResponse.json({ email })
      } catch (error: any) {
        console.error('Error generating email:', error)
        return NextResponse.json(
          { error: error.message || 'Failed to generate follow-up email. Please try again.' },
          { status: 500 }
        )
      }
    }

    if (action === 'post') {
      if (!meeting.generatedPost) {
        return NextResponse.json(
          { error: 'No generated post available' },
          { status: 400 }
        )
      }

      if (!platform) {
        return NextResponse.json(
          { error: 'Platform not specified' },
          { status: 400 }
        )
      }

      try {
        const { postToLinkedIn, postToFacebook } = await import('@/lib/social-media')
        
        let success = false
        let errorMessage = ''
        const updateData: any = {}

        if (platform === 'linkedin') {
          try {
            success = await postToLinkedIn(session.user.id, meeting.generatedPost)
            if (success) {
              updateData.postedToLinkedIn = true
            } else {
              errorMessage = 'Failed to post to LinkedIn. Please check if your LinkedIn account is connected in Settings.'
            }
          } catch (error: any) {
            console.error('LinkedIn posting error:', error)
            errorMessage = error.message || 'LinkedIn not connected. Please connect your LinkedIn account in Settings.'
          }
        } else if (platform === 'facebook') {
          try {
            success = await postToFacebook(session.user.id, meeting.generatedPost)
            if (success) {
              updateData.postedToFacebook = true
            } else {
              errorMessage = 'Failed to post to Facebook. Please check if your Facebook account is connected in Settings.'
            }
          } catch (error: any) {
            console.error('Facebook posting error:', error)
            errorMessage = error.message || 'Facebook not connected. Please connect your Facebook account in Settings.'
          }
        } else {
          return NextResponse.json(
            { error: `Invalid platform: ${platform}` },
            { status: 400 }
          )
        }

        if (success) {
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: updateData,
          })
          return NextResponse.json({ success: true })
        } else {
          return NextResponse.json(
            { error: errorMessage || 'Failed to post to social media' },
            { status: 400 }
          )
        }
      } catch (error: any) {
        console.error('Error in post action:', error)
        return NextResponse.json(
          { error: error.message || 'Failed to post to social media. Please check your connection and try again.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing meeting action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}

