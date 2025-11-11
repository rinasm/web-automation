import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ExploredJourney } from '../types/journey'

interface JourneyState {
  exploredJourneys: ExploredJourney[]
  selectedJourneyId: string | null

  // Actions
  addJourney: (journey: ExploredJourney) => void
  updateJourney: (journeyId: string, updates: Partial<ExploredJourney>) => void
  deleteJourney: (journeyId: string) => void
  setSelectedJourney: (journeyId: string | null) => void
  clearAllJourneys: () => void
  getJourneyById: (journeyId: string) => ExploredJourney | undefined

  // Check if similar journey already exists
  hasSimilarJourney: (journey: ExploredJourney) => boolean
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      exploredJourneys: [],
      selectedJourneyId: null,

      // Clear all journeys (useful for recovery from corrupted state)
      clearAllJourneys: () => {
        console.log('🗑️ [STORE] Clearing all journeys')
        set({ exploredJourneys: [], selectedJourneyId: null })
      },

      addJourney: (journey: ExploredJourney) => {
        console.log('📦 [STORE] addJourney called with:', {
          id: journey.id,
          name: journey.name,
          status: journey.status,
          steps: journey.steps?.length || 0
        })

        const currentJourneys = get().exploredJourneys
        console.log('📦 [STORE] Current journeys count before add:', currentJourneys.length)

        // Check if journey with this ID already exists
        const alreadyExists = currentJourneys.some(j => j.id === journey.id)
        if (alreadyExists) {
          console.warn('⚠️ [STORE] Journey with ID', journey.id, 'already exists. Skipping duplicate.')
          return
        }

        set((state) => {
          const newJourneys = [...state.exploredJourneys, journey]
          console.log('📦 [STORE] New journeys count after add:', newJourneys.length)
          console.log('📦 [STORE] All journey IDs:', newJourneys.map(j => j.id))
          return {
            exploredJourneys: newJourneys
          }
        })

        // Verify the state was updated
        setTimeout(() => {
          const currentJourneys = get().exploredJourneys
          console.log('📦 [STORE] Verified journeys count after state update:', currentJourneys.length)
          console.log('📦 [STORE] Was the journey added?', currentJourneys.some(j => j.id === journey.id) ? 'YES' : 'NO')

          // Check localStorage
          const stored = localStorage.getItem('snaptest-journey-storage')
          if (stored) {
            const parsed = JSON.parse(stored)
            console.log('💾 [STORE] localStorage journeys count:', parsed.state?.exploredJourneys?.length || 0)
          } else {
            console.log('💾 [STORE] No data in localStorage yet')
          }
        }, 100)
      },

      updateJourney: (journeyId: string, updates: Partial<ExploredJourney>) => {
        set((state) => ({
          exploredJourneys: state.exploredJourneys.map((j) =>
            j.id === journeyId ? { ...j, ...updates } : j
          )
        }))
      },

      deleteJourney: (journeyId: string) => {
        set((state) => ({
          exploredJourneys: state.exploredJourneys.filter((j) => j.id !== journeyId),
          selectedJourneyId: state.selectedJourneyId === journeyId ? null : state.selectedJourneyId
        }))
      },

      setSelectedJourney: (journeyId: string | null) => {
        set({ selectedJourneyId: journeyId })
      },

      getJourneyById: (journeyId: string) => {
        return get().exploredJourneys.find((j) => j.id === journeyId)
      },

      hasSimilarJourney: (journey: ExploredJourney) => {
        const existing = get().exploredJourneys

        // Check if a journey with same name and similar steps already exists
        return existing.some((existingJourney) => {
          // Same name
          if (existingJourney.name !== journey.name) return false

          // Similar number of steps (within 1 step difference)
          const stepDiff = Math.abs(existingJourney.steps.length - journey.steps.length)
          if (stepDiff > 1) return false

          // Check if paths are similar (same URLs in sequence)
          const existingUrls = existingJourney.path.map(node => node.pageContext.url)
          const newUrls = journey.path.map(node => node.pageContext.url)

          if (existingUrls.length !== newUrls.length) return false

          // Check if at least 80% of URLs match
          const matches = existingUrls.filter((url, index) => url === newUrls[index])
          const similarity = matches.length / existingUrls.length

          return similarity >= 0.8
        })
      }
    }),
    {
      name: 'snaptest-journey-storage',
      partialize: (state) => ({
        exploredJourneys: state.exploredJourneys,
        // Don't persist selectedJourneyId
      })
    }
  )
)
