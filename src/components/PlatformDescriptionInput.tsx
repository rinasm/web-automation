/**
 * Platform Description Input Component
 *
 * Supports 3 creation methods:
 * 1. Manual typing
 * 2. Voice-to-text
 * 3. Record actions
 */

import { useState } from 'react'
import { Mic, Video, Type } from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'

type CreationMethod = 'manual' | 'voice' | 'record'

interface PlatformDescriptionInputProps {
  platform: 'web' | 'mobile'
  value: string
  onChange: (value: string) => void
  creationMethod: CreationMethod
  onCreationMethodChange: (method: CreationMethod) => void
  onStartRecording?: () => void
  disabled?: boolean
  required?: boolean
}

export function PlatformDescriptionInput({
  platform,
  value,
  onChange,
  creationMethod,
  onCreationMethodChange,
  onStartRecording,
  disabled = false,
  required = false
}: PlatformDescriptionInputProps) {
  const [isRecording, setIsRecording] = useState(false)

  const platformLabel = platform === 'web' ? 'Web' : 'Mobile'
  const platformIcon = platform === 'web' ? '🌐' : '📱'

  const handleVoiceTranscript = (transcription: string) => {
    // Append to existing value or replace
    if (value) {
      onChange(value + ' ' + transcription)
    } else {
      onChange(transcription)
    }
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    onStartRecording?.()
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
      {/* Platform Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{platformIcon}</span>
        <h3 className="font-semibold text-gray-900">
          {platformLabel} Platform {!required && <span className="text-sm text-gray-500">(Optional)</span>}
        </h3>
      </div>

      {/* Creation Method Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Creation Method:
        </label>
        <div className="space-y-2">
          {/* Manual */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name={`creation-method-${platform}`}
              value="manual"
              checked={creationMethod === 'manual'}
              onChange={() => onCreationMethodChange('manual')}
              disabled={disabled}
              className="w-4 h-4 text-blue-600"
            />
            <Type size={18} className="text-gray-600" />
            <span className="text-sm text-gray-700">Type manually</span>
          </label>

          {/* Voice */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name={`creation-method-${platform}`}
              value="voice"
              checked={creationMethod === 'voice'}
              onChange={() => onCreationMethodChange('voice')}
              disabled={disabled}
              className="w-4 h-4 text-blue-600"
            />
            <Mic size={18} className="text-gray-600" />
            <span className="text-sm text-gray-700">🎙️ Voice to text</span>
          </label>

          {/* Record */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name={`creation-method-${platform}`}
              value="record"
              checked={creationMethod === 'record'}
              onChange={() => onCreationMethodChange('record')}
              disabled={disabled}
              className="w-4 h-4 text-blue-600"
            />
            <Video size={18} className="text-gray-600" />
            <span className="text-sm text-gray-700">✨ Record actions</span>
          </label>
        </div>
      </div>

      {/* Input Area - Based on Selected Method */}
      <div className="mt-4">
        {creationMethod === 'manual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description:
            </label>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Describe how this feature works on ${platformLabel}...
Example: "User navigates to login page, enters email and password, clicks submit button"`}
              rows={6}
              disabled={disabled}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500">
              Describe the user flow in natural language. AI will generate test steps from this.
            </p>
          </div>
        )}

        {creationMethod === 'voice' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice Recording:
            </label>
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <VoiceRecorder
                onTranscript={handleVoiceTranscript}
                disabled={disabled}
              />
              {value && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Transcribed text:</p>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700">
                    {value}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Click the microphone to start recording. Speak clearly and describe the feature flow.
            </p>
          </div>
        )}

        {creationMethod === 'record' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Record Actions:
            </label>
            <div className="bg-white border border-gray-300 rounded-lg p-6 text-center">
              {!isRecording && !value ? (
                <div>
                  <Video size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-4">
                    Click the button below to open the {platformLabel} preview and start recording your interactions
                  </p>
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    disabled={disabled}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    Start Recording
                  </button>
                </div>
              ) : value ? (
                <div className="text-left">
                  <p className="text-xs text-gray-500 mb-2">Generated description from recorded actions:</p>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700">
                    {value}
                  </div>
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    disabled={disabled}
                    className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Record Again
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-yellow-600">Recording in progress...</p>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Interact with your {platformLabel} application naturally. All clicks, typing, and navigation will be recorded.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
