import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractZoomLink(text: string | null | undefined): string | null {
  if (!text) return null
  
  // Match various Zoom URL formats:
  // - https://zoom.us/j/123456789
  // - https://us02web.zoom.us/j/123456789
  // - https://zoom.us/j/123456789?pwd=...
  // - zoom.us/j/123456789
  // Preserve the full URL including password parameters
  const zoomPattern = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)?zoom\.us\/(?:j\/|my\/|s\/)?([0-9]+)(?:\?[^\s"<>)]*)?/i
  const match = text.match(zoomPattern)
  if (match) {
    // Preserve the full matched URL including password parameters
    let fullUrl = match[0]
    
    // Ensure it starts with https://
    if (!fullUrl.startsWith('http')) {
      fullUrl = `https://${fullUrl}`
    }
    
    return fullUrl
  }
  return null
}

export function extractTeamsLink(text: string | null | undefined): string | null {
  if (!text) return null
  
  // Match various Teams URL formats:
  // - https://teams.microsoft.com/l/meetup-join/...
  // - https://teams.microsoft.com/l/meetup-join/19%3ameeting_...
  // - teams.microsoft.com/l/meetup-join/...
  const teamsPattern = /(?:https?:\/\/)?(?:teams\.microsoft\.com|.*\.teams\.microsoft\.com)\/l\/[^\s"<>)]+/i
  const match = text.match(teamsPattern)
  if (match) {
    // Ensure it starts with https://
    let url = match[0]
    if (!url.startsWith('http')) {
      url = `https://${url}`
    }
    return url
  }
  return null
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

/**
 * Extracts meeting password from text (for Zoom, Teams, etc.)
 * Looks for patterns like "Password: 1234", "Passcode: 5678", "PWD: ABC123", etc.
 */
export function extractMeetingPassword(text: string | null | undefined): string | null {
  if (!text) return null
  
  // Common password patterns
  const patterns = [
    /(?:password|passcode|pwd|code)[\s:]+([a-z0-9\-_]+)/i,
    /(?:password|passcode|pwd|code)[\s:]+([0-9]{4,})/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}

/**
 * Adds password to Zoom URL if not already present
 */
export function addPasswordToZoomUrl(url: string, password: string | null): string {
  if (!password) return url
  
  // Check if URL already has a password parameter
  if (url.includes('?pwd=') || url.includes('&pwd=')) {
    return url
  }
  
  // Add password parameter
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}pwd=${encodeURIComponent(password)}`
}

