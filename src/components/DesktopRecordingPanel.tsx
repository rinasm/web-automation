/**
 * Desktop Recording Panel Component
 *
 * Provides UI controls for recording desktop automation actions
 * Supports manual coordinate-based action capture (MVP approach)
 */

import { useState, useEffect } from 'react'
import { Circle, StopCircle, Target, Mouse, Play, Square, Save, Trash2 } from 'lucide-react'
import { useDesktopStore, DesktopAction } from '../store/desktopStore'

interface DesktopRecordingPanelProps {
  onActionsRecorded?: (actions: DesktopAction[]) => void
}

export function DesktopRecordingPanel({ onActionsRecorded }: DesktopRecordingPanelProps) {
  const {
    isRecording,
    recordedActions,
    selectedApplication,
    isPlaying,
    currentPlaybackIndex,
    recordingApplicationName,
    startRecording,
    stopRecording,
    playRecordedActions,
    stopPlayback,
    clearRecordedActions,
    saveSequence,
  } = useDesktopStore()

  const [recordingDuration, setRecordingDuration] = useState(0)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [sequenceName, setSequenceName] = useState('')

  // Timer for recording duration
  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0)
      return
    }

    const interval = setInterval(() => {
      setRecordingDuration((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = () => {
    if (!selectedApplication) {
      alert('Please select an application first')
      return
    }

    clearRecordedActions()
    startRecording()
  }

  const handleStopRecording = () => {
    stopRecording()
    if (onActionsRecorded && recordedActions.length > 0) {
      onActionsRecorded(recordedActions)
    }
  }

  const handlePlayback = async () => {
    await playRecordedActions()
  }

  const handleStopPlayback = () => {
    stopPlayback()
  }

  const handleSaveSequence = () => {
    if (sequenceName.trim()) {
      saveSequence(sequenceName.trim())
      setShowSaveDialog(false)
      setSequenceName('')
    }
  }

  const handleCancelSave = () => {
    setShowSaveDialog(false)
    setSequenceName('')
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mouse size={20} className="text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Desktop Recording
            </h3>
          </div>

          {isRecording && (
            <div className="flex items-center gap-2">
              <Circle size={12} className="fill-red-500 text-red-500 animate-pulse" />
              <span className="text-sm font-mono text-gray-700">
                {formatDuration(recordingDuration)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {!selectedApplication ? (
          <div className="text-center py-8 text-gray-500">
            <Target size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select an application to start recording</p>
          </div>
        ) : !isRecording && !isPlaying ? (
          /* Not Recording & Not Playing - Show Start Button and Playback Controls */
          <div className="space-y-4">
            <div className="text-center py-6">
              <p className="text-sm text-gray-600 mb-4">
                Ready to record actions for <span className="font-semibold">{selectedApplication.name}</span>
              </p>
              <button
                onClick={handleStartRecording}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center gap-2 mx-auto"
              >
                <Circle size={18} />
                Start Recording
              </button>
            </div>

            {recordedActions.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <div className="text-center mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    {recordedActions.length} action(s) recorded for{' '}
                    <span className="text-purple-600">{recordingApplicationName}</span>
                  </p>
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={handlePlayback}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    Play Sequence
                  </button>
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    Save Sequence
                  </button>
                </div>
                <button
                  onClick={clearRecordedActions}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Clear Actions
                </button>
              </div>
            )}
          </div>
        ) : isPlaying ? (
          /* Playing - Show Playback Progress */
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Play size={14} className="text-green-600 animate-pulse" />
                  <span className="text-sm font-semibold text-green-700">
                    PLAYING
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  {currentPlaybackIndex + 1} / {recordedActions.length}
                </span>
              </div>

              {currentPlaybackIndex >= 0 && recordedActions[currentPlaybackIndex] && (
                <p className="text-xs text-gray-600 mb-3">
                  Current: {recordedActions[currentPlaybackIndex].description}
                </p>
              )}

              <button
                onClick={handleStopPlayback}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <Square size={16} />
                Stop Playback
              </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-600 h-full transition-all duration-300"
                style={{
                  width: `${((currentPlaybackIndex + 1) / recordedActions.length) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          /* Recording - Show Stop and Add Action Buttons */
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Circle size={14} className="fill-red-500 text-red-500 animate-pulse" />
                  <span className="text-sm font-semibold text-red-700">
                    RECORDING
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  {recordedActions.length} action(s)
                </span>
              </div>

              <p className="text-xs text-gray-600 mb-3">
                Perform actions in {selectedApplication.name} - clicks and keyboard inputs will be captured automatically!
              </p>

              <button
                onClick={handleStopRecording}
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
              >
                <StopCircle size={18} />
                Stop Recording
              </button>
            </div>

            {/* Last Action Preview */}
            {recordedActions.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Last action:</p>
                <p className="text-sm font-medium text-gray-900">
                  {recordedActions[recordedActions.length - 1].description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recorded Actions List */}
        {recordedActions.length > 0 && !isRecording && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recorded Actions</h4>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {recordedActions.map((action, index) => (
                <div
                  key={action.id}
                  className={`
                    p-2 rounded-md text-sm transition-colors
                    ${
                      isPlaying && index === currentPlaybackIndex
                        ? 'bg-green-100 border border-green-300'
                        : isPlaying && index < currentPlaybackIndex
                        ? 'bg-gray-100 opacity-50'
                        : 'bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-gray-500 mt-0.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">
                        {action.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {action.description}
                      </p>
                    </div>
                    {isPlaying && index === currentPlaybackIndex && (
                      <span className="text-xs text-green-600 font-medium">▶</span>
                    )}
                    {isPlaying && index < currentPlaybackIndex && (
                      <span className="text-xs text-gray-400">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Sequence Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Sequence</h3>
            <p className="text-sm text-gray-600 mb-4">
              Give your sequence a name. This will help you identify it later.
            </p>
            <input
              type="text"
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveSequence()
                if (e.key === 'Escape') handleCancelSave()
              }}
              placeholder="e.g., Login Flow"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCancelSave}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSequence}
                disabled={!sequenceName.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
