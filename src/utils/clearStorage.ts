/**
 * Storage Clearing Utility
 *
 * Safely clears all localStorage data for fresh start
 */

export function clearAllStorage(): void {
  console.log('🗑️ [STORAGE] Clearing all localStorage data...')

  // List all keys before clearing
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      keys.push(key)
    }
  }

  console.log('📋 [STORAGE] Found keys:', keys)

  // Clear everything
  localStorage.clear()

  console.log('✅ [STORAGE] All localStorage cleared successfully')
  console.log('🔄 [STORAGE] Please refresh the page to start fresh')
}

// Auto-execute on import (for one-time clearing)
if (typeof window !== 'undefined') {
  // Check if we should auto-clear
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('clearStorage') === 'true') {
    clearAllStorage()
    // Remove the query parameter and reload
    window.history.replaceState({}, document.title, window.location.pathname)
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }
}
