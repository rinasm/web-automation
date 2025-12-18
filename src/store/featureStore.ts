import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Feature, PlatformType } from '../types/feature'
import { Step } from './stepStore'

interface FeatureState {
  features: Feature[]
  currentFeatureId: string | null

  // Feature CRUD operations
  createFeature: (projectId: string, name: string) => string
  deleteFeature: (featureId: string) => void
  updateFeature: (featureId: string, updates: Partial<Feature>) => void
  setCurrentFeature: (featureId: string | null) => void
  getFeatureById: (featureId: string) => Feature | undefined
  getFeaturesByProject: (projectId: string) => Feature[]

  // Step management within features
  addStepToFeature: (featureId: string, platform: PlatformType, step: Step) => void
  updateStepInFeature: (featureId: string, stepId: string, updates: Partial<Step>) => void
  deleteStepFromFeature: (featureId: string, stepId: string) => void
  reorderSteps: (featureId: string, platform: PlatformType, fromIndex: number, toIndex: number) => void

  // Bulk operations
  setStepsForFeature: (featureId: string, platform: PlatformType, steps: Step[]) => void
  clearAllFeatures: () => void
}

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      features: [],
      currentFeatureId: null,

      createFeature: (projectId: string, name: string) => {
        const newFeature: Feature = {
          id: crypto.randomUUID(),
          projectId,
          name,
          descriptionWeb: undefined,
          descriptionMobile: undefined,
          descriptionDesktop: undefined,
          stepsWeb: [],
          stepsMobile: [],
          stepsDesktop: [],
          status: 'draft',
          createdAt: Date.now(),
          lastEdited: Date.now()
        }

        set((state) => ({
          features: [...state.features, newFeature],
          currentFeatureId: newFeature.id
        }))

        return newFeature.id
      },

      deleteFeature: (featureId: string) => {
        set((state) => ({
          features: state.features.filter((f) => f.id !== featureId),
          currentFeatureId: state.currentFeatureId === featureId ? null : state.currentFeatureId
        }))
      },

      updateFeature: (featureId: string, updates: Partial<Feature>) => {
        set((state) => ({
          features: state.features.map((f) =>
            f.id === featureId
              ? { ...f, ...updates, lastEdited: Date.now() }
              : f
          )
        }))
      },

      setCurrentFeature: (featureId: string | null) => {
        set({ currentFeatureId: featureId })
      },

      getFeatureById: (featureId: string) => {
        return get().features.find((f) => f.id === featureId)
      },

      getFeaturesByProject: (projectId: string) => {
        return get().features.filter((f) => f.projectId === projectId)
      },

      addStepToFeature: (featureId: string, platform: PlatformType, step: Step) => {
        set((state) => ({
          features: state.features.map((f) => {
            if (f.id !== featureId) return f

            if (platform === 'web') {
              return {
                ...f,
                stepsWeb: [...f.stepsWeb, { ...step, order: f.stepsWeb.length }],
                lastEdited: Date.now()
              }
            } else if (platform === 'mobile') {
              return {
                ...f,
                stepsMobile: [...f.stepsMobile, { ...step, order: f.stepsMobile.length }],
                lastEdited: Date.now()
              }
            } else {
              return {
                ...f,
                stepsDesktop: [...f.stepsDesktop, { ...step, order: f.stepsDesktop.length }],
                lastEdited: Date.now()
              }
            }
          })
        }))
      },

      updateStepInFeature: (featureId: string, stepId: string, updates: Partial<Step>) => {
        set((state) => ({
          features: state.features.map((f) => {
            if (f.id !== featureId) return f

            return {
              ...f,
              stepsWeb: f.stepsWeb.map((s) =>
                s.id === stepId ? { ...s, ...updates } : s
              ),
              stepsMobile: f.stepsMobile.map((s) =>
                s.id === stepId ? { ...s, ...updates } : s
              ),
              stepsDesktop: f.stepsDesktop.map((s) =>
                s.id === stepId ? { ...s, ...updates } : s
              ),
              lastEdited: Date.now()
            }
          })
        }))
      },

      deleteStepFromFeature: (featureId: string, stepId: string) => {
        set((state) => ({
          features: state.features.map((f) => {
            if (f.id !== featureId) return f

            return {
              ...f,
              stepsWeb: f.stepsWeb.filter((s) => s.id !== stepId),
              stepsMobile: f.stepsMobile.filter((s) => s.id !== stepId),
              stepsDesktop: f.stepsDesktop.filter((s) => s.id !== stepId),
              lastEdited: Date.now()
            }
          })
        }))
      },

      reorderSteps: (featureId: string, platform: PlatformType, fromIndex: number, toIndex: number) => {
        set((state) => ({
          features: state.features.map((f) => {
            if (f.id !== featureId) return f

            const steps = platform === 'web' ? [...f.stepsWeb] : platform === 'mobile' ? [...f.stepsMobile] : [...f.stepsDesktop]
            const [removed] = steps.splice(fromIndex, 1)
            steps.splice(toIndex, 0, removed)

            // Update order property
            const reorderedSteps = steps.map((step, index) => ({ ...step, order: index }))

            if (platform === 'web') {
              return { ...f, stepsWeb: reorderedSteps, lastEdited: Date.now() }
            } else if (platform === 'mobile') {
              return { ...f, stepsMobile: reorderedSteps, lastEdited: Date.now() }
            } else {
              return { ...f, stepsDesktop: reorderedSteps, lastEdited: Date.now() }
            }
          })
        }))
      },

      setStepsForFeature: (featureId: string, platform: PlatformType, steps: Step[]) => {
        set((state) => ({
          features: state.features.map((f) => {
            if (f.id !== featureId) return f

            const orderedSteps = steps.map((step, index) => ({ ...step, order: index }))

            if (platform === 'web') {
              return { ...f, stepsWeb: orderedSteps, lastEdited: Date.now() }
            } else if (platform === 'mobile') {
              return { ...f, stepsMobile: orderedSteps, lastEdited: Date.now() }
            } else {
              return { ...f, stepsDesktop: orderedSteps, lastEdited: Date.now() }
            }
          })
        }))
      },

      clearAllFeatures: () => {
        set({ features: [], currentFeatureId: null })
      }
    }),
    {
      name: 'snaptest-feature-storage',
      partialize: (state) => ({
        features: state.features,
        // Don't persist currentFeatureId
      })
    }
  )
)
