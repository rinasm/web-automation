/**
 * Recording Modal Component
 *
 * Shows WebView/MobileWebView during action recording
 * Captures user interactions and generates description
 */

import { useState, useEffect } from 'react'
import { X, StopCircle, Circle } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import WebView from './WebView'
import MobileWebView from './MobileWebView'
import { convertRecordingToDescription, type RecordedEvent } from '../utils/recordingToDescription'

interface RecordingModalProps {
  isOpen: boolean
  platform: 'web' | 'mobile'
  projectId: string
  onComplete: (description: string) => void
  onCancel: () => void
}

export function RecordingModal({
  isOpen,
  platform,
  projectId,
  onComplete,
  onCancel
}: RecordingModalProps) {
  const { getProjectById } = useProjectStore()
  const { getCurrentDevice } = useMobileDeviceStore()
  const [events, setEvents] = useState<RecordedEvent[]>([])
  const [isRecording, setIsRecording] = useState(true)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const project = getProjectById(projectId)
  const currentDevice = getCurrentDevice()

  // Recording duration timer
  useEffect(() => {
    if (!isRecording) return

    const interval = setInterval(() => {
      setRecordingDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording])

  if (!isOpen) return null

  const handleRecordEvent = (event: RecordedEvent) => {
    setEvents(prev => [...prev, event])
  }

  const handleStopRecording = async () => {
    setIsRecording(false)

    // Generate description from events (async AI-powered)
    const description = await convertRecordingToDescription(events)

    // Complete with generated description
    onComplete(description)

    // Reset state
    setEvents([])
    setRecordingDuration(0)
    setIsRecording(true)
  }

  const handleCancel = () => {
    setEvents([])
    setRecordingDuration(0)
    setIsRecording(true)
    onCancel()
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-[100]">
      {/* Recording Header */}
      <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-2">
              <Circle size={12} className="fill-current animate-pulse" />
              <span className="font-semibold">RECORDING</span>
            </div>
          )}
          <span className="text-sm">
            {platform === 'web' ? '🌐 Web' : '📱 Mobile'} Platform
          </span>
          <span className="text-sm font-mono">
            {formatDuration(recordingDuration)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStopRecording}
            className="flex items-center gap-2 px-6 py-2 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
          >
            <StopCircle size={20} />
            Stop Recording
          </button>
          <button
            onClick={handleCancel}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* WebView/MobileWebView */}
        <div className="flex-1 bg-white">
          {platform === 'web' ? (
            <WebView
              url={project?.webUrl || ''}
              recordingMode={true}
              onRecordEvent={handleRecordEvent}
            />
          ) : currentDevice ? (
            <MobileWebView
              url={project?.webUrl}
              device={currentDevice}
              recordingMode={true}
              onRecordEvent={handleRecordEvent}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No mobile device connected. Please connect a device first.</p>
            </div>
          )}
        </div>

        {/* Recorded Actions Panel */}
        <div className="w-80 bg-gray-900 text-white p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            Recorded Actions ({events.length})
          </h3>

          {events.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-8">
              <p>Start interacting with the {platform} app.</p>
              <p className="mt-2">All clicks, typing, and navigation will be recorded here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event, index) => (
                <div
                  key={index}
                  className="bg-gray-800 p-3 rounded text-xs border-l-2 border-blue-500"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-blue-400">
                      {index + 1}. {event.type.toUpperCase()}
                    </span>
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {event.url && (
                    <div className="text-gray-300">
                      URL: <span className="text-green-400">{event.url}</span>
                    </div>
                  )}

                  {event.selector && (
                    <div className="text-gray-300">
                      Selector: <span className="text-yellow-400">{event.selector}</span>
                    </div>
                  )}

                  {event.elementText && (
                    <div className="text-gray-300">
                      Element: <span className="text-purple-400">"{event.elementText}"</span>
                    </div>
                  )}

                  {event.value && (
                    <div className="text-gray-300">
                      Value: <span className="text-pink-400">
                        {event.selector?.includes('password') ? '********' : `"${event.value}"`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 text-white px-6 py-3 text-sm">
        <p>
          <span className="font-semibold">Instructions:</span> Interact with the {platform} application naturally.
          Click elements, fill forms, navigate pages. When done, click "Stop Recording" to generate test steps.
        </p>
      </div>
    </div>
  )
}
