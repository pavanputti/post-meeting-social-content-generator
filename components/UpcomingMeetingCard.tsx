'use client'

import { format } from 'date-fns'
import { Calendar, Clock, Users, Video, ToggleLeft, ToggleRight } from 'lucide-react'
import { useState } from 'react'

interface UpcomingMeetingCardProps {
  event: any
  meeting?: {
    id: string
    notetakerEnabled: boolean
    recallBotId: string | null
    recallBotStatus: string | null
  } | null
  onToggleNotetaker: (enabled: boolean) => Promise<void>
}

export default function UpcomingMeetingCard({
  event,
  meeting,
  onToggleNotetaker,
}: UpcomingMeetingCardProps) {
  const [toggling, setToggling] = useState(false)
  const [notetakerEnabled, setNotetakerEnabled] = useState(meeting?.notetakerEnabled ?? false)

  const handleToggle = async () => {
    setToggling(true)
    try {
      await onToggleNotetaker(!notetakerEnabled)
      setNotetakerEnabled(!notetakerEnabled)
    } catch (error) {
      console.error('Error toggling notetaker:', error)
    } finally {
      setToggling(false)
    }
  }

  const getPlatformIcon = (platform: string | null) => {
    switch (platform) {
      case 'zoom':
        return '🔷'
      case 'teams':
        return '🔵'
      case 'google-meet':
        return '🟢'
      default:
        return null
    }
  }

  // Check for meeting links in multiple places
  const hangoutLink = event.hangoutLink || ''
  const conferenceData = event.conferenceData
  const meetLinkFromConference = conferenceData?.entryPoints?.find((ep: any) => 
    ep.entryPointType === 'video' && ep.uri
  )?.uri || ''
  
  const location = event.location || ''
  const description = event.description || ''
  const allText = `${location} ${description} ${hangoutLink} ${meetLinkFromConference}`.toLowerCase()
  
  const platform = allText.includes('zoom') ? 'zoom' :
                   allText.includes('teams') ? 'teams' :
                   (allText.includes('meet') || hangoutLink || meetLinkFromConference) ? 'google-meet' : null

  const hasMeetingLink = event.hangoutLink ||
                         meetLinkFromConference ||
                         event.description?.includes('zoom.us') ||
                         event.description?.includes('teams.microsoft.com') ||
                         event.description?.includes('meet.google.com') ||
                         event.location?.includes('zoom.us') ||
                         event.location?.includes('teams.microsoft.com') ||
                         event.location?.includes('meet.google.com')

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold">{event.summary || 'Untitled Meeting'}</h3>
            {platform && (
              <span className="text-2xl" title={platform}>
                {getPlatformIcon(platform)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-gray-600 mt-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(event.start.dateTime), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {format(new Date(event.start.dateTime), 'h:mm a')} -{' '}
                {format(new Date(event.end?.dateTime || event.start.dateTime), 'h:mm a')}
              </span>
            </div>
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasMeetingLink ? (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Notetaker</label>
              <button
                onClick={handleToggle}
                disabled={toggling}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                style={{
                  backgroundColor: notetakerEnabled ? '#10b981' : '#d1d5db',
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notetakerEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ) : (
            <span className="text-sm text-gray-500">No meeting link</span>
          )}
        </div>
      </div>
    </div>
  )
}

