/**
 * Screenshot Recording Panel
 *
 * Displays device screenshot and allows users to click on elements to record actions.
 * This approach mimics Appium Inspector's recorder - users interact with a screenshot,
 * not the live device, because iOS security prevents real-time touch event monitoring.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MobileDevice } from '../types/mobileDevice'
import {
  screenshotRecorderManager,
  ScreenshotRecordingState,
  ClickEvent
} from '../services/screenshotRecorder'
import { RecordedEvent } from '../store/recordingStore'
import { Play, Square, RefreshCw, Hand, MousePointer, Move } from 'lucide-react'

interface ScreenshotRecordingPanelProps {
  device: MobileDevice
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onEventRecorded: (event: RecordedEvent) => void
}

type InteractionMode = 'tap' | 'longPress' | 'swipe'

export const ScreenshotRecordingPanel: React.FC<ScreenshotRecordingPanelProps> = ({
  device,
  isRecording,
  onStartRecording,
  onStopRecording,
  onEventRecorded
}) => {
  const [state, setState] = useState<ScreenshotRecordingState | null>(null)
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('tap')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Mouse interaction tracking
  const [mouseDownTime, setMouseDownTime] = useState<number | null>(null)
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null)
  const [swipePath, setSwipePath] = useState<{ x: number; y: number }[]>([])
  const [isLongPressActive, setIsLongPressActive] = useState(false)

  const imageRef = useRef<HTMLImageElement>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Poll screenshot state
  useEffect(() => {
    if (!isRecording) return

    const interval = setInterval(() => {
      const recorder = screenshotRecorderManager.getRecorder(device.id)
      if (recorder) {
        setState(recorder.getCurrentState())
      }
    }, 500) // Poll UI state every 500ms

    return () => clearInterval(interval)
  }, [device.id, isRecording])

  // Start recording
  const handleStart = useCallback(async () => {
    try {
      const recorder = screenshotRecorderManager.createRecorder(device, (event) => {
        console.log('📸 [PANEL] Event recorded:', event)
        onEventRecorded(event)
      })

      await recorder.start()
      onStartRecording()
      setIsRefreshing(true)

      // Initial state load
      setTimeout(() => {
        setState(recorder.getCurrentState())
        setIsRefreshing(false)
      }, 2000)

    } catch (error) {
      console.error('📸 [PANEL] Error starting recorder:', error)
    }
  }, [device, onStartRecording, onEventRecorded])

  // Stop recording
  const handleStop = useCallback(async () => {
    try {
      await screenshotRecorderManager.removeRecorder(device.id)
      onStopRecording()
      setState(null)
    } catch (error) {
      console.error('📸 [PANEL] Error stopping recorder:', error)
    }
  }, [device.id, onStopRecording])

  // Handle mouse down on screenshot
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convert to device coordinates
    const scaleX = imageRef.current.naturalWidth / rect.width
    const scaleY = imageRef.current.naturalHeight / rect.height
    const deviceX = x * scaleX
    const deviceY = y * scaleY

    setMouseDownTime(Date.now())
    setMouseDownPos({ x: deviceX, y: deviceY })

    if (interactionMode === 'swipe') {
      setSwipePath([{ x, y }])
    }

    // Start long press timer
    if (interactionMode === 'longPress' || interactionMode === 'tap') {
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressActive(true)
      }, 500)
    }
  }, [interactionMode])

  // Handle mouse move on screenshot
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mouseDownPos || !imageRef.current) return

    if (interactionMode === 'swipe') {
      const rect = imageRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setSwipePath(prev => [...prev, { x, y }])
    }
  }, [mouseDownPos, interactionMode])

  // Handle mouse up on screenshot
  const handleMouseUp = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mouseDownPos || !mouseDownTime || !imageRef.current) return

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    const rect = imageRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convert to device coordinates
    const scaleX = imageRef.current.naturalWidth / rect.width
    const scaleY = imageRef.current.naturalHeight / rect.height
    const deviceX = x * scaleX
    const deviceY = y * scaleY

    const duration = Date.now() - mouseDownTime
    const recorder = screenshotRecorderManager.getRecorder(device.id)

    if (!recorder) return

    // Determine action type
    if (interactionMode === 'swipe' && swipePath.length > 1) {
      // Swipe gesture
      const startEvent: ClickEvent = {
        x: mouseDownPos.x,
        y: mouseDownPos.y,
        actionType: 'swipeStart',
        timestamp: mouseDownTime
      }

      const endEvent: ClickEvent = {
        x: deviceX,
        y: deviceY,
        actionType: 'swipeEnd',
        timestamp: Date.now()
      }

      await recorder.handleScreenshotClick(startEvent)
      await recorder.handleScreenshotClick(endEvent)

    } else if (isLongPressActive || (interactionMode === 'longPress' && duration > 500)) {
      // Long press
      const clickEvent: ClickEvent = {
        x: deviceX,
        y: deviceY,
        actionType: 'longPress',
        timestamp: Date.now()
      }

      await recorder.handleScreenshotClick(clickEvent)

    } else {
      // Tap
      const clickEvent: ClickEvent = {
        x: deviceX,
        y: deviceY,
        actionType: 'tap',
        timestamp: Date.now()
      }

      await recorder.handleScreenshotClick(clickEvent)
    }

    // Reset state
    setMouseDownTime(null)
    setMouseDownPos(null)
    setSwipePath([])
    setIsLongPressActive(false)
  }, [mouseDownPos, mouseDownTime, device.id, interactionMode, swipePath, isLongPressActive])

  // Render screenshot with overlay
  const renderScreenshot = () => {
    if (!state?.screenshot) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400">
          <div className="text-center">
            <RefreshCw size={48} className="mx-auto mb-4 animate-spin" />
            <p>Loading device screenshot...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex-1 relative bg-gray-900 overflow-auto flex items-center justify-center">
        <div
          className="relative cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={`data:image/png;base64,${state.screenshot}`}
            alt="Device Screenshot"
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />

          {/* Swipe path visualization */}
          {swipePath.length > 1 && (
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ mixBlendMode: 'difference' }}
            >
              <polyline
                points={swipePath.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="cyan"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={swipePath[0].x} cy={swipePath[0].y} r="8" fill="cyan" />
              <circle
                cx={swipePath[swipePath.length - 1].x}
                cy={swipePath[swipePath.length - 1].y}
                r="8"
                fill="cyan"
              />
            </svg>
          )}

          {/* Long press indicator */}
          {isLongPressActive && mouseDownPos && (
            <div
              className="absolute w-16 h-16 rounded-full border-4 border-yellow-400 animate-ping pointer-events-none"
              style={{
                left: (mouseDownPos.x / (imageRef.current?.naturalWidth || 1)) * 100 + '%',
                top: (mouseDownPos.y / (imageRef.current?.naturalHeight || 1)) * 100 + '%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          )}
        </div>

        {/* Screenshot age indicator */}
        {state.lastUpdate > 0 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            Updated {Math.round((Date.now() - state.lastUpdate) / 1000)}s ago
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div>
          <h3 className="text-white font-medium">Screenshot Recording</h3>
          <p className="text-gray-400 text-xs mt-1">
            Click on elements in the screenshot below to record actions
          </p>
        </div>

        {!isRecording ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            <Play size={16} className="fill-current" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            <Square size={16} />
            Stop Recording
          </button>
        )}
      </div>

      {/* Interaction Mode Selector */}
      {isRecording && (
        <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">Interaction Mode:</span>

          <button
            onClick={() => setInteractionMode('tap')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
              interactionMode === 'tap'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <MousePointer size={14} />
            Tap
          </button>

          <button
            onClick={() => setInteractionMode('longPress')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
              interactionMode === 'longPress'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Hand size={14} />
            Long Press
          </button>

          <button
            onClick={() => setInteractionMode('swipe')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
              interactionMode === 'swipe'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Move size={14} />
            Swipe
          </button>
        </div>
      )}

      {/* Screenshot Display */}
      {isRecording ? (
        renderScreenshot()
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400">
          <div className="text-center max-w-md">
            <MousePointer size={48} className="mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Ready to Record</p>
            <p className="text-sm">
              Click "Start Recording" to begin. The device screenshot will appear here,
              and you can click on elements to record interactions.
            </p>
            <div className="mt-4 p-4 bg-gray-800 rounded text-left text-xs">
              <p className="font-medium mb-2">ℹ️ How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>Screenshots refresh every 1.5 seconds</li>
                <li>Click elements to record tap actions</li>
                <li>Hold for 0.5s for long press</li>
                <li>Drag to record swipe gestures</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScreenshotRecordingPanel
