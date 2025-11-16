import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractZoomLink(text: string | null | undefined): string | null {
  if (!text) return null
  
  const zoomPattern = /https?:\/\/(?:[a-z0-9-]+\.)?zoom\.us\/(?:j\/)?(\d+)/i
  const match = text.match(zoomPattern)
  return match ? match[0] : null
}

export function extractTeamsLink(text: string | null | undefined): string | null {
  if (!text) return null
  
  const teamsPattern = /https?:\/\/(?:teams\.microsoft\.com|.*\.teams\.microsoft\.com).*/i
  const match = text.match(teamsPattern)
  return match ? match[0] : null
}

export function extractGoogleMeetLink(text: string | null | undefined): string | null {
  if (!text) return null
  
  const meetPattern = /https?:\/\/(?:meet\.google\.com|.*\.meet\.google\.com).*/i
  const match = text.match(meetPattern)
  return match ? match[0] : null
}

export function detectPlatform(description: string | null | undefined, location: string | null | undefined): string | null {
  const text = `${description || ''} ${location || ''}`.toLowerCase()
  
  if (text.includes('zoom.us') || text.includes('zoom')) return 'zoom'
  if (text.includes('teams.microsoft.com') || text.includes('teams')) return 'teams'
  if (text.includes('meet.google.com') || text.includes('google meet')) return 'google-meet'
  
  return null
}

