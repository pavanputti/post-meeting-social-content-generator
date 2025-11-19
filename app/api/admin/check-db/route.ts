import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if we can connect to the database
    await prisma.$connect()
    
    // Check if NextAuth tables exist
    const userCount = await prisma.user.count()
    const accountCount = await prisma.account.count()
    const sessionCount = await prisma.session.count()
    
    // Check if our custom tables exist
    const googleAccountCount = await prisma.googleAccount.count()
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        provider: 'postgresql',
      },
      tables: {
        User: { exists: true, count: userCount },
        Account: { exists: true, count: accountCount },
        Session: { exists: true, count: sessionCount },
        GoogleAccount: { exists: true, count: googleAccountCount },
      },
      message: 'Database connection successful. All tables exist.',
    })
  } catch (error: any) {
    console.error('Database check error:', error)
    
    // Check if it's a table doesn't exist error
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return NextResponse.json({
        success: false,
        error: 'Tables do not exist',
        message: 'Database tables need to be created. Run: npx prisma db push',
        details: error.message,
      }, { status: 500 })
    }
    
    // Check if it's a connection error
    if (error.message?.includes('connect') || error.code === 'ECONNREFUSED') {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        message: 'Cannot connect to database. Check DATABASE_URL environment variable.',
        details: error.message,
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown database error',
      message: error.message || 'Unknown error occurred',
      details: error,
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

