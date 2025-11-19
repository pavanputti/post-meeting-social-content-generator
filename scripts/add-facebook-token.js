/**
 * Script to manually add Facebook access token to user settings
 * 
 * Usage:
 * 1. Get your user ID from the database or from the session
 * 2. Run: node scripts/add-facebook-token.js <userId> <accessToken>
 * 
 * Or set environment variables:
 * USER_ID=your-user-id FACEBOOK_TOKEN=your-token node scripts/add-facebook-token.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addFacebookToken() {
  const userId = process.env.USER_ID || process.argv[2]
  const token = process.env.FACEBOOK_TOKEN || process.argv[3]

  if (!userId || !token) {
    console.error('Usage: node scripts/add-facebook-token.js <userId> <accessToken>')
    console.error('Or set: USER_ID=... FACEBOOK_TOKEN=... node scripts/add-facebook-token.js')
    process.exit(1)
  }

  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    if (settings) {
      settings = await prisma.userSettings.update({
        where: { id: settings.id },
        data: {
          facebookAccessToken: token,
        },
      })
      console.log('✅ Facebook token updated successfully!')
    } else {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          facebookAccessToken: token,
          botJoinMinutesBefore: 5,
        },
      })
      console.log('✅ Facebook token added successfully!')
    }

    console.log('Settings:', {
      userId: settings.userId,
      hasFacebookToken: !!settings.facebookAccessToken,
    })
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addFacebookToken()

