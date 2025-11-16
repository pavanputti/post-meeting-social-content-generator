'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, Users, Video } from 'lucide-react'
import MeetingDetail from './MeetingDetail'

interface Meeting {
  id: string
  title: string
  startTime: string
  endTime: string
  attendees: string | string[] // Can be JSON string or array
  platform: string | null
  recallBotStatus: string | null
  notetakerEnabled: boolean
}

export default function MeetingList({ showPast }: { showPast: boolean }) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/meetings?past=${showPast}`)
      const data = await response.json()
      setMeetings(data.meetings || [])
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setLoading(false)
    }
  }, [showPast])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  const getPlatformIcon = (platform: string | null) => {
    switch (platform) {
      case 'zoom':
        return '🔷'
      case 'teams':
        return '🔵'
      case 'google-meet':
        return '🟢'
      default:
        return '📹'
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading meetings...</div>
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No {showPast ? 'past' : 'upcoming'} meetings found. Sync your calendar to get started.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            onClick={() => setSelectedMeeting(meeting.id)}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">{meeting.title}</h3>
                  {meeting.platform && (
                    <span className="text-2xl" title={meeting.platform}>
                      {getPlatformIcon(meeting.platform)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-gray-600 mt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(meeting.startTime), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(meeting.startTime), 'h:mm a')} -{' '}
                      {format(new Date(meeting.endTime), 'h:mm a')}
                    </span>
                  </div>
                  {(() => {
                    const attendees = typeof meeting.attendees === 'string' 
                      ? JSON.parse(meeting.attendees || '[]') 
                      : meeting.attendees || []
                    return attendees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{attendees.length} attendee{attendees.length !== 1 ? 's' : ''}</span>
                      </div>
                    )
                  })()}
                  {meeting.notetakerEnabled && (
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      <span className={meeting.recallBotStatus === 'done' ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                        Notetaker: {meeting.recallBotStatus || 'Pending'}
                      </span>
                    </div>
                  )}
                  {showPast && (meeting as any).transcript && (
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-semibold">✓ Transcript Available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedMeeting && (
        <MeetingDetail
          meetingId={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onUpdate={fetchMeetings}
        />
      )}
    </>
  )
}

