import { render, screen, waitFor } from '@testing-library/react'
import MeetingList from '@/components/MeetingList'

// Mock fetch
global.fetch = jest.fn()

describe('MeetingList', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear()
  })

  it('should display loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    )

    render(<MeetingList showPast={false} />)
    expect(screen.getByText('Loading meetings...')).toBeInTheDocument()
  })

  it('should display meetings when loaded', async () => {
    const mockMeetings = [
      {
        id: '1',
        title: 'Test Meeting',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        attendees: ['user@example.com'],
        platform: 'zoom',
        recallBotStatus: 'scheduled',
        notetakerEnabled: true,
      },
    ]

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ meetings: mockMeetings }),
    })

    render(<MeetingList showPast={false} />)

    await waitFor(() => {
      expect(screen.getByText('Test Meeting')).toBeInTheDocument()
    })
  })

  it('should display empty state when no meetings', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ meetings: [] }),
    })

    render(<MeetingList showPast={false} />)

    await waitFor(() => {
      expect(screen.getByText(/No upcoming meetings found/)).toBeInTheDocument()
    })
  })
})

