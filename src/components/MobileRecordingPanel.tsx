/**
 * Mobile Recording Panel
 *
 * Integrated panel for recording mobile app flows
 * Combines recording controls, event display, and flow management
 */

import { useState, useCallback, useEffect } from 'react'
import { Play, Save, Download, Code, AlertCircle, Network } from 'lucide-react'
import { useRecordingStore } from '../store/recordingStore'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import { useStepStore } from '../store/stepStore'
import { useNetworkStore } from '../store/networkStore'
import RecordingControls from './RecordingControls'
import RecordedEventsList from './RecordedEventsList'
import { NetworkPanel } from './NetworkPanel'
import { mobileEventListenerManager } from '../services/mobileEventListener'
import { convertRecordedFlowToFlow, optimizeRecordedSteps, validateRecordedFlow, exportAsAppiumCode, replaceXPathWithIdentifiers } from '../utils/recordingConverter'
import { mobileActionExecutorManager } from '../utils/mobileActionExecutor'
import { startNetworkMonitoring, stopNetworkMonitoring } from '../services/networkListener'

interface MobileRecordingPanelProps {
  onFlowSaved?: (flowId: string) => void
}

export default function MobileRecordingPanel({ onFlowSaved }: MobileRecordingPanelProps) {
  const {
    status,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    addProcessedEvent,
    processedEvents,
    saveRecordedFlow,
    getCurrentSession
  } = useRecordingStore()

  const { getCurrentDevice } = useMobileDeviceStore()
  const { addStep } = useStepStore()
  const { isPanelVisible, setPanelVisible } = useNetworkStore()

  const [error, setError] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [flowName, setFlowName] = useState('')
  const [flowDescription, setFlowDescription] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)

  const currentDevice = getCurrentDevice()

  /**
   * Toggle network panel
   */
  const toggleNetworkPanel = useCallback(async () => {
    const newVisibility = !isPanelVisible
    setPanelVisible(newVisibility)

    // Start/stop network monitoring when panel is opened/closed
    if (currentDevice && newVisibility) {
      await startNetworkMonitoring(currentDevice.id)
    } else if (currentDevice && !newVisibility) {
      await stopNetworkMonitoring(currentDevice.id)
    }
  }, [isPanelVisible, setPanelVisible, currentDevice])

  /**
   * Handle start recording
   */
  const handleStartRecording = useCallback(async () => {
    if (!currentDevice) {
      setError('No device connected. Please connect a device first.')
      return
    }

    setError(null)

    try {
      // Start recording in store
      startRecording(currentDevice.id, currentDevice.name, currentDevice.os)

      // Create event listener
      const listener = mobileEventListenerManager.createListener(
        currentDevice,
        (event) => {
          // Add event to store
          addProcessedEvent(event)
        },
        {
          captureScreenshots: false,
          throttleDelay: 200,
          includeSystemEvents: false
        }
      )

      // Start listening
      await listener.start((event) => {
        addProcessedEvent(event)
      })

      console.log('🎬 [RECORDING PANEL] Recording started')
    } catch (err: any) {
      console.error('🎬 [RECORDING PANEL] Failed to start recording:', err)
      setError(err.message || 'Failed to start recording')
      cancelRecording()
    }
  }, [currentDevice, startRecording, addProcessedEvent, cancelRecording])

  /**
   * Handle stop recording
   */
  const handleStopRecording = useCallback(async () => {
    try {
      // Stop event listener
      if (currentDevice) {
        await mobileEventListenerManager.removeListener(currentDevice.id)
      }

      // Stop recording in store
      const session = stopRecording()

      if (session && session.events.length > 0) {
        // Show save dialog
        setShowSaveDialog(true)
        setFlowName(`Recording ${new Date().toLocaleString()}`)
      }

      console.log('🎬 [RECORDING PANEL] Recording stopped')
    } catch (err: any) {
      console.error('🎬 [RECORDING PANEL] Failed to stop recording:', err)
      setError(err.message || 'Failed to stop recording')
    }
  }, [currentDevice, stopRecording])

  /**
   * Handle pause recording
   */
  const handlePauseRecording = useCallback(() => {
    pauseRecording()
  }, [pauseRecording])

  /**
   * Handle resume recording
   */
  const handleResumeRecording = useCallback(() => {
    resumeRecording()
  }, [resumeRecording])

  /**
   * Handle cancel recording
   */
  const handleCancelRecording = useCallback(async () => {
    if (currentDevice) {
      await mobileEventListenerManager.removeListener(currentDevice.id)
    }
    cancelRecording()
    setError(null)
  }, [currentDevice, cancelRecording])

  /**
   * Handle save flow
   */
  const handleSaveFlow = useCallback(() => {
    const session = getCurrentSession()
    if (!session) {
      setError('No recording session to save')
      return
    }

    // Validate flow
    const validation = validateRecordedFlow(session.events)
    if (!validation.isValid) {
      setError(`Cannot save flow: ${validation.errors.join(', ')}`)
      return
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.warn('🎬 [RECORDING PANEL] Flow warnings:', validation.warnings)
    }

    // Save flow
    const flow = saveRecordedFlow(session, flowName || session.name, flowDescription)

    console.log('🎬 [RECORDING PANEL] Flow saved:', flow.id)

    // CRITICAL FIX: Replace XPath with accessibilityIds before conversion
    // This fixes the timing issue where early type events don't have accessibilityId yet
    console.log('🔧 [RECORDING PANEL] Running XPath replacement on', flow.events.length, 'events')
    const fixedEvents = replaceXPathWithIdentifiers(flow.events)

    // Convert to steps using fixed events
    const flowWithFixedEvents = { ...flow, events: fixedEvents }
    const convertedFlow = convertRecordedFlowToFlow(flowWithFixedEvents)

    console.log('🔧 [RECORDING PANEL] Converted', convertedFlow.steps.length, 'steps')

    // Optimize and filter out steps with empty selectors (unusable)
    const optimizedSteps = optimizeRecordedSteps(convertedFlow.steps)
    const validSteps = optimizedSteps.filter(step => {
      const hasValidSelector = step.selector && step.selector.trim() !== ''
      if (!hasValidSelector) {
        console.warn(`⚠️ [RECORDING PANEL] Filtering out step with empty selector: ${step.type}`)
      }
      return hasValidSelector
    })

    console.log('🔧 [RECORDING PANEL] After optimization and filtering:', validSteps.length, 'steps')

    // Add steps to step store
    validSteps.forEach(step => {
      addStep(step)
    })

    // Notify parent
    onFlowSaved?.(flow.id)

    // Close dialog
    setShowSaveDialog(false)
    setFlowName('')
    setFlowDescription('')
  }, [getCurrentSession, flowName, flowDescription, saveRecordedFlow, addStep, onFlowSaved])

  /**
   * Handle play recorded flow
   */
  const handlePlayFlow = useCallback(async () => {
    if (!currentDevice) {
      setError('No device connected')
      return
    }

    if (processedEvents.length === 0) {
      setError('No events to play')
      return
    }

    setIsPlaying(true)
    setError(null)

    try {
      // Convert events to steps
      const session = getCurrentSession()
      if (!session) {
        throw new Error('No session available')
      }

      const flow = saveRecordedFlow(session, 'Temporary Flow', 'For playback')
      const convertedFlow = convertRecordedFlowToFlow(flow)
      const steps = convertedFlow.steps

      // Execute steps
      console.log('🎬 [RECORDING PANEL] Playing flow with', steps.length, 'steps')

      const results = await mobileActionExecutorManager.executeActions(currentDevice, steps)

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      if (failCount > 0) {
        setError(`Playback completed with ${failCount} error(s). ${successCount}/${results.length} steps succeeded.`)
      } else {
        console.log('🎬 [RECORDING PANEL] Playback completed successfully')
      }
    } catch (err: any) {
      console.error('🎬 [RECORDING PANEL] Playback failed:', err)
      setError(err.message || 'Failed to play flow')
    } finally {
      setIsPlaying(false)
    }
  }, [currentDevice, processedEvents, getCurrentSession, saveRecordedFlow])

  /**
   * Handle export code
   */
  const handleExportCode = useCallback(() => {
    const session = getCurrentSession()
    if (!session) {
      setError('No recording session to export')
      return
    }

    const flow = saveRecordedFlow(session, flowName || session.name, flowDescription)
    const code = exportAsAppiumCode(flow)

    // Create download link
    const blob = new Blob([code], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flow.name.replace(/\s+/g, '_')}.js`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('🎬 [RECORDING PANEL] Code exported')
  }, [getCurrentSession, flowName, flowDescription, saveRecordedFlow])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (status === 'recording' && currentDevice) {
        mobileEventListenerManager.removeListener(currentDevice.id).catch(console.error)
      }
    }
  }, [status, currentDevice])

  return (
    <>
      <div className="h-full flex flex-col bg-gray-900 p-4 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Mobile Flow Recording</h2>
          <div className="flex items-center gap-4">
            {currentDevice && (
              <div className="text-sm text-gray-400">
                Device: <span className="text-white font-medium">{currentDevice.name}</span>
              </div>
            )}
            {/* Network Panel Toggle */}
            <button
              onClick={toggleNetworkPanel}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                isPanelVisible
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title="Toggle network panel"
            >
              <Network size={16} />
              Network
            </button>
          </div>
        </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-red-400 font-medium">Error</div>
            <div className="text-red-300 text-sm mt-1">{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Recording Controls */}
      <RecordingControls
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onPauseRecording={handlePauseRecording}
        onResumeRecording={handleResumeRecording}
        onCancelRecording={handleCancelRecording}
      />

      {/* Action Buttons */}
      {processedEvents.length > 0 && status !== 'recording' && (
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayFlow}
            disabled={isPlaying || !currentDevice}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <Play size={16} />
            {isPlaying ? 'Playing...' : 'Play Flow'}
          </button>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Save size={16} />
            Save Flow
          </button>

          <button
            onClick={handleExportCode}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Code size={16} />
            Export Code
          </button>
        </div>
      )}

      {/* Recorded Events List */}
      <div className="flex-1 overflow-hidden">
        <RecordedEventsList maxHeight="calc(100vh - 400px)" />
      </div>

      {/* Save Flow Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Save Recorded Flow</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Flow Name *
                </label>
                <input
                  type="text"
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="e.g., Login Flow"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={flowDescription}
                  onChange={(e) => setFlowDescription(e.target.value)}
                  placeholder="Describe what this flow does..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="text-sm text-gray-400">
                {processedEvents.length} events will be saved
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={handleSaveFlow}
                disabled={!flowName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Save Flow
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setFlowName('')
                  setFlowDescription('')
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Network Panel */}
    <NetworkPanel
      isVisible={isPanelVisible}
      onClose={() => setPanelVisible(false)}
    />
  </>
  )
}
