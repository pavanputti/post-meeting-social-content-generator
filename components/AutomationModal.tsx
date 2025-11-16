'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Sparkles } from 'lucide-react'
import { showSuccess, showError, showInfo } from './Toast'

interface Automation {
  id: string
  name: string
  type: string
  platform: string
  description: string
  example: string | null
}

export default function AutomationModal({
  automation,
  onClose,
  onSave,
}: {
  automation: Automation | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Generate post',
    platform: 'linkedin',
    description: '',
    example: '',
  })
  const [saving, setSaving] = useState(false)
  const [generatingExample, setGeneratingExample] = useState(false)

  useEffect(() => {
    if (automation) {
      setFormData({
        name: automation.name,
        type: automation.type,
        platform: automation.platform,
        description: automation.description,
        example: automation.example || '',
      })
    }
  }, [automation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const url = automation
        ? `/api/automations/${automation.id}`
        : '/api/automations'
      const method = automation ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        showSuccess(automation ? 'Automation updated successfully!' : 'Automation created successfully!')
        onSave()
      } else {
        showError('Failed to save automation')
      }
    } catch (error) {
      console.error('Error saving automation:', error)
      showError('Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateExample = async () => {
    if (!formData.description.trim()) {
      showInfo('Please enter a description first')
      return
    }

    try {
      setGeneratingExample(true)
      const response = await fetch('/api/automations/generate-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          platform: formData.platform,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate example')
      }

      if (data.example) {
        setFormData({ ...formData, example: data.example })
        showSuccess('Example generated successfully!')
      } else {
        showError('No example was generated. Please try again.')
      }
    } catch (error: any) {
      console.error('Error generating example:', error)
      showError(error.message || 'Failed to generate example')
    } finally {
      setGeneratingExample(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Do this...</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="relative">
              <input
                type="text"
                value={formData.type}
                readOnly
                className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Platform</label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="linkedin">LinkedIn post</option>
              <option value="facebook">Facebook post</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 min-h-[120px]"
              placeholder="1. Draft a LinkedIn post (120-180 words) that summarizes the meeting value in first person.&#10;2. Use a warm, conversational tone consistent with an experienced financial advisor.&#10;3. End with up to three hashtags.&#10;&#10;Return only the post text."
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Example</label>
              <button
                type="button"
                onClick={handleGenerateExample}
                disabled={generatingExample || !formData.description.trim()}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingExample ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Generate Example
                  </>
                )}
              </button>
            </div>
            <textarea
              value={formData.example}
              onChange={(e) => setFormData({ ...formData, example: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 min-h-[120px]"
              placeholder="Click 'Generate Example' to create a sample output based on your description, or enter your own example..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save & close'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            {automation && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this automation?')) {
                    try {
                      const response = await fetch(`/api/automations/${automation.id}`, {
                        method: 'DELETE',
                      })
                      if (response.ok) {
                        onSave()
                      }
                    } catch (error) {
                      console.error('Error deleting automation:', error)
                    }
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

