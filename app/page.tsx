import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"'
import CalendarView from '@/components/CalendarView'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/api/auth/signin')
  }

  return (
    <main className="min-h-screen p-8">
      <CalendarView />
    </main>
  )
}

