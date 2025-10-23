import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ActionType = 'click' | 'type' | 'hover' | 'wait' | 'assert'

export interface Action {
  id: string
  type: ActionType
  selector: string
  value?: string
  description?: string
}

export interface Step {
  id: string
  name: string
  actions: Action[]
  createdAt: number
}

interface StepState {
  steps: Step[]
  currentStepId: string | null
  currentUrl: string
  isCapturingSelector: boolean
  capturingActionId: string | null
  hoveringActionId: string | null
  executeStepCallback: ((actions: Action[]) => Promise<void>) | null

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
  setExecuteStepCallback: (callback: ((actions: Action[]) => Promise<void>) | null) => void
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

  createStep: (name: string) => {
    const newStep: Step = {
      id: crypto.randomUUID(),
      name,
      actions: [],
      createdAt: Date.now(),
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

  setExecuteStepCallback: (callback: ((actions: Action[]) => Promise<void>) | null) => {
    set({ executeStepCallback: callback })
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
