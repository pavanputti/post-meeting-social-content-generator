import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import { getCalendarEvents } from '@/lib/google-calendar'
import { extractZoomLink, extractTeamsLink, extractGoogleMeetLink, detectPlatform, extractMeetingPassword, addPasswordToZoomUrl } from '@/lib/utils'
import { createRecallBot } from '@/lib/recall'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user settings for bot join time
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    const botJoinMinutesBefore = settings?.botJoinMinutesBefore || 5

    // Get all connected Google accounts
    const googleAccounts = await prisma.googleAccount.findMany({
      where: { userId: session.user.id },
    })

    const recallApiKey = process.env.RECALL_API_KEY
    if (!recallApiKey) {
      return NextResponse.json(
        { error: 'Recall API key not configured' },
        { status: 500 }
      )
    }

    const syncedMeetings: any[] = []

    for (const account of googleAccounts) {
      try {
        // Get upcoming events
        const now = new Date()
        const future = new Date()
        future.setDate(future.getDate() + 30) // Next 30 days

        const events = await getCalendarEvents(account.accessToken, now, future)

        for (const event of events) {
          if (!event.start?.dateTime) continue

          const startTime = new Date(event.start.dateTime)
          const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(startTime.getTime() + 60 * 60 * 1000)

          // Extract meeting link
          // Google Calendar stores Meet links in hangoutLink or conferenceData
          const hangoutLink = event.hangoutLink || ''
          const conferenceData = event.conferenceData
          const meetLinkFromConference = conferenceData?.entryPoints?.find((ep: any) => 
            ep.entryPointType === 'video' && ep.uri
          )?.uri || ''
          
          const description = event.description || ''
          const location = event.location || ''
          
          // Check multiple sources for meeting links
          const zoomLink = extractZoomLink(description || location || hangoutLink)
          const teamsLink = extractTeamsLink(description || location || hangoutLink)
          const meetLink = extractGoogleMeetLink(description || location || hangoutLink || meetLinkFromConference)
          
          // Extract password from description if not already in URL
          const passwordFromDescription = extractMeetingPassword(description || location)
          
          // Prioritize: hangoutLink > conferenceData > extracted from text
          let meetingLink = hangoutLink || meetLinkFromConference || zoomLink || teamsLink || meetLink
          
          // Add password to Zoom URL if found separately and not already in URL
          if (meetingLink && zoomLink && passwordFromDescription) {
            meetingLink = addPasswordToZoomUrl(meetingLink, passwordFromDescription)
          }

          const platform = detectPlatform(description, location) || 
                          (hangoutLink || meetLinkFromConference ? 'google-meet' : null) ||
                          (meetingLink?.includes('zoom') ? 'zoom' : null) ||
                          (meetingLink?.includes('teams') ? 'teams' : null)

          // Get attendees (store as JSON string)
          const attendeesArray = event.attendees?.map((a: any) => a.email || a.displayName || '') || []
          const attendees = JSON.stringify(attendeesArray)

          // Check if meeting already exists
          const existing = await prisma.meeting.findFirst({
            where: {
              userId: session.user.id,
              googleAccountId: account.id,
              startTime: startTime,
              title: event.summary || 'Untitled Meeting',
            },
          })

          if (existing) {
            // Update existing meeting
            if (meetingLink && !existing.recallBotId && existing.notetakerEnabled) {
              // Create recall bot
              try {
                const bot = await createRecallBot(recallApiKey, meetingLink, startTime, botJoinMinutesBefore)
                await prisma.meeting.update({
                  where: { id: existing.id },
                  data: {
                    recallBotId: bot.id,
                    recallBotStatus: 'scheduled',
                    meetingLink,
                    platform,
                    attendees,
                  },
                })
              } catch (error) {
                console.error('Error creating recall bot:', error)
              }
            }
            syncedMeetings.push(existing)
            continue
          }

          // Create new meeting
          let recallBotId = null
          let recallBotStatus = null

          if (meetingLink) {
            // Create recall bot if notetaker is enabled (default to true for new meetings)
            try {
              const bot = await createRecallBot(recallApiKey, meetingLink, startTime, botJoinMinutesBefore)
              recallBotId = bot.id
              recallBotStatus = 'scheduled'
            } catch (error) {
              console.error('Error creating recall bot:', error)
            }
          }

          const meeting = await prisma.meeting.create({
            data: {
              userId: session.user.id,
              googleAccountId: account.id,
              title: event.summary || 'Untitled Meeting',
              description: description,
              startTime,
              endTime,
              meetingLink,
              platform,
              recallBotId,
              recallBotStatus,
              notetakerEnabled: true, // Default to enabled
              attendees,
            },
          })

          syncedMeetings.push(meeting)
        }
      } catch (error) {
        console.error(`Error syncing calendar for account ${account.email}:`, error)
      }
    }

    return NextResponse.json({ meetings: syncedMeetings, count: syncedMeetings.length })
  } catch (error) {
    console.error('Error syncing meetings:', error)
    return NextResponse.json(
      { error: 'Failed to sync meetings' },
      { status: 500 }
    )
  }
}

