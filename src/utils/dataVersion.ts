/**
 * Data Version Management
 *
 * Tracks the version of data stored in localStorage
 * Used by migration utilities to determine when migrations are needed
 */

const VERSION_KEY = 'snaptest-data-version'

/**
 * Current data schema version
 *
 * Version History:
 * - v1: Original flow-based architecture (projects, flows, steps)
 * - v2: Feature-based architecture (projects, features with platform-specific steps)
 */
export const CURRENT_VERSION = 2

/**
 * Get current data version from localStorage
 */
export function getDataVersion(): number {
  try {
    const version = localStorage.getItem(VERSION_KEY)
    if (!version) {
      // No version means V1 (original implementation didn't track versions)
      return 1
    }
    return parseInt(version, 10)
  } catch (error) {
    console.error('Failed to get data version:', error)
    return 1  // Default to V1 on error
  }
}

/**
 * Set data version in localStorage
 */
export function setDataVersion(version: number): void {
  try {
    localStorage.setItem(VERSION_KEY, version.toString())
    console.log('✅ [VERSION] Data version set to:', version)
  } catch (error) {
    console.error('❌ [VERSION] Failed to set data version:', error)
  }
}

/**
 * Check if data is at current version
 */
export function isCurrentVersion(): boolean {
  return getDataVersion() === CURRENT_VERSION
}

/**
 * Check if data version is compatible with current code
 */
export function isCompatibleVersion(): boolean {
  const currentVersion = getDataVersion()
  // We support reading V1 and V2 data
  return currentVersion >= 1 && currentVersion <= CURRENT_VERSION
}

/**
 * Get version information
 */
export function getVersionInfo(): {
  current: number
  target: number
  isUpToDate: boolean
  isCompatible: boolean
  needsUpgrade: boolean
} {
  const current = getDataVersion()

  return {
    current,
    target: CURRENT_VERSION,
    isUpToDate: current === CURRENT_VERSION,
    isCompatible: isCompatibleVersion(),
    needsUpgrade: current < CURRENT_VERSION
  }
}

/**
 * Initialize version tracking (called on app startup)
 */
export function initializeVersion(): void {
  const currentVersion = getDataVersion()

  if (currentVersion === 1) {
    console.log('📊 [VERSION] Detected V1 data - migration available')
  } else if (currentVersion === CURRENT_VERSION) {
    console.log('✅ [VERSION] Data is at current version:', CURRENT_VERSION)
  } else if (currentVersion > CURRENT_VERSION) {
    console.warn('⚠️ [VERSION] Data version is newer than code version - possible compatibility issues')
  }
}
