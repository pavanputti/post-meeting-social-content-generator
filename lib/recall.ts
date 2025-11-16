import axios from 'axios'

// Get region from env or default to us-west-2
const RECALL_REGION = process.env.RECALL_REGION || 'us-west-2'
const RECALL_API_BASE = `https://${RECALL_REGION}.recall.ai/api/v1`

export interface RecallBot {
  id: string
  status: string
  meeting_url: string
  recording?: string
  recordings?: Array<{
    id: string
    media_shortcuts?: {
      transcript?: {
        data?: {
          download_url?: string
        }
      }
      video_mixed?: {
        data?: {
          download_url?: string
        }
      }
    }
  }>
}

export async function createRecallBot(
  apiKey: string,
  meetingUrl: string,
  joinBeforeMinutes: number = 5
): Promise<RecallBot> {
  const startTime = new Date()
  startTime.setMinutes(startTime.getMinutes() - joinBeforeMinutes)
  
  const response = await axios.post(
    `${RECALL_API_BASE}/bot`,
    {
      meeting_url: meetingUrl,
      bot_name: 'Post-Meeting Content Generator Bot',
      join_at: startTime.toISOString(),
      recording_config: {
        transcript: {
          provider: {
            meeting_captions: {}
          }
        }
      }
    },
    {
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  )
  
  return response.data
}

export async function getRecallBot(apiKey: string, botId: string): Promise<RecallBot> {
  const response = await axios.get(`${RECALL_API_BASE}/bot/${botId}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  })
  
  return response.data
}

export async function checkBotStatus(apiKey: string, botId: string): Promise<{
  status: string
  transcriptUrl?: string
  recordingUrl?: string
}> {
  const bot = await getRecallBot(apiKey, botId)
  
  // Extract transcript URL from the recordings array structure
  let transcriptUrl: string | undefined
  let recordingUrl: string | undefined
  
  if (bot.recordings && bot.recordings.length > 0) {
    const recording = bot.recordings[0]
    transcriptUrl = recording.media_shortcuts?.transcript?.data?.download_url
    recordingUrl = recording.media_shortcuts?.video_mixed?.data?.download_url
  }
  
  return {
    status: bot.status,
    transcriptUrl,
    recordingUrl,
  }
}

