import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import { getCalendarEvents } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    // Get all connected Google accounts for this user
    const googleAccounts = await prisma.googleAccount.findMany({
      where: { userId: session.user.id },
    })

    const allEvents: any[] = []

    for (const account of googleAccounts) {
      try {
        const events = await getCalendarEvents(
          account.accessToken,
          timeMin ? new Date(timeMin) : undefined,
          timeMax ? new Date(timeMax) : undefined
        )
        
        // Map events and add account info
        const mappedEvents = events.map((event: any) => ({
          ...event,
          googleAccountId: account.id,
          googleAccountEmail: account.email,
        }))
        
        allEvents.push(...mappedEvents)
      } catch (error) {
        console.error(`Error fetching events for account ${account.email}:`, error)
      }
    }

    return NextResponse.json({ events: allEvents })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}

