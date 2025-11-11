import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AIJourneysMap, AIJourneyNode, MeaningfulElement } from '../types/journey'

interface AIJourneysState {
  journeys: AIJourneysMap

  // Actions
  getNode: (key: string) => AIJourneyNode | undefined
  addNode: (key: string, node: AIJourneyNode) => void
  updateNode: (key: string, updates: Partial<AIJourneyNode>) => void
  markElementVisited: (nodeKey: string, selector: string) => void
  addChildToNode: (parentKey: string, childKey: string) => void
  hasBeenScanned: (key: string) => boolean
  clearAll: () => void

  // Helper to generate node key
  generateKey: (url: string, actionLabel?: string) => string
}

export const useAIJourneysStore = create<AIJourneysState>()(
  persist(
    (set, get) => ({
      journeys: {},

      getNode: (key: string) => {
        return get().journeys[key]
      },

      addNode: (key: string, node: AIJourneyNode) => {
        console.log('🗺️ [AI JOURNEYS] Adding node:', key)
        set((state) => ({
          journeys: {
            ...state.journeys,
            [key]: node
          }
        }))
      },

      updateNode: (key: string, updates: Partial<AIJourneyNode>) => {
        console.log('🗺️ [AI JOURNEYS] Updating node:', key, updates)
        set((state) => {
          const existing = state.journeys[key]
          if (!existing) {
            console.warn('⚠️ [AI JOURNEYS] Node not found:', key)
            return state
          }

          return {
            journeys: {
              ...state.journeys,
              [key]: {
                ...existing,
                ...updates
              }
            }
          }
        })
      },

      markElementVisited: (nodeKey: string, selector: string) => {
        console.log('✅ [AI JOURNEYS] Marking element visited:', nodeKey, selector)
        set((state) => {
          const node = state.journeys[nodeKey]
          if (!node) return state

          const updatedElements = node.meaningfulElements.map(el =>
            el.selector === selector ? { ...el, visited: true } : el
          )

          return {
            journeys: {
              ...state.journeys,
              [nodeKey]: {
                ...node,
                meaningfulElements: updatedElements
              }
            }
          }
        })
      },

      addChildToNode: (parentKey: string, childKey: string) => {
        console.log('🔗 [AI JOURNEYS] Adding child:', parentKey, '→', childKey)
        set((state) => {
          const parent = state.journeys[parentKey]
          if (!parent) {
            console.warn('⚠️ [AI JOURNEYS] Parent node not found:', parentKey)
            return state
          }

          // Check if child already exists
          if (parent.children.includes(childKey)) {
            console.log('ℹ️ [AI JOURNEYS] Child already exists')
            return state
          }

          return {
            journeys: {
              ...state.journeys,
              [parentKey]: {
                ...parent,
                children: [...parent.children, childKey]
              }
            }
          }
        })
      },

      hasBeenScanned: (key: string) => {
        const node = get().journeys[key]
        return node !== undefined
      },

      clearAll: () => {
        console.log('🗑️ [AI JOURNEYS] Clearing all nodes')
        set({ journeys: {} })
      },

      generateKey: (url: string, actionLabel?: string) => {
        // Clean URL (remove query params and trailing slash)
        const cleanUrl = url.split('?')[0].replace(/\/$/, '')

        if (!actionLabel) {
          return `${cleanUrl}_default`
        }

        // Clean action label (remove whitespace, lowercase)
        const cleanLabel = actionLabel.toLowerCase().replace(/\s+/g, '')
        return `${cleanUrl}_${cleanLabel}`
      }
    }),
    {
      name: 'snaptest-ai-journeys-storage',
      partialize: (state) => ({
        journeys: state.journeys
      })
    }
  )
)
