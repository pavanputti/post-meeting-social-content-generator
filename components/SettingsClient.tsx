'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react'
import AutomationModal from './AutomationModal'
import { showSuccess, showError, showInfo } from './Toast'

interface UserSettings {
  botJoinMinutesBefore: number
  linkedInAccessToken: string | null
  facebookAccessToken: string | null
}

interface Automation {
  id: string
  name: string
  type: string
  platform: string
  description: string
  example: string | null
}

interface GoogleAccount {
  id: string
  email: string
  createdAt: string
  expiresAt: string | null
}

interface FacebookPage {
  id: string
  pageId: string
  pageName: string
  category: string | null
  createdAt: string
}

export default function SettingsClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings>({
    botJoinMinutesBefore: 5,
    linkedInAccessToken: null,
    facebookAccessToken: null,
  })
  const [automations, setAutomations] = useState<Automation[]>([])
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([])
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([])
  const [selectedFacebookPageId, setSelectedFacebookPageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAutomationModal, setShowAutomationModal] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)

  useEffect(() => {
    fetchSettings()
    fetchAutomations()
    fetchGoogleAccounts()
    fetchFacebookPages()
    
    // Check for error messages in URL
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    if (error) {
      let errorMessage = 'Authentication failed. Please try again.'
      
      if (error === 'linkedin_not_configured') {
        errorMessage = 'LinkedIn is not configured. Please add LINKEDIN_CLIENT_ID to your .env file and restart the server.'
      } else if (error === 'linkedin_auth_failed') {
        errorMessage = 'LinkedIn authentication failed. Please try again.'
      } else if (error === 'linkedin_invalid_request') {
        errorMessage = 'Invalid LinkedIn request. Please check your redirect URI in LinkedIn app settings matches: http://localhost:3000/api/auth/linkedin/callback'
      } else if (error === 'linkedin_unauthorized') {
        errorMessage = 'LinkedIn authorization failed. Please check your Client ID and Client Secret.'
      } else if (error === 'google_not_configured') {
        errorMessage = 'Google is not configured. Please add GOOGLE_CLIENT_ID to your .env file and restart the server.'
      } else if (error === 'google_auth_failed') {
        errorMessage = 'Google authentication failed. Please try again.'
      } else if (error === 'missing_params') {
        errorMessage = 'Missing required parameters. Please try connecting again.'
      } else if (error === 'invalid_state') {
        errorMessage = 'Security validation failed. Please try connecting again.'
      } else if (error === 'no_email') {
        errorMessage = 'Could not retrieve email from Google account. Please try again.'
      }
      
      showError(errorMessage)
      // Clean up URL
      window.history.replaceState({}, '', '/settings')
    }
    
    const success = urlParams.get('success')
    if (success === 'linkedin_connected') {
      showSuccess('LinkedIn connected successfully!')
      window.history.replaceState({}, '', '/settings')
      fetchSettings() // Refresh settings
    } else if (success === 'google_connected') {
      showSuccess('Google account connected successfully!')
      window.history.replaceState({}, '', '/settings')
      fetchGoogleAccounts() // Refresh Google accounts
    } else if (success === 'facebook_connected') {
      showSuccess('Facebook connected successfully!')
      window.history.replaceState({}, '', '/settings')
      fetchSettings() // Refresh settings
      fetchFacebookPages() // Refresh Facebook pages
    }
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAutomations = async () => {
    try {
      const response = await fetch('/api/automations')
      const data = await response.json()
      setAutomations(data.automations || [])
    } catch (error) {
      console.error('Error fetching automations:', error)
    }
  }

  const fetchGoogleAccounts = async () => {
    try {
      const response = await fetch('/api/google-accounts')
      const data = await response.json()
      setGoogleAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching Google accounts:', error)
    }
  }

  const fetchFacebookPages = async () => {
    try {
      const response = await fetch('/api/facebook-pages')
      const data = await response.json()
      setFacebookPages(data.pages || [])
      setSelectedFacebookPageId(data.selectedPageId || null)
    } catch (error) {
      console.error('Error fetching Facebook pages:', error)
    }
  }

  const handleSelectFacebookPage = async (pageId: string) => {
    try {
      const response = await fetch('/api/facebook-pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPageId: pageId }),
      })

      if (response.ok) {
        setSelectedFacebookPageId(pageId)
        showSuccess('Facebook page selected')
      } else {
        showError('Failed to select Facebook page')
      }
    } catch (error) {
      console.error('Error selecting Facebook page:', error)
      showError('Failed to select Facebook page')
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        showSuccess('Settings saved!')
      } else {
        showError('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      showError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleConnectLinkedIn = () => {
    // Redirect to LinkedIn OAuth
    window.location.href = '/api/auth/linkedin'
  }

  const handleConnectFacebook = () => {
    // Redirect to Facebook OAuth
    window.location.href = '/api/auth/facebook'
  }

  const handleConnectGoogle = () => {
    // Redirect to Google OAuth for additional accounts
    window.location.href = '/api/auth/google-account'
  }

  const handleDisconnectGoogle = async (accountId: string) => {
    // Find the account to check if it's primary
    const account = googleAccounts.find(acc => acc.id === accountId)
    if (account && session?.user?.email === account.email) {
      showError('Cannot disconnect primary login account')
      return
    }

    if (!confirm('Are you sure you want to disconnect this Google account?')) return

    try {
      const response = await fetch(`/api/google-accounts?id=${accountId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showSuccess('Google account disconnected')
        fetchGoogleAccounts()
      } else {
        const data = await response.json()
        showError(data.error || 'Failed to disconnect Google account')
      }
    } catch (error) {
      console.error('Error disconnecting Google account:', error)
      showError('Failed to disconnect Google account')
    }
  }


  const handleDeleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return

    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchAutomations()
      } else {
        showError('Failed to delete automation')
      }
    } catch (error) {
      console.error('Error deleting automation:', error)
      showError('Failed to delete automation')
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="space-y-8">
        {/* Google Calendar Accounts */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Google Calendar Accounts</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Connect multiple Google accounts to pull events from all of their calendars.
            </p>
            {googleAccounts.length > 0 ? (
              <div className="space-y-2">
                {googleAccounts.map((account) => {
                  const isPrimaryAccount = session?.user?.email === account.email
                  return (
                    <div
                      key={account.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{account.email}</p>
                          {isPrimaryAccount && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                              Primary Account
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Connected {new Date(account.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDisconnectGoogle(account.id)}
                        disabled={isPrimaryAccount}
                        className={`px-3 py-1 text-sm border rounded flex items-center gap-1 ${
                          isPrimaryAccount
                            ? 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50'
                            : 'border-red-300 text-red-600 hover:bg-red-50'
                        }`}
                        title={isPrimaryAccount ? 'Cannot disconnect primary login account' : 'Disconnect account'}
                      >
                        <Trash2 className="w-3 h-3" />
                        Disconnect
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No Google accounts connected.</p>
            )}
            <button
              onClick={handleConnectGoogle}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Connect Google Account
            </button>
          </div>
        </section>

        {/* Bot Settings */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Notetaker Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Join meeting (minutes before start)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.botJoinMinutesBefore}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    botJoinMinutesBefore: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </section>

        {/* Social Media Connections */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Social Media Accounts</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">LinkedIn</h3>
                <p className="text-sm text-gray-600">
                  {settings.linkedInAccessToken ? 'Connected' : 'Not connected'}
                </p>
              </div>
              <button
                onClick={handleConnectLinkedIn}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {settings.linkedInAccessToken ? 'Reconnect' : 'Connect'}
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Facebook</h3>
                  <p className="text-sm text-gray-600">
                    {settings.facebookAccessToken ? 'Connected' : 'Not connected'}
                  </p>
                </div>
                <button
                  onClick={handleConnectFacebook}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {settings.facebookAccessToken ? 'Reconnect' : 'Connect'}
                </button>
              </div>
              
              {settings.facebookAccessToken && (
                <div className="mt-4 pt-4 border-t">
                  {facebookPages.length > 0 ? (
                    <>
                      <label className="block text-sm font-medium mb-2">
                        Select Facebook Page to Post To:
                      </label>
                      <div className="space-y-2">
                        {facebookPages.map((page) => (
                          <label
                            key={page.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedFacebookPageId === page.pageId
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="facebookPage"
                              value={page.pageId}
                              checked={selectedFacebookPageId === page.pageId}
                              onChange={() => handleSelectFacebookPage(page.pageId)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div className="flex-1">
                              <p className="font-medium">{page.pageName}</p>
                              {page.category && (
                                <p className="text-xs text-gray-500">{page.category}</p>
                              )}
                            </div>
                            {selectedFacebookPageId === page.pageId && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                                Selected
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Posts will be published to the selected page.
                      </p>
                    </>
                  ) : (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        No Facebook pages found. Make sure you have created a Facebook Page and granted page permissions when connecting.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Automations */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Automations</h2>
            <button
              onClick={() => {
                setEditingAutomation(null)
                setShowAutomationModal(true)
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Automation
            </button>
          </div>

          <div className="space-y-4">
            {automations.map((automation) => (
              <div
                key={automation.id}
                className="border rounded-lg p-4 flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{automation.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {automation.platform}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{automation.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingAutomation(automation)
                      setShowAutomationModal(true)
                    }}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAutomation(automation.id)}
                    className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {automations.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No automations yet. Click &quot;Add Automation&quot; to create one.
              </p>
            )}
          </div>
        </section>
      </div>

      {showAutomationModal && (
        <AutomationModal
          automation={editingAutomation}
          onClose={() => {
            setShowAutomationModal(false)
            setEditingAutomation(null)
          }}
          onSave={() => {
            fetchAutomations()
            setShowAutomationModal(false)
            setEditingAutomation(null)
          }}
        />
      )}
    </div>
  )
}

