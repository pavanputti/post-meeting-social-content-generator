import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

function getAuthOptions(): NextAuthOptions {
  // Don't validate during build - use fallback values
  // Validation will happen at runtime when routes are actually called
  return {
    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET || 'temp-secret-for-build',
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || 'temp-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'temp-client-secret',
        authorization: {
          params: {
            scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
            access_type: 'offline',
            prompt: 'select_account consent', // Force account selection and showing permission checkboxes
            include_granted_scopes: 'true', // Include previously granted scopes
          },
        },
      }),
    ],
    callbacks: {
      async session({ session, user }) {
        if (session.user) {
          session.user.id = user.id
        }
        return session
      },
      async signIn({ user, account, profile }) {
        // Validate environment variables at runtime when signIn is called
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
          throw new Error('Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')
        }

        if (account?.provider === 'google' && account.access_token && user.email) {
          // Verify calendar permissions were granted
          const calendarScope = 'https://www.googleapis.com/auth/calendar.readonly'
          const grantedScopes = account.scope || ''
          const hasCalendarAccess = grantedScopes.includes(calendarScope)
          
          console.log('Sign-in callback - Account data:', {
            email: user.email,
            userId: user.id,
            hasAccessToken: !!account.access_token,
            hasRefreshToken: !!account.refresh_token,
            grantedScopes: grantedScopes,
            hasCalendarAccess,
          })
          
          if (!hasCalendarAccess) {
            console.warn('Warning: Calendar permissions not granted for user:', user.email, 'Granted scopes:', grantedScopes)
            console.warn('The account will still be saved, but calendar access may be limited.')
          } else {
            console.log('Calendar permissions confirmed for user:', user.email)
          }

          // Save or update Google account - ALWAYS save even if calendar permissions aren't explicitly shown
          // Google might grant permissions implicitly for unverified apps
          try {
            console.log('Saving Google account for user:', user.email, 'User ID:', user.id)
            
            const expiresAt = account.expires_at
              ? new Date(account.expires_at * 1000)
              : null

            // Use upsert to handle both create and update
            const savedAccount = await prisma.googleAccount.upsert({
              where: {
                userId_email: {
                  userId: user.id,
                  email: user.email,
                },
              },
              update: {
                accessToken: account.access_token,
                refreshToken: account.refresh_token || undefined,
                expiresAt,
              },
              create: {
                userId: user.id,
                email: user.email,
                accessToken: account.access_token,
                refreshToken: account.refresh_token || undefined,
                expiresAt,
              },
            })
            
            console.log('Successfully saved Google account:', {
              accountId: savedAccount.id,
              email: savedAccount.email,
              userId: savedAccount.userId,
            })
          } catch (error: any) {
            console.error('Error saving Google account:', error)
            console.error('Error details:', {
              message: error.message,
              code: error.code,
              meta: error.meta,
            })
            // Don't block sign-in if saving fails, but log it
            // The account might still work for basic auth
          }
        } else {
          console.error('Missing account data during sign-in:', {
            provider: account?.provider,
            hasAccessToken: !!account?.access_token,
            userEmail: user.email,
            userId: user.id,
          })
        }
        return true
      },
    },
    pages: {
      signIn: '/api/auth/signin',
    },
    debug: process.env.NODE_ENV === 'development',
  }
}

// Export authOptions for use in other files
// This will be called during build but won't fail due to fallback values
export const authOptions = getAuthOptions()

