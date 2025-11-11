/**
 * Settings Store
 *
 * Global application settings including advanced mode toggle
 * Persisted to localStorage
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SettingsState {
  // UI Settings
  advancedMode: boolean

  // Actions
  setAdvancedMode: (enabled: boolean) => void
  toggleAdvancedMode: () => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS = {
  advancedMode: false
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      advancedMode: DEFAULT_SETTINGS.advancedMode,

      // Actions
      setAdvancedMode: (enabled: boolean) =>
        set({ advancedMode: enabled }),

      toggleAdvancedMode: () =>
        set((state) => ({ advancedMode: !state.advancedMode })),

      resetSettings: () =>
        set(DEFAULT_SETTINGS)
    }),
    {
      name: 'settings-storage',
      version: 2
    }
  )
)
