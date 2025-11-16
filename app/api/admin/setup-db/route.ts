import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// This endpoint pushes the database schema
// Call it once after deployment: GET /api/admin/setup-db
export async function GET(request: NextRequest) {
  // Optional: Add authentication check here
  // const session = await getServerSession(authOptions)
  // if (!session) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // }

  try {
    const prisma = new PrismaClient()
    
    // Test connection
    await prisma.$connect()
    await prisma.$disconnect()
    
    // Note: prisma db push needs to be run via CLI
    // This endpoint just verifies the connection
    return NextResponse.json({ 
      success: true,
      message: 'Database connection successful. Run "npx prisma db push" to sync schema.',
      note: 'You can run this via Vercel CLI: vercel env pull && npx prisma db push'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message,
      note: 'Make sure DATABASE_URL is set in Vercel environment variables'
    }, { status: 500 })
  }
}

