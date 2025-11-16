import axios from 'axios'
import { prisma } from './prisma'

export async function postToLinkedIn(userId: string, content: string): Promise<boolean> {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    if (!settings?.linkedInAccessToken) {
      throw new Error('LinkedIn not connected. Please connect your LinkedIn account in Settings.')
    }

    // First, verify the token and get user profile
    // Use OpenID Connect userinfo endpoint to get person URN
    let personUrn: string
    try {
      // Try OpenID Connect userinfo endpoint first (works with openid profile scopes)
      const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${settings.linkedInAccessToken}`,
        },
      })
      
      // Extract person URN from sub claim (format: urn:li:person:xxxxx)
      if (profileResponse.data?.sub) {
        personUrn = profileResponse.data.sub
      } else {
        // Fallback to v2/me if userinfo doesn't work
        const meResponse = await axios.get('https://api.linkedin.com/v2/me', {
          headers: {
            Authorization: `Bearer ${settings.linkedInAccessToken}`,
          },
          params: {
            projection: '(id)',
          },
        })
        personUrn = meResponse.data.id
      }
      
      // Ensure it's in the correct format
      if (!personUrn.startsWith('urn:li:person:')) {
        personUrn = `urn:li:person:${personUrn}`
      }
      
      console.log('LinkedIn profile URN:', personUrn)
    } catch (error: any) {
      console.error('LinkedIn profile API error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      })
      
      if (error.response?.status === 401) {
        throw new Error('LinkedIn access token expired. Please reconnect your LinkedIn account in Settings.')
      }
      if (error.response?.status === 403) {
        const errorDetails = error.response?.data || {}
        const errorMessage = errorDetails.message || errorDetails.error_description || errorDetails.error || JSON.stringify(errorDetails)
        
        // Check if it's a scope issue
        if (errorMessage.includes('scope') || errorMessage.includes('permission') || errorMessage.includes('insufficient') || errorMessage.includes('r_liteprofile')) {
          throw new Error('LinkedIn API access denied (403). Your access token is missing required scopes.\n\nTo fix this:\n1. Go to Settings\n2. Click "Reconnect" next to LinkedIn\n3. When LinkedIn asks for permissions, make sure to check ALL boxes\n4. Click "Allow"\n5. Try posting again')
        }
        
        throw new Error(`LinkedIn API access denied (403): ${errorMessage || 'The access token may not have the required permissions. Please reconnect LinkedIn and grant all permissions.'}`)
      }
      throw new Error(`Failed to get LinkedIn profile: ${error.message}`)
    }

    // Post to LinkedIn using UGC Posts API
    try {
      // Ensure personUrn is in the correct format
      const authorUrn = personUrn.startsWith('urn:li:person:') 
        ? personUrn 
        : `urn:li:person:${personUrn}`

      const postResponse = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: content,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${settings.linkedInAccessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      if (postResponse.status === 201) {
        console.log('Successfully posted to LinkedIn:', postResponse.data)
        return true
      }
      return false
    } catch (error: any) {
      if (error.response?.status === 403) {
        const errorData = error.response.data || {}
        console.error('LinkedIn posting 403 error:', errorData)
        
        // Provide specific guidance based on error
        if (errorData.message?.includes('scope') || errorData.message?.includes('permission')) {
          throw new Error('LinkedIn posting failed: Your access token does not have the "w_member_social" permission. Please:\n1. Go to Settings\n2. Click "Reconnect" next to LinkedIn\n3. When authorizing, make sure to check ALL permission boxes\n4. Try posting again')
        }
        throw new Error(`LinkedIn posting failed (403): ${errorData.message || 'Access denied. Please reconnect LinkedIn and grant all permissions.'}`)
      }
      
      if (error.response?.data) {
        console.error('LinkedIn API error:', error.response.data)
        const errorMsg = error.response.data.message || JSON.stringify(error.response.data)
        throw new Error(`LinkedIn API error: ${errorMsg}`)
      }
      throw error
    }
  } catch (error: any) {
    console.error('Error posting to LinkedIn:', error)
    // Re-throw with a user-friendly message
    throw new Error(error.message || 'Failed to post to LinkedIn. Please check your connection.')
  }
}

export async function postToFacebook(userId: string, content: string): Promise<boolean> {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    if (!settings?.facebookAccessToken) {
      throw new Error('Facebook not connected')
    }

    // First, try to get user's pages
    let pageId: string | null = null
    let pageAccessToken: string | null = null

    try {
      const pagesResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts`,
        {
          params: {
            access_token: settings.facebookAccessToken,
            fields: 'id,name,access_token',
          },
        }
      )

      // If user has pages, use the first one
      if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
        pageId = pagesResponse.data.data[0].id
        pageAccessToken = pagesResponse.data.data[0].access_token
      }
    } catch (error: any) {
      console.log('Could not fetch pages, will try user feed:', error.message)
    }

    // Post to page if available, otherwise post to user feed
    const targetId = pageId || 'me'
    const targetType = pageId ? 'feed' : 'feed'
    const accessToken = pageAccessToken || settings.facebookAccessToken

    const postResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${targetId}/${targetType}`,
      {
        message: content,
      },
      {
        params: {
          access_token: accessToken,
        },
      }
    )

    if (postResponse.status === 200 && postResponse.data.id) {
      console.log(`Successfully posted to Facebook: ${postResponse.data.id}`)
      return true
    }

    return false
  } catch (error: any) {
    console.error('Error posting to Facebook:', error.response?.data || error.message)
    
    // If token expired or invalid, provide helpful error
    if (error.response?.data?.error) {
      const fbError = error.response.data.error
      if (fbError.code === 190 || fbError.code === 102) {
        console.error('Facebook access token expired or invalid. User needs to reconnect.')
      }
    }
    
    return false
  }
}

