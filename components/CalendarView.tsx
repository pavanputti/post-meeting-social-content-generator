'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Clock, Users, Video, Settings, LogOut } from 'lucide-react'
import MeetingList from './MeetingList'
import UpcomingMeetingCard from './UpcomingMeetingCard'
import Link from 'next/link'
import { showSuccess, showError, showInfo } from './Toast'

export default function CalendarView() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [googleAccounts, setGoogleAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGoogleAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/google-accounts')
      const data = await response.json()
      setGoogleAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching Google accounts:', error)
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const now = new Date()
      const timeMin = showPast ? undefined : now.toISOString()
      const timeMax = showPast ? now.toISOString() : undefined

      const params = new URLSearchParams()
      if (timeMin) params.append('timeMin', timeMin)
      if (timeMax) params.append('timeMax', timeMax)

      const response = await fetch(`/api/calendar/events?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events')
      }
      const data = await response.json()
      
      // Sort events by start time
      const sortedEvents = (data.events || []).sort((a: any, b: any) => {
        const aTime = a.start?.dateTime || a.start?.date || ''
        const bTime = b.start?.dateTime || b.start?.date || ''
        return new Date(aTime).getTime() - new Date(bTime).getTime()
      })
      
      setEvents(sortedEvents)
    } catch (error) {
      console.error('Error fetching events:', error)
      setError('Failed to load calendar events. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [showPast])

  const fetchMeetings = useCallback(async () => {
    try {
      const response = await fetch('/api/meetings?past=false')
      const data = await response.json()
      setMeetings(data.meetings || [])
    } catch (error) {
      console.error('Error fetching meetings:', error)
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchGoogleAccounts()
      fetchEvents()
      if (!showPast) {
        fetchMeetings()
      }
    }
  }, [session, showPast, fetchEvents, fetchMeetings, fetchGoogleAccounts])

  const handleToggleNotetaker = async (event: any, enabled: boolean) => {
    // Find meeting for this event
    const meeting = meetings.find(
      (m) =>
        m.googleAccountId === event.googleAccountId &&
        new Date(m.startTime).getTime() === new Date(event.start.dateTime || event.start.date).getTime()
    )
    
    if (meeting) {
      const response = await fetch(`/api/meetings/${meeting.id}/notetaker`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      
      if (response.ok) {
        fetchMeetings()
      } else {
        throw new Error('Failed to update notetaker')
      }
    } else {
      // Meeting doesn't exist yet, need to sync first
      const syncResponse = await fetch('/api/meetings/sync', { method: 'POST' })
      if (syncResponse.ok) {
        await fetchMeetings()
        // Try again after sync
        const updatedMeetings = await fetch('/api/meetings?past=false').then(r => r.json())
        const newMeeting = updatedMeetings.meetings?.find(
          (m: any) =>
            m.googleAccountId === event.googleAccountId &&
            new Date(m.startTime).getTime() === new Date(event.start.dateTime || event.start.date).getTime()
        )
        if (newMeeting) {
          await handleToggleNotetaker(event, enabled)
        }
      } else {
        showInfo('Please sync your calendar first to enable notetaker for this meeting')
      }
    }
  }

  const handleSync = async () => {
    try {
      const response = await fetch('/api/meetings/sync', { method: 'POST' })
      const data = await response.json()
      if (data.error) {
        showError(`Error: ${data.error}`)
        console.error('Sync error:', data)
      } else if (data.meetings) {
        showSuccess(`Synced ${data.count} meetings`)
        fetchEvents()
        fetchMeetings()
      } else {
        showInfo('No meetings synced. Check if you have calendar events.')
      }
    } catch (error) {
      console.error('Error syncing meetings:', error)
      showError(`Failed to sync meetings: ${error}`)
    }
  }

  const handleCheckTranscripts = async () => {
    try {
      const response = await fetch('/api/recall/poll', { method: 'POST' })
      const data = await response.json()
      if (data.error) {
        showError(`Error: ${data.error}`)
      } else {
        const updatedCount = data.count || 0
        if (updatedCount > 0) {
          showSuccess(`Checked ${updatedCount} meeting(s). ${data.updated?.filter((u: any) => u.hasTranscript).length || 0} transcript(s) available.`)
          fetchMeetings()
        } else {
          showInfo('No meetings to check. All transcripts are up to date or no meetings with bots found.')
        }
      }
    } catch (error) {
      console.error('Error checking transcripts:', error)
      showError(`Failed to check transcripts: ${error}`)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Post-Meeting Content Generator</h1>
          <p className="text-gray-600 mt-1">Welcome, {session?.user?.name || session?.user?.email}</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleSync}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sync Calendar
          </button>
          <button
            onClick={handleCheckTranscripts}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Check for Transcripts
          </button>
          <Link
            href="/settings"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <Link
            href="/api/auth/signout"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Link>
        </div>
      </header>

      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setShowPast(false)}
          className={`px-4 py-2 rounded-lg ${
            !showPast
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setShowPast(true)}
          className={`px-4 py-2 rounded-lg ${
            showPast
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Past Meetings
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : showPast ? (
        <MeetingList showPast={true} />
      ) : (
        <div className="space-y-4">
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => fetchEvents()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : googleAccounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No Google accounts connected.</p>
              <p className="mb-4 text-sm">Connect a Google account in Settings to view your calendar events.</p>
              <Link
                href="/settings"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Settings
              </Link>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No upcoming events found.</p>
              <p className="mb-4 text-sm">Your calendar events will appear here. Make sure you have events scheduled in your Google Calendar.</p>
              <button
                onClick={handleSync}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sync Calendar
              </button>
            </div>
          ) : (
            events.map((event) => {
              const meeting = meetings.find(
                (m) =>
                  m.googleAccountId === event.googleAccountId &&
                  new Date(m.startTime).getTime() === new Date(event.start.dateTime || event.start.date).getTime()
              )
              return (
                <UpcomingMeetingCard
                  key={event.id}
                  event={event}
                  meeting={meeting}
                  onToggleNotetaker={(enabled) =>
                    handleToggleNotetaker(event, enabled)
                  }
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

