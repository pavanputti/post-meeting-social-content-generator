'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastId = 0
const toastListeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

function addToast(message: string, type: ToastType = 'info') {
  const id = `toast-${toastId++}`
  const newToast: Toast = { id, message, type }
  toasts = [...toasts, newToast]
  toastListeners.forEach(listener => listener(toasts))
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    removeToast(id)
  }, 5000)
}

function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id)
  toastListeners.forEach(listener => listener(toasts))
}

export function showToast(message: string, type: ToastType = 'info') {
  addToast(message, type)
}

export function showSuccess(message: string) {
  showToast(message, 'success')
}

export function showError(message: string) {
  showToast(message, 'error')
}

export function showInfo(message: string) {
  showToast(message, 'info')
}

export default function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts)
    }
    toastListeners.push(listener)
    setCurrentToasts(toasts)
    
    return () => {
      const index = toastListeners.indexOf(listener)
      if (index > -1) {
        toastListeners.splice(index, 1)
      }
    }
  }, [])

  if (currentToasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {currentToasts.map((toast) => {
        const bgColor = 
          toast.type === 'success' ? 'bg-green-50 border-green-200' :
          toast.type === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        
        const textColor =
          toast.type === 'success' ? 'text-green-800' :
          toast.type === 'error' ? 'text-red-800' :
          'text-blue-800'
        
        const iconColor =
          toast.type === 'success' ? 'text-green-600' :
          toast.type === 'error' ? 'text-red-600' :
          'text-blue-600'

        const Icon = 
          toast.type === 'success' ? CheckCircle :
          toast.type === 'error' ? AlertCircle :
          Info

        return (
          <div
            key={toast.id}
            className={`${bgColor} ${textColor} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md flex items-start gap-3 transition-all duration-300 ease-in-out`}
            style={{
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={`${textColor} hover:opacity-70 flex-shrink-0`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

