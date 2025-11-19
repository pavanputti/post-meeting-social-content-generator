import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * TEST ENDPOINT - Delete current user account for testing purposes
 * WARNING: This will delete the user and all associated data
 * Only use in development/testing environments
 */
export async function DELETE(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Delete user (cascades to all related data)
    await prisma.user.delete({
      where: { id: userId },
    })

    console.log(`Test user deleted: ${userEmail} (${userId})`)

    return NextResponse.json({
      success: true,
      message: `User account ${userEmail} has been deleted. You can now test the first sign-up flow.`,
      deletedUserId: userId,
      deletedEmail: userEmail,
    })
  } catch (error: any) {
    console.error('Error deleting test user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check if user exists and get user info
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'Not signed in. You can test the first sign-up flow.' 
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        googleAccounts: true,
        accounts: true,
      },
    })

    if (!user) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'User not found in database' 
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        googleAccountsCount: user.googleAccounts.length,
        accountsCount: user.accounts.length,
      },
      message: 'User exists. Use DELETE to remove account for testing.',
    })
  } catch (error: any) {
    console.error('Error checking user:', error)
    return NextResponse.json(
      { error: 'Failed to check user', details: error.message },
      { status: 500 }
    )
  }
}

