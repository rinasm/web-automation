import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Recording Store
 *
 * Manages mobile flow recording state and captured events
 */

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'processing'

export type GestureType = 'tap' | 'longPress' | 'doubleTap' | 'swipe' | 'scroll' | 'pinch' | 'type'

export type SwipeDirection = 'up' | 'down' | 'left' | 'right'

/**
 * Raw touch event captured from device
 */
export interface RawTouchEvent {
  id: string
  timestamp: number
  type: 'touchStart' | 'touchMove' | 'touchEnd'
  x: number
  y: number
  pressure?: number
  pointerCount?: number
}

/**
 * Element information at touch point
 */
export interface ElementInfo {
  xpath?: string
  accessibilityId?: string
  resourceId?: string
  className?: string
  text?: string
  contentDescription?: string
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  attributes?: Record<string, any>
  isClickable?: boolean
  isScrollable?: boolean
  isEditable?: boolean
}

/**
 * Recorded event (processed from raw touch events)
 */
export interface RecordedEvent {
  id: string
  timestamp: number
  gestureType: GestureType
  element?: ElementInfo
  coordinates: {
    x: number
    y: number
  }
  swipeDirection?: SwipeDirection
  swipeDistance?: number
  duration?: number
  value?: string // For type events
  description?: string
  screenshot?: string
}

/**
 * Recording session metadata
 */
export interface RecordingSession {
  id: string
  name: string
  deviceId: string
  deviceName: string
  platform: 'ios' | 'android'
  startTime: number
  endTime?: number
  duration?: number
  events: RecordedEvent[]
  status: 'active' | 'completed' | 'failed'
}

/**
 * Recorded flow (saved session that can be replayed)
 */
export interface RecordedFlow {
  id: string
  name: string
  description?: string
  deviceId: string
  deviceName: string
  platform: 'ios' | 'android'
  createdAt: number
  updatedAt: number
  events: RecordedEvent[]
  tags?: string[]
  favorite?: boolean
}

interface RecordingState {
  // Current recording session
  status: RecordingStatus
  currentSession: RecordingSession | null
  rawEvents: RawTouchEvent[]
  processedEvents: RecordedEvent[]

  // Saved recorded flows
  recordedFlows: RecordedFlow[]
  currentFlowId: string | null

  // UI state
  showEventFeed: boolean
  autoSave: boolean

  // Actions - Recording control
  startRecording: (deviceId: string, deviceName: string, platform: 'ios' | 'android') => void
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => RecordingSession | null
  cancelRecording: () => void

  // Actions - Event capture
  captureRawEvent: (event: RawTouchEvent) => void
  addProcessedEvent: (event: RecordedEvent) => void
  addSDKEvent: (sdkEvent: any) => void // Add event from SDK WebSocket
  clearEvents: () => void
  removeEvent: (eventId: string) => void
  updateEvent: (eventId: string, updates: Partial<RecordedEvent>) => void

  // Actions - Flow management
  saveRecordedFlow: (session: RecordingSession, name: string, description?: string) => RecordedFlow
  deleteRecordedFlow: (flowId: string) => void
  updateRecordedFlow: (flowId: string, updates: Partial<RecordedFlow>) => void
  setCurrentFlow: (flowId: string | null) => void
  duplicateFlow: (flowId: string) => RecordedFlow | null
  exportFlow: (flowId: string) => string

  // Actions - UI
  setShowEventFeed: (show: boolean) => void
  setAutoSave: (autoSave: boolean) => void

  // Helpers
  getCurrentSession: () => RecordingSession | null
  getCurrentFlow: () => RecordedFlow | null
  getFlowsByDevice: (deviceId: string) => RecordedFlow[]
  getFlowsByPlatform: (platform: 'ios' | 'android') => RecordedFlow[]
  getEventCount: () => number
}

export const useRecordingStore = create<RecordingState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: 'idle',
      currentSession: null,
      rawEvents: [],
      processedEvents: [],
      recordedFlows: [],
      currentFlowId: null,
      showEventFeed: true,
      autoSave: false,

      // Recording control
      startRecording: (deviceId: string, deviceName: string, platform: 'ios' | 'android') => {
        console.log(`🎬 [RECORDING] Starting recording on ${deviceName}`)

        const session: RecordingSession = {
          id: `session-${Date.now()}`,
          name: `Recording ${new Date().toLocaleString()}`,
          deviceId,
          deviceName,
          platform,
          startTime: Date.now(),
          events: [],
          status: 'active'
        }

        set({
          status: 'recording',
          currentSession: session,
          rawEvents: [],
          processedEvents: []
        })
      },

      pauseRecording: () => {
        console.log('🎬 [RECORDING] Pausing recording')
        set({ status: 'paused' })
      },

      resumeRecording: () => {
        console.log('🎬 [RECORDING] Resuming recording')
        set({ status: 'recording' })
      },

      stopRecording: () => {
        console.log('🎬 [RECORDING] Stopping recording')

        const session = get().currentSession
        if (!session) {
          console.warn('🎬 [RECORDING] No active session to stop')
          return null
        }

        const endTime = Date.now()
        const completedSession: RecordingSession = {
          ...session,
          endTime,
          duration: endTime - session.startTime,
          events: get().processedEvents,
          status: 'completed'
        }

        console.log(`🎬 [RECORDING] Session completed: ${completedSession.events.length} events captured`)

        // Auto-save if enabled
        if (get().autoSave) {
          get().saveRecordedFlow(completedSession, completedSession.name)
        }

        set({
          status: 'idle',
          currentSession: completedSession
        })

        return completedSession
      },

      cancelRecording: () => {
        console.log('🎬 [RECORDING] Canceling recording')

        set({
          status: 'idle',
          currentSession: null,
          rawEvents: [],
          processedEvents: []
        })
      },

      // Event capture
      captureRawEvent: (event: RawTouchEvent) => {
        const state = get()
        if (state.status !== 'recording') {
          return
        }

        set({
          rawEvents: [...state.rawEvents, event]
        })
      },

      addProcessedEvent: (event: RecordedEvent) => {
        const state = get()
        if (state.status !== 'recording') {
          console.warn('🎬 [RECORDING] Cannot add event: not recording')
          return
        }

        console.log(`🎬 [RECORDING] Event captured: ${event.gestureType} at (${event.coordinates.x}, ${event.coordinates.y})`)

        set({
          processedEvents: [...state.processedEvents, event]
        })
      },

      addSDKEvent: (sdkEvent: any) => {
        const state = get()
        if (state.status !== 'recording') {
          console.warn('🎬 [RECORDING] Cannot add SDK event: not recording')
          return
        }

        console.log(`📱 [SDK] Event received: ${sdkEvent.gestureType} at (${sdkEvent.coordinates.x}, ${sdkEvent.coordinates.y})`)

        // Convert SDK event to RecordedEvent format
        const recordedEvent: RecordedEvent = {
          id: `sdk-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: sdkEvent.timestamp || Date.now(),
          gestureType: sdkEvent.gestureType as GestureType,
          coordinates: {
            x: sdkEvent.coordinates.x,
            y: sdkEvent.coordinates.y
          },
          element: sdkEvent.element ? {
            xpath: sdkEvent.element.xpath,
            accessibilityId: sdkEvent.element.accessibilityIdentifier,
            className: sdkEvent.element.className,
            text: sdkEvent.element.text || sdkEvent.element.accessibilityLabel,
            bounds: sdkEvent.element.bounds,
            isClickable: sdkEvent.element.isClickable,
            isEditable: sdkEvent.element.isEditable
          } : undefined,
          swipeDirection: sdkEvent.swipeDirection,
          duration: sdkEvent.duration,
          value: sdkEvent.value,
          description: sdkEvent.gestureType === 'tap'
            ? `Tap on ${sdkEvent.element?.text || sdkEvent.element?.accessibilityLabel || 'element'}`
            : sdkEvent.gestureType === 'longPress'
            ? `Long press on ${sdkEvent.element?.text || sdkEvent.element?.accessibilityLabel || 'element'}`
            : sdkEvent.gestureType === 'swipe'
            ? `Swipe ${sdkEvent.swipeDirection || 'unknown direction'}`
            : sdkEvent.gestureType === 'type'
            ? `Type "${sdkEvent.value}"`
            : `${sdkEvent.gestureType}`
        }

        set({
          processedEvents: [...state.processedEvents, recordedEvent]
        })
      },

      clearEvents: () => {
        set({
          rawEvents: [],
          processedEvents: []
        })
      },

      removeEvent: (eventId: string) => {
        set((state) => ({
          processedEvents: state.processedEvents.filter(e => e.id !== eventId)
        }))
      },

      updateEvent: (eventId: string, updates: Partial<RecordedEvent>) => {
        set((state) => ({
          processedEvents: state.processedEvents.map(e =>
            e.id === eventId ? { ...e, ...updates } : e
          )
        }))
      },

      // Flow management
      saveRecordedFlow: (session: RecordingSession, name: string, description?: string) => {
        console.log(`🎬 [RECORDING] Saving flow: ${name}`)

        const flow: RecordedFlow = {
          id: `flow-${Date.now()}`,
          name,
          description,
          deviceId: session.deviceId,
          deviceName: session.deviceName,
          platform: session.platform,
          createdAt: session.startTime,
          updatedAt: Date.now(),
          events: session.events,
          tags: [],
          favorite: false
        }

        set((state) => ({
          recordedFlows: [...state.recordedFlows, flow],
          currentFlowId: flow.id
        }))

        return flow
      },

      deleteRecordedFlow: (flowId: string) => {
        console.log(`🎬 [RECORDING] Deleting flow: ${flowId}`)

        set((state) => ({
          recordedFlows: state.recordedFlows.filter(f => f.id !== flowId),
          currentFlowId: state.currentFlowId === flowId ? null : state.currentFlowId
        }))
      },

      updateRecordedFlow: (flowId: string, updates: Partial<RecordedFlow>) => {
        set((state) => ({
          recordedFlows: state.recordedFlows.map(f =>
            f.id === flowId ? { ...f, ...updates, updatedAt: Date.now() } : f
          )
        }))
      },

      setCurrentFlow: (flowId: string | null) => {
        set({ currentFlowId: flowId })
      },

      duplicateFlow: (flowId: string) => {
        const flow = get().recordedFlows.find(f => f.id === flowId)
        if (!flow) {
          console.warn(`🎬 [RECORDING] Flow not found: ${flowId}`)
          return null
        }

        const duplicatedFlow: RecordedFlow = {
          ...flow,
          id: `flow-${Date.now()}`,
          name: `${flow.name} (Copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set((state) => ({
          recordedFlows: [...state.recordedFlows, duplicatedFlow]
        }))

        return duplicatedFlow
      },

      exportFlow: (flowId: string) => {
        const flow = get().recordedFlows.find(f => f.id === flowId)
        if (!flow) {
          throw new Error(`Flow not found: ${flowId}`)
        }

        return JSON.stringify(flow, null, 2)
      },

      // UI
      setShowEventFeed: (show: boolean) => {
        set({ showEventFeed: show })
      },

      setAutoSave: (autoSave: boolean) => {
        set({ autoSave })
      },

      // Helpers
      getCurrentSession: () => {
        return get().currentSession
      },

      getCurrentFlow: () => {
        const flowId = get().currentFlowId
        if (!flowId) return null
        return get().recordedFlows.find(f => f.id === flowId) || null
      },

      getFlowsByDevice: (deviceId: string) => {
        return get().recordedFlows.filter(f => f.deviceId === deviceId)
      },

      getFlowsByPlatform: (platform: 'ios' | 'android') => {
        return get().recordedFlows.filter(f => f.platform === platform)
      },

      getEventCount: () => {
        return get().processedEvents.length
      }
    }),
    {
      name: 'recording-storage',
      partialize: (state) => ({
        // Only persist recorded flows and settings (not active session)
        recordedFlows: state.recordedFlows,
        currentFlowId: state.currentFlowId,
        showEventFeed: state.showEventFeed,
        autoSave: state.autoSave
      })
    }
  )
)
