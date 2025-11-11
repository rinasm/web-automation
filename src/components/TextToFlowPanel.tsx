import { useState } from 'react'
import { FileText, Play, Loader, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'

interface ParsedStep {
  description: string
  order: number
}

interface TextToFlowPanelProps {
  onExecute: (flowDescription: string) => void
  onReset?: () => void
  isExecuting: boolean
  parsedSteps: ParsedStep[]
  currentStepIndex: number
  stepStatuses: Record<number, 'pending' | 'executing' | 'completed' | 'failed'>
}

export const TextToFlowPanel: React.FC<TextToFlowPanelProps> = ({
  onExecute,
  onReset,
  isExecuting,
  parsedSteps,
  currentStepIndex,
  stepStatuses
}) => {
  const [flowDescription, setFlowDescription] = useState('')
  const [voiceMode, setVoiceMode] = useState<'append' | 'replace'>('replace')

  const handleExecute = () => {
    if (flowDescription.trim() && !isExecuting) {
      onExecute(flowDescription.trim())
    }
  }

  const handleVoiceTranscript = (transcript: string) => {
    if (voiceMode === 'append') {
      // Append to existing text with proper spacing
      setFlowDescription(prev => {
        const trimmed = prev.trim()
        return trimmed ? `${trimmed} ${transcript}` : transcript
      })
    } else {
      // Replace entire text
      setFlowDescription(transcript)
    }
  }

  const exampleFlows = [
    'Login with username "admin" and password "test123", then navigate to the dashboard',
    'Search for "laptop", filter by price range $500-$1000, and add the first result to cart',
    'Go to settings, change theme to dark mode, and save changes',
    'Click on "Accounts", select the first account, and view transaction history'
  ]

  const handleUseExample = (example: string) => {
    setFlowDescription(example)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-teal-50">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={20} className="text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">Text to Flow</h3>
        </div>
        <p className="text-xs text-gray-600">
          Describe your test flow in natural language and let AI execute it step by step
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Flow Description
          </label>
          <textarea
            value={flowDescription}
            onChange={(e) => setFlowDescription(e.target.value)}
            placeholder="Example: Login with username 'admin' and password 'test123', then navigate to the accounts page and view the first transaction..."
            className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
            disabled={isExecuting}
          />
          <div className="mt-1 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {flowDescription.length} characters
            </div>
            {/* Voice Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Voice mode:</span>
              <button
                onClick={() => setVoiceMode('replace')}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  voiceMode === 'replace'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={isExecuting}
              >
                Replace
              </button>
              <button
                onClick={() => setVoiceMode('append')}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  voiceMode === 'append'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={isExecuting}
              >
                Append
              </button>
            </div>
          </div>
        </div>

        {/* Voice Recorder */}
        {!isExecuting && parsedSteps.length === 0 && (
          <div className="border-t border-gray-200 pt-4">
            <VoiceRecorder
              onTranscript={handleVoiceTranscript}
              disabled={isExecuting}
              mode={voiceMode}
            />
          </div>
        )}

        {/* Example Flows */}
        {!isExecuting && parsedSteps.length === 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Example Flows (click to use)
            </label>
            <div className="space-y-2">
              {exampleFlows.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleUseExample(example)}
                  className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-700"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Execute Button */}
        {!isExecuting && parsedSteps.length === 0 && (
          <button
            onClick={handleExecute}
            disabled={!flowDescription.trim() || isExecuting}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-teal-700 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={18} />
            Execute Flow
          </button>
        )}

        {/* Execution Progress */}
        {parsedSteps.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">
                  Execution Progress ({currentStepIndex + 1}/{parsedSteps.length})
                </h4>
                <div className="flex items-center gap-3">
                  {isExecuting && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <Loader className="animate-spin" size={14} />
                      Executing...
                    </div>
                  )}
                  {!isExecuting && (
                    <>
                      <div className="text-xs text-gray-500">Completed</div>
                      <button
                        onClick={() => {
                          setFlowDescription('')
                          if (onReset) {
                            onReset()
                          }
                        }}
                        className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
                      >
                        Start New Flow
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Progress Bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentStepIndex + 1) / parsedSteps.length) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Steps List */}
            <div className="divide-y divide-gray-200">
              {parsedSteps.map((step, index) => {
                const status = stepStatuses[index] || 'pending'
                const isCurrent = index === currentStepIndex && isExecuting

                return (
                  <div
                    key={index}
                    className={`px-4 py-3 transition-colors ${
                      isCurrent
                        ? 'bg-green-50'
                        : status === 'completed'
                        ? 'bg-gray-50'
                        : status === 'failed'
                        ? 'bg-red-50'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {status === 'completed' && (
                          <CheckCircle size={18} className="text-green-600" />
                        )}
                        {status === 'failed' && (
                          <XCircle size={18} className="text-red-600" />
                        )}
                        {status === 'executing' && (
                          <Loader size={18} className="text-green-600 animate-spin" />
                        )}
                        {status === 'pending' && (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300" />
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">
                            Step {step.order}
                          </span>
                          {isCurrent && (
                            <span className="text-xs text-green-600 font-medium">
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 mt-1">{step.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Info Box */}
        {!isExecuting && parsedSteps.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>AI parses your description into discrete steps</li>
                  <li>Each step is executed by finding and interacting with elements</li>
                  <li>After completion, you can save the flow like any AI-discovered journey</li>
                  <li>Use clear, specific language for best results</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
