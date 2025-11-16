'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { X, Copy, Send, Loader2, ChevronDown, ChevronUp, Mail, FileText } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Meeting {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  attendees: string | string[]
  platform: string | null
  transcript: string | null
  generatedPost: string | null
  followUpEmail: string | null
  postedToLinkedIn: boolean
  postedToFacebook: boolean
}

interface Automation {
  id: string
  name: string
  platform: string
  description: string
  example: string | null
}

export default function MeetingDetail({
  meetingId,
  onClose,
  onUpdate,
}: {
  meetingId: string
  onClose: () => void
  onUpdate: () => void
}) {
  const { data: session } = useSession()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [posting, setPosting] = useState(false)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [selectedAutomation, setSelectedAutomation] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  const fetchMeeting = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/meetings/${meetingId}`)
      const data = await response.json()
      setMeeting(data.meeting)
    } catch (error) {
      console.error('Error fetching meeting:', error)
    } finally {
      setLoading(false)
    }
  }, [meetingId])

  const fetchAutomations = useCallback(async () => {
    try {
      const response = await fetch('/api/automations')
      const data = await response.json()
      setAutomations(data.automations || [])
    } catch (error) {
      console.error('Error fetching automations:', error)
    }
  }, [])

  useEffect(() => {
    fetchMeeting()
    fetchAutomations()
  }, [fetchMeeting, fetchAutomations])

  const handleGenerate = async () => {
    if (!meeting?.transcript) {
      alert('No transcript available for this meeting')
      return
    }

    try {
      setGenerating(true)
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          automationId: selectedAutomation || undefined,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        alert(data.error || 'Failed to generate post')
        return
      }
      
      if (data.post) {
        setMeeting({ ...meeting, generatedPost: data.post })
      } else {
        alert('No post was generated. Please try again.')
      }
    } catch (error) {
      console.error('Error generating post:', error)
      alert('Failed to generate post. Please check your connection and try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateEmail = async () => {
    if (!meeting?.transcript) {
      alert('No transcript available for this meeting')
      return
    }

    try {
      setGeneratingEmail(true)
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-email',
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        alert(data.error || 'Failed to generate follow-up email')
        return
      }
      
      if (data.email) {
        setMeeting({ ...meeting, followUpEmail: data.email })
        setShowEmail(true)
      } else {
        alert('No email was generated. Please try again.')
      }
    } catch (error) {
      console.error('Error generating email:', error)
      alert('Failed to generate follow-up email. Please check your connection and try again.')
    } finally {
      setGeneratingEmail(false)
    }
  }

  const handleCopy = async () => {
    if (!meeting?.generatedPost) return

    try {
      await navigator.clipboard.writeText(meeting.generatedPost)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying:', error)
    }
  }

  const handleCopyEmail = async () => {
    if (!meeting?.followUpEmail) return

    try {
      await navigator.clipboard.writeText(meeting.followUpEmail)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch (error) {
      console.error('Error copying email:', error)
    }
  }

  const handlePost = async (platform: 'linkedin' | 'facebook', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!meeting?.generatedPost) {
      alert('Please generate a post first')
      return
    }

    if (posting) {
      return
    }

    try {
      setPosting(true)
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          platform,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to post to ${platform}`)
      }

      if (data.success) {
        await fetchMeeting()
        onUpdate()
        alert(`Posted to ${platform}!`)
      } else {
        throw new Error(data.error || `Failed to post to ${platform}`)
      }
    } catch (error: any) {
      console.error('Error posting:', error)
      const errorMessage = error.message || `Failed to post to ${platform}. Please check if your ${platform} account is connected in Settings.`
      
      if (errorMessage.includes('not connected') || errorMessage.includes('expired') || errorMessage.includes('reconnect')) {
        const goToSettings = confirm(`${errorMessage}\n\nWould you like to go to Settings to reconnect?`)
        if (goToSettings) {
          window.location.href = '/settings'
        }
      } else {
        alert(errorMessage)
      }
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (!meeting) {
    return null
  }

  const linkedInAutomations = automations.filter((a) => a.platform === 'linkedin')
  const facebookAutomations = automations.filter((a) => a.platform === 'facebook')
  
  // Get list of posts created by automations (posts that were posted)
  const postedPlatforms = []
  if (meeting.postedToLinkedIn) postedPlatforms.push({ platform: 'LinkedIn', automation: linkedInAutomations.find(a => a.id === selectedAutomation)?.name || 'Default' })
  if (meeting.postedToFacebook) postedPlatforms.push({ platform: 'Facebook', automation: facebookAutomations.find(a => a.id === selectedAutomation)?.name || 'Default' })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold">Meeting Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Meeting Info */}
          <div>
            <h3 className="text-xl font-semibold mb-2">{meeting.title}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                {format(new Date(meeting.startTime), 'MMM d, yyyy')} •{' '}
                {format(new Date(meeting.startTime), 'h:mm a')} -{' '}
                {format(new Date(meeting.endTime), 'h:mm a')}
              </p>
              {(() => {
                const attendees = typeof meeting.attendees === 'string' 
                  ? JSON.parse(meeting.attendees || '[]') 
                  : meeting.attendees || []
                return attendees.length > 0 && (
                  <p>{attendees.length} attendee{attendees.length !== 1 ? 's' : ''}</p>
                )
              })()}
            </div>
          </div>

          {/* Transcript Section */}
          {meeting.transcript && (
            <div className="border rounded-lg">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-semibold">Full Transcript</span>
                </div>
                {showTranscript ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              {showTranscript && (
                <div className="p-4 border-t bg-gray-50 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">
                    {typeof meeting.transcript === 'string' 
                      ? meeting.transcript 
                      : JSON.stringify(meeting.transcript, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Follow-up Email Section */}
          <div className="border rounded-lg">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <span className="font-semibold">Follow-up Email</span>
              </div>
              <button
                onClick={handleGenerateEmail}
                disabled={generatingEmail || !meeting.transcript}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {generatingEmail ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  meeting.followUpEmail ? 'Regenerate Email' : 'Generate Email'
                )}
              </button>
            </div>
            {(() => {
              // Only show email if it exists and is different from transcript
              // Also check if it looks like a transcript (contains speaker names or [object Object])
              const isValidEmail = meeting.followUpEmail && 
                meeting.followUpEmail !== meeting.transcript &&
                !meeting.followUpEmail.includes('[object Object]:') &&
                !meeting.followUpEmail.match(/^[^:]+:\s*[A-Z]/) // Doesn't start with "Speaker: Text"
              
              return isValidEmail ? (
                <div className="p-4 border-t bg-gray-50">
                  <div className="bg-white border rounded p-4 max-h-96 overflow-y-auto mb-3">
                    <pre className="whitespace-pre-wrap text-sm">{meeting.followUpEmail}</pre>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyEmail}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      {copiedEmail ? 'Copied!' : 'Copy Email'}
                    </button>
                  </div>
                </div>
              ) : null
            })()}
          </div>

          {/* Social Media Posts Created by Automations */}
          {postedPlatforms.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Posts Created by Automations</h4>
              <div className="space-y-2">
                {postedPlatforms.map((post, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{post.platform}</span>
                      <span className="text-gray-600 ml-2">via {post.automation}</span>
                    </div>
                    <span className="text-green-600 text-sm">✓ Posted</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft Post Modal Section */}
          <div className="border rounded-lg p-6 bg-gray-50">
            <h3 className="text-xl font-bold mb-2">Draft post</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Generate a post based on insights from this meeting.
            </p>

            {!meeting.transcript && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 mb-2">
                  No transcript available yet. The notetaker may still be processing this meeting.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/recall/poll', { method: 'POST' })
                      const data = await response.json()
                      if (data.updated?.some((u: any) => u.id === meeting.id && u.hasTranscript)) {
                        await fetchMeeting()
                        alert('Transcript is now available!')
                      } else {
                        alert('Transcript not ready yet. Please try again in a few minutes.')
                      }
                    } catch (error) {
                      alert('Error checking for transcript')
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Check for transcript now
                </button>
              </div>
            )}

            {meeting.transcript && !meeting.generatedPost && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Select Automation (optional)
                </label>
                <select
                  value={selectedAutomation}
                  onChange={(e) => setSelectedAutomation(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mb-4"
                >
                  <option value="">Default (LinkedIn post)</option>
                  {linkedInAutomations.map((auto) => (
                    <option key={auto.id} value={auto.id}>
                      {auto.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    'Generate Post'
                  )}
                </button>
              </div>
            )}

            {meeting.generatedPost && (
              <>
                <div className="mb-6">
                  <div className="border rounded-lg p-4 bg-white min-h-[200px]">
                    <p className="whitespace-pre-wrap">{meeting.generatedPost}</p>
                  </div>
                  <p className="text-xs text-gray-500 italic mt-2">
                    The views expressed are for informational purposes only and do not constitute
                    financial advice. Past performance is no guarantee of future results.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {!meeting.postedToLinkedIn && (
                    <button
                      onClick={(e) => handlePost('linkedin', e)}
                      disabled={posting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      type="button"
                    >
                      {posting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Post to LinkedIn
                    </button>
                  )}
                  {!meeting.postedToFacebook && (
                    <button
                      onClick={(e) => handlePost('facebook', e)}
                      disabled={posting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      type="button"
                    >
                      {posting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Post to Facebook
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
