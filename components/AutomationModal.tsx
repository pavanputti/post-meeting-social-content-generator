'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

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
        onSave()
      } else {
        alert('Failed to save automation')
      }
    } catch (error) {
      console.error('Error saving automation:', error)
      alert('Failed to save automation')
    } finally {
      setSaving(false)
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
            <label className="block text-sm font-medium mb-2">Example</label>
            <textarea
              value={formData.example}
              onChange={(e) => setFormData({ ...formData, example: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 min-h-[120px]"
              placeholder="Example output..."
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

