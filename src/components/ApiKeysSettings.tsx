import { useState, useEffect } from 'react'
import { X, Key, Save, Eye, EyeOff } from 'lucide-react'
import { claudeService } from '../services/claudeService'

interface ApiKeysSettingsProps {
  onClose: () => void
}

export const ApiKeysSettings: React.FC<ApiKeysSettingsProps> = ({ onClose }) => {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showGroqKey, setShowGroqKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load existing keys
    const existingAnthropicKey = localStorage.getItem('anthropic_api_key')
    const existingGroqKey = localStorage.getItem('groq_api_key')

    if (existingAnthropicKey) {
      setAnthropicKey(existingAnthropicKey)
    }
    if (existingGroqKey) {
      setGroqKey(existingGroqKey)
    }
  }, [])

  const handleSave = () => {
    let changesMade = false

    // Save Anthropic key if provided
    if (anthropicKey.trim()) {
      console.log('💾 Saving Anthropic API key and re-initializing Claude service...')
      localStorage.setItem('anthropic_api_key', anthropicKey.trim())
      // IMPORTANT: Re-initialize Claude service with new key
      claudeService.initialize(anthropicKey.trim())
      console.log('✅ Claude service re-initialized')
      changesMade = true
    }

    // Save Groq key if provided
    if (groqKey.trim()) {
      console.log('💾 Saving Groq API key...')
      localStorage.setItem('groq_api_key', groqKey.trim())
      changesMade = true
    }

    if (changesMade) {
      setSaved(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    }
  }

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return key
    return key.substring(0, 8) + '•'.repeat(Math.min(key.length - 8, 40))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Key size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">API Keys Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600">
            Configure your API keys for different services. Your keys are stored locally in your browser.
          </p>

          {/* Anthropic API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Anthropic API Key
              </label>
              <span className="text-xs text-gray-500">
                {anthropicKey ? '✓ Set' : 'Not set'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Used for: AI Exploration & Text-to-Flow features
            </p>
            <div className="relative">
              <input
                type={showAnthropicKey ? 'text' : 'password'}
                value={anthropicKey}
                onChange={(e) => {
                  setAnthropicKey(e.target.value)
                  setSaved(false)
                }}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showAnthropicKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                Get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com/settings/keys</a>
              </p>
            </div>
          </div>

          {/* Groq API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Groq API Key
              </label>
              <span className="text-xs text-gray-500">
                {groqKey ? '✓ Set' : 'Not set'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Used for: Voice-to-Text transcription (free & fast)
            </p>
            <div className="relative">
              <input
                type={showGroqKey ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => {
                  setGroqKey(e.target.value)
                  setSaved(false)
                }}
                placeholder="gsk_..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowGroqKey(!showGroqKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showGroqKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                Get your free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com/keys</a>
              </p>
              <p className="text-xs text-green-900 mt-1">
                ✓ Free tier: 14,400 requests/day
              </p>
            </div>
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">✓ API keys saved successfully!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!anthropicKey.trim() && !groqKey.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            Save Keys
          </button>
        </div>
      </div>
    </div>
  )
}
