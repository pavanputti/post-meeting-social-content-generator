import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const past = searchParams.get('past') === 'true'

    const where: any = {
      userId: session.user.id,
    }

    if (past) {
      where.endTime = { lt: new Date() }
    } else {
      where.endTime = { gte: new Date() }
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        googleAccount: true,
      },
      orderBy: {
        startTime: past ? 'desc' : 'asc',
      },
    })

    return NextResponse.json({ meetings })
  } catch (error) {
    console.error('Error fetching meetings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    )
  }
}

