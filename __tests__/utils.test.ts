import { extractZoomLink, extractTeamsLink, extractGoogleMeetLink, detectPlatform } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('extractZoomLink', () => {
    it('should extract Zoom link from text', () => {
      const text = 'Join Zoom meeting: https://zoom.us/j/123456789'
      expect(extractZoomLink(text)).toBe('https://zoom.us/j/123456789')
    })

    it('should return null if no Zoom link found', () => {
      const text = 'This is a regular meeting'
      expect(extractZoomLink(text)).toBeNull()
    })

    it('should handle null input', () => {
      expect(extractZoomLink(null)).toBeNull()
    })
  })

  describe('extractTeamsLink', () => {
    it('should extract Teams link from text', () => {
      const text = 'Join Teams: https://teams.microsoft.com/l/meetup-join/...'
      expect(extractTeamsLink(text)).toBeTruthy()
    })

    it('should return null if no Teams link found', () => {
      const text = 'This is a regular meeting'
      expect(extractTeamsLink(text)).toBeNull()
    })
  })

  describe('extractGoogleMeetLink', () => {
    it('should extract Google Meet link from text', () => {
      const text = 'Join: https://meet.google.com/abc-defg-hij'
      expect(extractGoogleMeetLink(text)).toBeTruthy()
    })

    it('should return null if no Google Meet link found', () => {
      const text = 'This is a regular meeting'
      expect(extractGoogleMeetLink(text)).toBeNull()
    })
  })

  describe('detectPlatform', () => {
    it('should detect Zoom platform', () => {
      const description = 'Meeting on Zoom: https://zoom.us/j/123'
      expect(detectPlatform(description, null)).toBe('zoom')
    })

    it('should detect Teams platform', () => {
      const description = 'Microsoft Teams meeting'
      expect(detectPlatform(description, null)).toBe('teams')
    })

    it('should detect Google Meet platform', () => {
      const description = 'Google Meet link'
      expect(detectPlatform(description, null)).toBe('google-meet')
    })

    it('should return null for unknown platform', () => {
      const description = 'Regular meeting'
      expect(detectPlatform(description, null)).toBeNull()
    })
  })
})

