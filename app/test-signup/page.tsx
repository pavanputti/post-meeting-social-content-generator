'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TestSignUpPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)

  const checkUserStatus = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/test/delete-user')
      const data = await response.json()
      setUserInfo(data)
      setMessage(data.message || 'Status checked')
    } catch (error) {
      setMessage('Error checking user status')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTestUser = async () => {
    if (!confirm('Are you sure you want to delete your account? This will delete all your data and you can test the first sign-up flow.')) {
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/test/delete-user', {
        method: 'DELETE',
      })
      const data = await response.json()
      
      if (response.ok) {
        setMessage(data.message || 'Account deleted successfully')
        // Sign out and redirect to sign-in
        setTimeout(() => {
          window.location.href = '/api/auth/signout?callbackUrl=/api/auth/signin'
        }, 2000)
      } else {
        setMessage(data.error || 'Failed to delete account')
      }
    } catch (error) {
      setMessage('Error deleting account')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const testFirstSignUp = () => {
    // Sign out first, then redirect to sign-in
    window.location.href = '/api/auth/signout?callbackUrl=/api/auth/signin'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test First Sign-Up Flow</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="space-y-2 mb-4">
            <p><strong>Session Status:</strong> {status}</p>
            {session ? (
              <>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p><strong>Name:</strong> {session.user?.name || 'N/A'}</p>
              </>
            ) : (
              <p className="text-gray-600">Not signed in</p>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={checkUserStatus}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check User Status'}
            </button>
            
            {session && (
              <button
                onClick={deleteTestUser}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete My Account (For Testing)'}
              </button>
            )}
            
            {session && (
              <button
                onClick={testFirstSignUp}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Sign Out & Test First Sign-Up
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className={`bg-white rounded-lg shadow p-4 mb-6 ${
            message.includes('Error') || message.includes('Failed') 
              ? 'border-l-4 border-red-500' 
              : 'border-l-4 border-green-500'
          }`}>
            <p>{message}</p>
          </div>
        )}

        {userInfo && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(userInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-yellow-900">
            <li>If you&apos;re signed in, click &quot;Delete My Account&quot; to remove your test account</li>
            <li>You&apos;ll be automatically signed out and redirected to the sign-in page</li>
            <li>Click &quot;Sign in with Google&quot; to test the first sign-up flow</li>
            <li>You should see the Google consent screen with permission checkboxes</li>
            <li>Make sure to check the calendar permission checkbox</li>
            <li>After signing in, verify that calendar events are being fetched</li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-100 rounded">
            <p className="font-semibold text-yellow-800">⚠️ Important:</p>
            <p className="text-yellow-900 text-sm">
              This test endpoint only works in development mode. In production, 
              you&apos;ll need to manually delete test accounts from the database.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">What to Check During First Sign-Up</h2>
          <ul className="list-disc list-inside space-y-2 text-blue-900">
            <li>✅ Google consent screen appears (not skipped)</li>
            <li>✅ Calendar permission checkbox is visible</li>
            <li>✅ Calendar permission checkbox can be checked</li>
            <li>✅ After sign-in, calendar events are fetched successfully</li>
            <li>✅ Google account is saved in the database</li>
            <li>✅ Calendar access token is stored</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

