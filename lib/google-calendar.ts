import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export function getGoogleCalendarClient(accessToken: string) {
  const oauth2Client = new OAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function getCalendarEvents(
  accessToken: string,
  timeMin?: Date,
  timeMax?: Date
) {
  const calendar = getGoogleCalendarClient(accessToken)
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin?.toISOString(),
    timeMax: timeMax?.toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime',
    // Request conference data to get Meet links
    conferenceDataVersion: 1,
  })
  
  return response.data.items || []
}

