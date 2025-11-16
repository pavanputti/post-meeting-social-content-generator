import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, platform, description, example } = body

    const automation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    const updated = await prisma.automation.update({
      where: { id: automation.id },
      data: {
        name: name || automation.name,
        type: type || automation.type,
        platform: platform || automation.platform,
        description: description || automation.description,
        example: example !== undefined ? example : automation.example,
      },
    })

    return NextResponse.json({ automation: updated })
  } catch (error) {
    console.error('Error updating automation:', error)
    return NextResponse.json(
      { error: 'Failed to update automation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const automation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    await prisma.automation.delete({
      where: { id: automation.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting automation:', error)
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    )
  }
}

