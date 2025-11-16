import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

function getAuthOptions(): NextAuthOptions {
  // Validate environment variables at runtime, not build time
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not set')
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET is not set')
  }

  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is not set')
  }

  if (!process.env.NEXTAUTH_URL) {
    throw new Error('NEXTAUTH_URL is not set')
  }

  return {
    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
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
        if (account?.provider === 'google' && account.access_token && user.email) {
          // Save or update Google account
          try {
            console.log('Saving Google account for user:', user.email, 'User ID:', user.id)
            
            const expiresAt = account.expires_at
              ? new Date(account.expires_at * 1000)
              : null

            // Use upsert to handle both create and update
            await prisma.googleAccount.upsert({
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
            
            console.log('Successfully saved Google account')
          } catch (error) {
            console.error('Error saving Google account:', error)
            // Don't block sign-in if saving fails, but log it
          }
        } else {
          console.log('Missing account data:', {
            provider: account?.provider,
            hasAccessToken: !!account?.access_token,
            userEmail: user.email,
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

const handler = NextAuth(getAuthOptions())

export { handler as GET, handler as POST }

