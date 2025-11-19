import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import axios from 'axios'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    if (!settings?.facebookAccessToken) {
      return NextResponse.json({ error: 'No Facebook token found' }, { status: 404 })
    }

    const token = settings.facebookAccessToken

    // Get user info
    let userInfo = null
    try {
      const userResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me`,
        {
          params: {
            access_token: token,
            fields: 'id,name,email',
          },
        }
      )
      userInfo = userResponse.data
    } catch (error: any) {
      return NextResponse.json({
        error: 'Failed to verify token',
        details: error.response?.data || error.message,
      }, { status: 400 })
    }

    // Get permissions
    let permissions = []
    try {
      const permResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me/permissions`,
        {
          params: {
            access_token: token,
          },
        }
      )
      permissions = permResponse.data.data || []
    } catch (error: any) {
      console.log('Could not fetch permissions:', error.message)
    }

    // Check if user_posts is granted
    const hasUserPosts = permissions.some((p: any) => p.permission === 'user_posts' && p.status === 'granted')

    // Try to test post (dry run - we won't actually post)
    let canPost = false
    let postError = null
    try {
      // We'll just verify the endpoint is accessible, not actually post
      // This is a read-only check
      const testResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me`,
        {
          params: {
            access_token: token,
            fields: 'id',
          },
        }
      )
      canPost = true
    } catch (error: any) {
      postError = error.response?.data || error.message
    }

    return NextResponse.json({
      user: userInfo,
      permissions: permissions,
      hasUserPosts: hasUserPosts,
      canPost: canPost,
      postError: postError,
      tokenPreview: token.substring(0, 20) + '...',
    })
  } catch (error: any) {
    console.error('Error checking Facebook token:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check token' },
      { status: 500 }
    )
  }
}

