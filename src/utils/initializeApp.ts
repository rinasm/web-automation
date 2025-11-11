/**
 * Application Initialization
 *
 * Handles app startup, storage initialization, and version management
 */

import { setDataVersion, initializeVersion, getDataVersion } from './dataVersion'

export function initializeApp(): void {
  console.log('🚀 [APP] Initializing application...')

  // Initialize version tracking
  initializeVersion()

  const currentVersion = getDataVersion()

  // If no version set (fresh install or cleared storage), set to V2
  if (currentVersion === 1 || !localStorage.getItem('snaptest-data-version')) {
    console.log('📊 [APP] Setting data version to V2 (fresh start)')
    setDataVersion(2)

    // Clear any old V1 data
    const keysToRemove = [
      'snaptest-flow-storage',
      'snaptest-journey-storage',
      'snaptest-ai-journeys-storage'
    ]

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key)
        console.log(`🗑️ [APP] Removed legacy key: ${key}`)
      }
    })
  }

  console.log('✅ [APP] Application initialized successfully')
  console.log('📊 [APP] Data version:', getDataVersion())
}
