import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import SettingsClient from '@/components/SettingsClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/api/auth/signin')
  }

  return <SettingsClient />
}

