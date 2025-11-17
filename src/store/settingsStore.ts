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

  // URL Configuration
  mobileAppUrl: string
  webUrl: string

  // Actions
  setAdvancedMode: (enabled: boolean) => void
  toggleAdvancedMode: () => void
  setMobileAppUrl: (url: string) => void
  setWebUrl: (url: string) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS = {
  advancedMode: false,
  mobileAppUrl: '',
  webUrl: ''
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      advancedMode: DEFAULT_SETTINGS.advancedMode,
      mobileAppUrl: DEFAULT_SETTINGS.mobileAppUrl,
      webUrl: DEFAULT_SETTINGS.webUrl,

      // Actions
      setAdvancedMode: (enabled: boolean) =>
        set({ advancedMode: enabled }),

      toggleAdvancedMode: () =>
        set((state) => ({ advancedMode: !state.advancedMode })),

      setMobileAppUrl: (url: string) =>
        set({ mobileAppUrl: url }),

      setWebUrl: (url: string) =>
        set({ webUrl: url }),

      resetSettings: () =>
        set(DEFAULT_SETTINGS)
    }),
    {
      name: 'settings-storage',
      version: 3,
      migrate: (persistedState: any, version: number) => {
        // Migrate from older versions
        if (version < 3) {
          // Version 3 adds mobileAppUrl and webUrl
          return {
            ...persistedState,
            mobileAppUrl: persistedState.mobileAppUrl || '',
            webUrl: persistedState.webUrl || ''
          }
        }
        return persistedState
      }
    }
  )
)
