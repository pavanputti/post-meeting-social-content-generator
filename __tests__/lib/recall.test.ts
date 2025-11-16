import { createRecallBot, getRecallBot, checkBotStatus } from '@/lib/recall'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Recall.ai Integration', () => {
  const mockApiKey = 'test-api-key'
  const mockBotId = 'bot-123'
  const mockMeetingUrl = 'https://zoom.us/j/123456789'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createRecallBot', () => {
    it('should create a recall bot successfully', async () => {
      const mockBot = {
        id: mockBotId,
        status: 'scheduled',
        meeting_url: mockMeetingUrl,
      }

      mockedAxios.post.mockResolvedValueOnce({ data: mockBot })

      const result = await createRecallBot(mockApiKey, mockMeetingUrl, 5)

      expect(result).toEqual(mockBot)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/bot/'),
        expect.objectContaining({
          meeting_url: mockMeetingUrl,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Token ${mockApiKey}`,
          }),
        })
      )
    })
  })

  describe('getRecallBot', () => {
    it('should fetch bot details', async () => {
      const mockBot = {
        id: mockBotId,
        status: 'joined',
        meeting_url: mockMeetingUrl,
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockBot })

      const result = await getRecallBot(mockApiKey, mockBotId)

      expect(result).toEqual(mockBot)
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/bot/${mockBotId}/`),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Token ${mockApiKey}`,
          }),
        })
      )
    })
  })

  describe('checkBotStatus', () => {
    it('should return bot status and media URLs', async () => {
      const mockBot = {
        id: mockBotId,
        status: 'completed',
        bot_media: {
          transcript: {
            status: 'completed',
            url: 'https://example.com/transcript.txt',
          },
          recording: {
            status: 'completed',
            url: 'https://example.com/recording.mp4',
          },
        },
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockBot })

      const result = await checkBotStatus(mockApiKey, mockBotId)

      expect(result).toEqual({
        status: 'completed',
        transcriptUrl: 'https://example.com/transcript.txt',
        recordingUrl: 'https://example.com/recording.mp4',
      })
    })

    it('should handle missing media gracefully', async () => {
      const mockBot = {
        id: mockBotId,
        status: 'scheduled',
        bot_media: null,
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockBot })

      const result = await checkBotStatus(mockApiKey, mockBotId)

      expect(result).toEqual({
        status: 'scheduled',
      })
    })
  })
})

