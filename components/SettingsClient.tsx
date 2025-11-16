'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react'
import AutomationModal from './AutomationModal'

interface UserSettings {
  botJoinMinutesBefore: number
  linkedInAccessToken: string | null
  facebookAccessToken: string | null
  twitterAccessToken: string | null
}

interface Automation {
  id: string
  name: string
  type: string
  platform: string
  description: string
  example: string | null
}

export default function SettingsClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings>({
    botJoinMinutesBefore: 5,
    linkedInAccessToken: null,
    facebookAccessToken: null,
    twitterAccessToken: null,
  })
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAutomationModal, setShowAutomationModal] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)

  useEffect(() => {
    fetchSettings()
    fetchAutomations()
    
    // Check for error messages in URL
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    if (error) {
      let errorMessage = 'LinkedIn authentication failed. Please try again.'
      
      if (error === 'linkedin_not_configured') {
        errorMessage = 'LinkedIn is not configured. Please add LINKEDIN_CLIENT_ID to your .env file and restart the server.'
      } else if (error === 'linkedin_auth_failed') {
        errorMessage = 'LinkedIn authentication failed. Please try again.'
      } else if (error === 'linkedin_invalid_request') {
        errorMessage = 'Invalid LinkedIn request. Please check your redirect URI in LinkedIn app settings matches: http://localhost:3000/api/auth/linkedin/callback'
      } else if (error === 'linkedin_unauthorized') {
        errorMessage = 'LinkedIn authorization failed. Please check your Client ID and Client Secret.'
      } else if (error === 'missing_params') {
        errorMessage = 'Missing required parameters. Please try connecting again.'
      } else if (error === 'invalid_state') {
        errorMessage = 'Security validation failed. Please try connecting again.'
      }
      
      alert(errorMessage)
      // Clean up URL
      window.history.replaceState({}, '', '/settings')
    }
    
    const success = urlParams.get('success')
    if (success === 'linkedin_connected') {
      alert('LinkedIn connected successfully!')
      window.history.replaceState({}, '', '/settings')
      fetchSettings() // Refresh settings
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

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        alert('Settings saved!')
      } else {
        alert('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
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

  const handleConnectTwitter = () => {
    // Redirect to Twitter OAuth
    window.location.href = '/api/auth/twitter'
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
        alert('Failed to delete automation')
      }
    } catch (error) {
      console.error('Error deleting automation:', error)
      alert('Failed to delete automation')
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
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Facebook</h3>
                <p className="text-sm text-gray-600">
                  {settings.facebookAccessToken ? 'Connected' : 'Not connected'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Requires Facebook Developer account
                </p>
              </div>
              <button
                onClick={handleConnectFacebook}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {settings.facebookAccessToken ? 'Reconnect' : 'Connect'}
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Twitter/X</h3>
                <p className="text-sm text-gray-600">
                  {settings.twitterAccessToken ? 'Connected' : 'Not connected'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Requires Twitter Developer account (may require paid API)
                </p>
              </div>
              <button
                onClick={handleConnectTwitter}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {settings.twitterAccessToken ? 'Reconnect' : 'Connect'}
              </button>
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
                No automations yet. Click "Add Automation" to create one.
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

