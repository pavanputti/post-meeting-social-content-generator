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

    const automations = await prisma.automation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ automations })
  } catch (error) {
    console.error('Error fetching automations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, platform, description, example } = body

    if (!name || !type || !platform || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const automation = await prisma.automation.create({
      data: {
        userId: session.user.id,
        name,
        type,
        platform,
        description,
        example: example || null,
      },
    })

    return NextResponse.json({ automation })
  } catch (error) {
    console.error('Error creating automation:', error)
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    )
  }
}

