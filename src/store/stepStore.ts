import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PlatformType } from '../types/feature'

export type ActionType = 'click' | 'type' | 'hover' | 'wait' | 'assert'

export interface Action {
  id: string
  type: ActionType
  selector: string
  value?: string
  description?: string
  isPassword?: boolean  // Track if this is a password field
}

export interface RecordedEvent {
  id: string
  type: 'click' | 'input' | 'change' | 'keydown' | 'keyup' | 'submit'
  selector: string
  value?: string
  timestamp: number
  tagName?: string
  inputType?: string
}

export interface Step {
  id: string
  name: string
  actions: Action[]
  createdAt: number
  order: number
  featureId?: string  // Optional for backward compatibility
  platform?: PlatformType  // Optional for backward compatibility
  // Legacy fields for backward compatibility - will be migrated
  flowId?: string
}

interface StepState {
  steps: Step[]
  currentStepId: string | null
  currentUrl: string
  isCapturingSelector: boolean
  capturingActionId: string | null
  hoveringActionId: string | null
  executeStepCallback: ((actions: Action[], stepName?: string) => Promise<void>) | null
  selfHealingStatusCallback: ((isSelfHealing: boolean) => void) | null

  // Recording state
  isRecording: boolean
  recordedEvents: RecordedEvent[]

  // Actions
  createStep: (name: string) => void
  deleteStep: (stepId: string) => void
  setCurrentStep: (stepId: string) => void
  addAction: (stepId: string, action: Omit<Action, 'id'>) => void
  updateAction: (stepId: string, actionId: string, updates: Partial<Action>) => void
  deleteAction: (stepId: string, actionId: string) => void
  setCurrentUrl: (url: string) => void
  startCapturingSelector: (actionId: string) => void
  stopCapturingSelector: () => void
  setActionSelector: (stepId: string, actionId: string, selector: string) => void
  setHoveringAction: (actionId: string | null) => void
  setExecuteStepCallback: (callback: ((actions: Action[], stepName?: string) => Promise<void>) | null) => void
  setSelfHealingStatusCallback: (callback: ((isSelfHealing: boolean) => void) | null) => void

  // Recording actions
  startRecording: () => void
  stopRecording: () => void
  addRecordedEvent: (event: Omit<RecordedEvent, 'id' | 'timestamp'>) => void
  convertRecordedEventsToActions: (stepId: string) => void
  clearRecordedEvents: () => void
}

export const useStepStore = create<StepState>()(
  persist(
    (set, get) => ({
      steps: [],
      currentStepId: null,
      currentUrl: '',
      isCapturingSelector: false,
      capturingActionId: null,
      hoveringActionId: null,
      executeStepCallback: null,
      selfHealingStatusCallback: null,

      // Recording state
      isRecording: false,
      recordedEvents: [],

  createStep: (name: string) => {
    const newStep: Step = {
      id: crypto.randomUUID(),
      name,
      actions: [],
      createdAt: Date.now(),
      order: 0,  // Will be set properly when added to a feature
    }
    set((state) => ({
      steps: [...state.steps, newStep],
      currentStepId: newStep.id,
    }))
  },

  deleteStep: (stepId: string) => {
    set((state) => ({
      steps: state.steps.filter((f) => f.id !== stepId),
      currentStepId:
        state.currentStepId === stepId ? null : state.currentStepId,
    }))
  },

  setCurrentStep: (stepId: string) => {
    set({ currentStepId: stepId })
  },

  addAction: (stepId: string, action: Omit<Action, 'id'>) => {
    const newAction: Action = {
      ...action,
      id: crypto.randomUUID(),
    }
    set((state) => ({
      steps: state.steps.map((step) =>
        step.id === stepId
          ? { ...step, actions: [...step.actions, newAction] }
          : step
      ),
    }))
  },

  updateAction: (stepId: string, actionId: string, updates: Partial<Action>) => {
    set((state) => ({
      steps: state.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              actions: step.actions.map((action) =>
                action.id === actionId ? { ...action, ...updates } : action
              ),
            }
          : step
      ),
    }))
  },

  deleteAction: (stepId: string, actionId: string) => {
    set((state) => ({
      steps: state.steps.map((step) =>
        step.id === stepId
          ? { ...step, actions: step.actions.filter((s) => s.id !== actionId) }
          : step
      ),
    }))
  },

  setCurrentUrl: (url: string) => {
    set({ currentUrl: url })
  },

  startCapturingSelector: (actionId: string) => {
    set({ isCapturingSelector: true, capturingActionId: actionId })
  },

  stopCapturingSelector: () => {
    set({ isCapturingSelector: false, capturingActionId: null })
  },

  setActionSelector: (stepId: string, actionId: string, selector: string) => {
    get().updateAction(stepId, actionId, { selector })
    get().stopCapturingSelector()
  },

  setHoveringAction: (actionId: string | null) => {
    set({ hoveringActionId: actionId })
  },

  setExecuteStepCallback: (callback: ((actions: Action[], stepName?: string) => Promise<void>) | null) => {
    set({ executeStepCallback: callback })
  },

  setSelfHealingStatusCallback: (callback: ((isSelfHealing: boolean) => void) | null) => {
    set({ selfHealingStatusCallback: callback })
  },

  // Recording actions
  startRecording: () => {
    set({ isRecording: true, recordedEvents: [] })
  },

  stopRecording: () => {
    set({ isRecording: false })
  },

  addRecordedEvent: (event: Omit<RecordedEvent, 'id' | 'timestamp'>) => {
    const newEvent: RecordedEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    set((state) => ({
      recordedEvents: [...state.recordedEvents, newEvent],
    }))
  },

  convertRecordedEventsToActions: (stepId: string) => {
    const { recordedEvents } = get()

    // Group events by selector to find the last input value for each field
    const inputValueMap = new Map<string, string>()
    const inputTypeMap = new Map<string, string>()
    const processedSelectors = new Set<string>()
    const actions: Omit<Action, 'id'>[] = []

    // First pass: collect the last input value and type for each selector
    recordedEvents.forEach((event) => {
      if (event.type === 'input' || event.type === 'change') {
        inputValueMap.set(event.selector, event.value || '')
        if (event.inputType) {
          inputTypeMap.set(event.selector, event.inputType)
        }
      }
    })

    // Second pass: create actions, keeping only the last input/change event per selector
    recordedEvents.forEach((event, index) => {
      let actionType: ActionType
      let value: string | undefined
      let isPassword = false

      switch (event.type) {
        case 'click':
          actionType = 'click'
          break
        case 'input':
        case 'change':
          // Skip if we've already processed this selector
          if (processedSelectors.has(event.selector)) {
            return
          }

          // Check if there are more input/change events for this selector later
          const hasLaterInput = recordedEvents.slice(index + 1).some(
            (e) => (e.type === 'input' || e.type === 'change') && e.selector === event.selector
          )

          if (hasLaterInput) {
            return // Skip this event, we'll use the later one
          }

          // This is the last input/change event for this selector
          actionType = 'type'
          value = inputValueMap.get(event.selector) || event.value

          // Check if this is a password field
          const inputType = inputTypeMap.get(event.selector) || event.inputType
          isPassword = inputType === 'password'

          // If it's a password, store a placeholder instead of actual value
          if (isPassword && value) {
            value = '********'  // Placeholder for security
          }

          processedSelectors.add(event.selector)
          break
        default:
          return // Skip unsupported event types
      }

      actions.push({
        type: actionType,
        selector: event.selector,
        value,
        description: `Recorded ${event.type} on ${event.tagName || 'element'}`,
        isPassword,
      })
    })

    // Add actions to the step
    actions.forEach((action) => {
      get().addAction(stepId, action)
    })

    // Clear recorded events
    set({ recordedEvents: [] })
  },

  clearRecordedEvents: () => {
    set({ recordedEvents: [] })
  },
}),
    {
      name: 'snaptest-step-storage',
      partialize: (state) => ({
        steps: state.steps,
        currentStepId: state.currentStepId,
        currentUrl: state.currentUrl,
        // Don't persist runtime state
        // isCapturingSelector, capturingActionId, hoveringActionId, executeStepCallback
      }),
    }
  )
)
