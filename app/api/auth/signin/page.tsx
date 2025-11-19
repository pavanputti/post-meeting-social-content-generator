'use client'

import { signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { AlertCircle, Calendar, CheckCircle2 } from 'lucide-react'

export default function SignIn() {
  const [loading, setLoading] = useState(true)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    setLoading(false)
  }, [])

  const handleSignIn = () => {
    setShowInstructions(true)
    // Small delay to show instructions, then proceed
    setTimeout(() => {
      signIn('google', { callbackUrl: '/' })
    }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (showInstructions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Important: Grant Calendar Access</h1>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800 mb-2">
                  You must check the calendar permission checkbox on the next screen!
                </p>
                <p className="text-yellow-700 text-sm">
                  On the Google consent screen, you&apos;ll see a checkbox for calendar access. 
                  <strong className="font-semibold"> Please make sure to check it</strong> so the app can access your calendar events.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h2 className="text-xl font-semibold">What to do:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>You&apos;ll be redirected to Google&apos;s consent screen</li>
              <li>Look for the checkbox: <strong>&quot;See and download any calendar you can access using your Google Calendar&quot;</strong></li>
              <li><strong className="text-blue-600">Check the checkbox</strong> to grant calendar access</li>
              <li>Click &quot;Continue&quot; to complete sign-in</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> You may see an &quot;unverified app&quot; warning. This is normal for development apps. 
                  You can safely proceed if you trust this application.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowInstructions(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              Back
            </button>
            <button
              onClick={handleSignIn}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue to Google Sign-In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-6">
          Post-Meeting Social Content Generator
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Sign in with your Google account to get started
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>⚠️ Important:</strong> You&apos;ll need to grant calendar access on the next screen. 
            Make sure to check the calendar permission checkbox!
          </p>
        </div>

        <button
          onClick={() => setShowInstructions(true)}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

