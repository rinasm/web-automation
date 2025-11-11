import { Circle, Square, Pause, Play, Save, X, Clock } from 'lucide-react'
import { useRecordingStore } from '../store/recordingStore'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import { useState, useEffect } from 'react'

interface RecordingControlsProps {
  onStartRecording: () => void
  onStopRecording: () => void
  onPauseRecording: () => void
  onResumeRecording: () => void
  onCancelRecording: () => void
}

export default function RecordingControls({
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onCancelRecording
}: RecordingControlsProps) {
  const { status, getEventCount, currentSession } = useRecordingStore()
  const { getCurrentDevice } = useMobileDeviceStore()
  const [elapsedTime, setElapsedTime] = useState(0)

  const currentDevice = getCurrentDevice()
  const eventCount = getEventCount()
  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isIdle = status === 'idle'

  // Update elapsed time
  useEffect(() => {
    if (!currentSession || (status !== 'recording' && status !== 'paused')) {
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      if (status === 'recording') {
        const elapsed = Date.now() - currentSession.startTime
        setElapsedTime(elapsed)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [currentSession, status])

  // Format elapsed time
  const formatElapsedTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Circle
            size={12}
            className={`${
              isRecording
                ? 'text-red-500 fill-red-500 animate-pulse'
                : isPaused
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-gray-500'
            }`}
          />
          <h3 className="text-white font-medium">Flow Recording</h3>
        </div>

        {(isRecording || isPaused) && (
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1 text-gray-400">
              <Clock size={14} />
              <span className="font-mono">{formatElapsedTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="font-medium">{eventCount}</span>
              <span>events</span>
            </div>
          </div>
        )}
      </div>

      {/* Device Info */}
      {currentDevice && (
        <div className="bg-gray-900 rounded px-3 py-2 mb-4">
          <div className="text-xs text-gray-400">Recording on</div>
          <div className="text-sm text-white font-medium">{currentDevice.name}</div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {isIdle && (
          <button
            onClick={onStartRecording}
            disabled={!currentDevice}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <Circle size={18} className="fill-current" />
            Start Recording
          </button>
        )}

        {isRecording && (
          <>
            <button
              onClick={onPauseRecording}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
            >
              <Pause size={18} />
              Pause
            </button>

            <button
              onClick={onStopRecording}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Square size={18} />
              Stop & Save
            </button>

            <button
              onClick={onCancelRecording}
              className="flex items-center justify-center p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title="Cancel Recording"
            >
              <X size={18} />
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={onResumeRecording}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <Play size={18} />
              Resume
            </button>

            <button
              onClick={onStopRecording}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Save size={18} />
              Save Recording
            </button>

            <button
              onClick={onCancelRecording}
              className="flex items-center justify-center p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title="Cancel Recording"
            >
              <X size={18} />
            </button>
          </>
        )}
      </div>

      {/* Status Message */}
      {isIdle && !currentDevice && (
        <div className="mt-3 text-sm text-gray-400 text-center">
          Connect a device to start recording
        </div>
      )}

      {(isRecording || isPaused) && (
        <div className="mt-3 text-sm text-gray-400">
          <div className="flex items-center justify-between">
            <span>
              {isRecording
                ? 'Interact with your device to record actions...'
                : 'Recording paused'}
            </span>
            {eventCount === 0 && isRecording && (
              <span className="text-yellow-400 animate-pulse">Waiting for interactions</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
