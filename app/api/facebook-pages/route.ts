import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      include: {
        facebookPages: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!settings) {
      return NextResponse.json({ pages: [], selectedPageId: null })
    }

    return NextResponse.json({
      pages: settings.facebookPages.map((page) => ({
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        category: page.category,
        createdAt: page.createdAt.toISOString(),
      })),
      selectedPageId: settings.facebookSelectedPageId,
    })
  } catch (error) {
    console.error('Error fetching Facebook pages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Facebook pages' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { selectedPageId } = body

    // Verify the page belongs to the user
    if (selectedPageId) {
      const page = await prisma.facebookPage.findFirst({
        where: {
          pageId: selectedPageId,
          userId: session.user.id,
        },
      })

      if (!page) {
        return NextResponse.json(
          { error: 'Page not found or unauthorized' },
          { status: 404 }
        )
      }
    }

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        facebookSelectedPageId: selectedPageId || null,
      },
      create: {
        userId: session.user.id,
        facebookSelectedPageId: selectedPageId || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating Facebook page selection:', error)
    return NextResponse.json(
      { error: 'Failed to update Facebook page selection' },
      { status: 500 }
    )
  }
}

