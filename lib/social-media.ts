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
      throw new Error('Facebook not connected. Please connect your Facebook account in Settings.')
    }

    // Use selected page if available, otherwise use user token
    let accessToken = settings.facebookAccessToken
    let pageId: string | null = null

    // Type assertion to access facebookSelectedPageId
    const settingsWithPage = settings as any
    if (settingsWithPage.facebookSelectedPageId) {
      const selectedPage = await (prisma as any).facebookPage.findFirst({
        where: {
          pageId: settingsWithPage.facebookSelectedPageId,
          userId: userId,
        },
      })
      if (selectedPage) {
        accessToken = selectedPage.accessToken
        pageId = selectedPage.pageId
        console.log(`Posting to Facebook page: ${selectedPage.pageName} (${pageId})`)
      }
    }

    // Verify token is valid and check permissions
    try {
      // If using page token, verify with page endpoint, otherwise use /me
      const verifyEndpoint = pageId 
        ? `https://graph.facebook.com/v18.0/${pageId}`
        : `https://graph.facebook.com/v18.0/me`
      
      const verifyResponse = await axios.get(
        verifyEndpoint,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name',
          },
        }
      )
      const targetName = pageId ? 'page' : 'user'
      console.log(`Facebook token verified for ${targetName}:`, verifyResponse.data.name)

      // Only check user permissions if using user token (not page token)
      if (!pageId) {
        // Try to check if token has user_posts permission (optional check)
        // If this fails, we'll still attempt to post and let Facebook's API give us the real error
        try {
          const permissionsResponse = await axios.get(
            `https://graph.facebook.com/v18.0/me/permissions`,
            {
              params: {
                access_token: accessToken,
              },
            }
          )
          const permissions = permissionsResponse.data.data || []
          const hasUserPosts = permissions.some((p: any) => p.permission === 'user_posts' && p.status === 'granted')
          
          if (hasUserPosts) {
            console.log('✅ Facebook token has user_posts permission')
          } else {
            console.warn('⚠️ Permission check: user_posts not found in permissions list, but will attempt to post anyway')
            console.log('Available permissions:', permissions.map((p: any) => `${p.permission}:${p.status}`).join(', '))
          }
        } catch (permError: any) {
          // If we can't check permissions (endpoint might not be accessible), that's okay
          // We'll still try to post and let Facebook's API tell us if there's a real issue
          console.log('Could not verify permissions via API, will attempt post anyway')
        }
      } else {
        console.log('✅ Using Facebook page token - skipping user permission check')
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        const fbError = error.response.data.error
        if (fbError.code === 190 || fbError.code === 102) {
          throw new Error('Facebook access token expired or invalid. Please reconnect your Facebook account in Settings.')
        }
        if (fbError.code === 200) {
          throw new Error(`Facebook API error: ${fbError.message || 'Permission denied. Please make sure you have granted "user_posts" permission.'}`)
        }
        throw new Error(`Facebook API error: ${fbError.message || 'Failed to verify token. Please reconnect your Facebook account.'}`)
      }
      throw new Error('Failed to verify Facebook token. Please reconnect your Facebook account in Settings.')
    }

    // Post to selected page or user feed
    try {
      const endpoint = pageId 
        ? `https://graph.facebook.com/v18.0/${pageId}/feed`
        : `https://graph.facebook.com/v18.0/me/feed`
      
      const postResponse = await axios.post(
        endpoint,
        {}, // Empty body
        {
          params: {
            access_token: accessToken,
            message: content,
          },
        }
      )

      if (postResponse.status === 200 && postResponse.data.id) {
        const target = pageId ? `Facebook page` : `Facebook user feed`
        console.log(`Successfully posted to ${target}: ${postResponse.data.id}`)
        return true
      }

      throw new Error('Facebook post was created but no post ID was returned.')
    } catch (error: any) {
      console.error('Error posting to Facebook feed:', error.response?.data || error.message)
      
      if (error.response?.data?.error) {
        const fbError = error.response.data.error
        const errorCode = fbError.code
        const errorMessage = fbError.message || 'Unknown error'
        
        // Handle specific error codes
        if (errorCode === 190 || errorCode === 102) {
          throw new Error('Facebook access token expired or invalid. Please reconnect your Facebook account in Settings.')
        }
        if (errorCode === 200) {
          // Error 200 with group/page message suggests Facebook has restricted user feed posting
          // Try to post to user's page instead as a fallback
          if (errorMessage.includes('group') || errorMessage.includes('page')) {
            console.log('User feed posting failed, trying to post to user\'s page instead...')
            
            try {
              // Get user's pages (requires pages_show_list permission)
              const pagesResponse = await axios.get(
                `https://graph.facebook.com/v18.0/me/accounts`,
                {
                  params: {
                    access_token: accessToken,
                    fields: 'id,name,access_token',
                  },
                }
              )

              if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
                const page = pagesResponse.data.data[0]
                console.log(`Posting to page: ${page.name} (${page.id})`)
                
                // Post to page (requires pages_manage_posts permission on the page access token)
                const pagePostResponse = await axios.post(
                  `https://graph.facebook.com/v18.0/${page.id}/feed`,
                  {},
                  {
                    params: {
                      access_token: page.access_token,
                      message: content,
                    },
                  }
                )

                if (pagePostResponse.status === 200 && pagePostResponse.data.id) {
                  console.log(`Successfully posted to Facebook page: ${pagePostResponse.data.id}`)
                  return true
                }
              } else {
                throw new Error('No Facebook Pages found. Please create a Facebook Page and try again.')
              }
            } catch (pageError: any) {
              console.error('Error posting to page:', pageError.response?.data || pageError.message)
              
              if (pageError.response?.data?.error) {
                const pageFbError = pageError.response.data.error
                if (pageFbError.code === 200 && pageFbError.message.includes('pages_manage_posts')) {
                  throw new Error(`Facebook posting failed: Your app needs page permissions.\n\nTo fix:\n1. Go to Settings in your app\n2. Click "Reconnect" next to Facebook\n3. When authorizing, make sure to grant access to your Facebook Page\n4. Grant "pages_manage_posts" and "pages_read_engagement" permissions\n5. Try posting again`)
                }
                if (pageFbError.message?.includes('No pages') || pageError.message?.includes('No Facebook Pages')) {
                  throw new Error(`Facebook posting failed: You don't have a Facebook Page.\n\nTo fix:\n1. Create a Facebook Page at https://www.facebook.com/pages/create\n2. Make sure you're an admin of the page\n3. Go to Settings in your app and reconnect Facebook\n4. Grant access to your page when authorizing\n5. Try posting again`)
                }
              }
              // Fall through to show the original error
            }
            
            // If we get here, both user feed and page posting failed
            throw new Error(`Facebook posting failed: ${errorMessage}\n\nFacebook appears to have restricted posting to user feeds via API. Your app may need:\n1. App Review approval for "user_posts" permission\n2. Or you can post to a Facebook Page instead\n\nTo fix:\n1. Go to Facebook Developer Portal (https://developers.facebook.com/apps/)\n2. Select your app "Post Meeting Content Generator"\n3. Go to "App Review" → "Permissions and Features"\n4. Submit "user_posts" for review\n5. Or create a Facebook Page and post to that instead`)
          }
          if (errorMessage.includes('user_posts') || errorMessage.includes('permission')) {
            throw new Error(`Facebook posting failed: ${errorMessage}\n\nTo fix this:\n1. Go to Facebook Graph API Explorer (https://developers.facebook.com/tools/explorer/)\n2. Select your app "Post Meeting Content Generator"\n3. Click "Generate Access Token"\n4. Make sure "user_posts" permission is checked\n5. Generate the token and update it in Settings`)
          }
          // Show the actual Facebook error for other cases
          throw new Error(`Facebook posting failed: ${errorMessage}\n\nError code: ${errorCode}. Please check your app configuration in Facebook Developer Portal.`)
        }
        if (errorCode === 10) {
          throw new Error('Facebook API permission denied. Please reconnect your Facebook account and grant all requested permissions.')
        }
        
        throw new Error(`Facebook posting failed: ${errorMessage} (Error code: ${errorCode})`)
      }
      
      throw new Error(`Failed to post to Facebook: ${error.message || 'Unknown error. Please try again.'}`)
    }
  } catch (error: any) {
    console.error('Error in postToFacebook:', error)
    // Re-throw with user-friendly message
    throw new Error(error.message || 'Failed to post to Facebook. Please check your connection and try again.')
  }
}

