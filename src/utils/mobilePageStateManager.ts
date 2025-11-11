/**
 * Mobile Page State Manager
 *
 * Handles page transitions, loading states, and navigation events for mobile devices.
 * Works with CDP (Android) and WebKit (iOS) connections.
 */

import { MobileDevice, AndroidDevice, IOSDevice } from '../types/mobileDevice'
import { cdpConnectionManager, CDPConnection } from './cdpConnection'
import { webkitConnectionManager } from './webkitConnection'

/**
 * Page load state
 */
export type PageLoadState =
  | 'idle'
  | 'loading'
  | 'interactive'
  | 'complete'
  | 'error'

/**
 * Page navigation event
 */
export interface PageNavigationEvent {
  url: string
  timestamp: number
  loadState: PageLoadState
  loadTime?: number
  errorMessage?: string
}

/**
 * Page state listener callback
 */
export type PageStateListener = (event: PageNavigationEvent) => void

/**
 * Mobile Page State Manager Class
 *
 * Monitors and manages page loading states for mobile devices
 */
export class MobilePageStateManager {
  private device: MobileDevice
  private currentState: PageLoadState = 'idle'
  private currentUrl: string = ''
  private navigationStartTime: number = 0
  private listeners: Set<PageStateListener> = new Set()
  private eventHistory: PageNavigationEvent[] = []
  private maxHistorySize: number = 50

  // CDP event listeners for cleanup
  private cdpListeners: Map<string, Function> = new Map()

  constructor(device: MobileDevice) {
    this.device = device
  }

  /**
   * Initialize page state monitoring
   */
  async initialize(): Promise<void> {
    console.log(`📱 [PageStateManager] Initializing for ${this.device.name}`)

    if (this.device.os === 'android') {
      await this.initializeCDPMonitoring()
    } else {
      await this.initializeWebKitMonitoring()
    }
  }

  /**
   * Initialize CDP monitoring (Android)
   */
  private async initializeCDPMonitoring(): Promise<void> {
    const connection = cdpConnectionManager.getConnection(this.device.id)

    if (!connection) {
      throw new Error('CDP connection not found')
    }

    // Listen to Page lifecycle events
    const loadEventFiredHandler = () => {
      this.handleLoadComplete()
    }

    const frameStartedLoadingHandler = (params: any) => {
      if (params.frameId === connection.frameId) {
        this.handleNavigationStart(params.url || this.currentUrl)
      }
    }

    const frameNavigatedHandler = (params: any) => {
      if (params.frame.id === connection.frameId) {
        this.currentUrl = params.frame.url
        this.handleNavigationComplete(params.frame.url)
      }
    }

    const frameStoppedLoadingHandler = (params: any) => {
      if (params.frameId === connection.frameId) {
        this.handleLoadComplete()
      }
    }

    const loadingFailedHandler = (params: any) => {
      this.handleLoadError(params.errorText || 'Unknown error')
    }

    // Register listeners
    connection.client.Page.loadEventFired(loadEventFiredHandler)
    connection.client.Page.frameStartedLoading(frameStartedLoadingHandler)
    connection.client.Page.frameNavigated(frameNavigatedHandler)
    connection.client.Page.frameStoppedLoading(frameStoppedLoadingHandler)
    connection.client.Network.loadingFailed(loadingFailedHandler)

    // Store for cleanup
    this.cdpListeners.set('loadEventFired', loadEventFiredHandler)
    this.cdpListeners.set('frameStartedLoading', frameStartedLoadingHandler)
    this.cdpListeners.set('frameNavigated', frameNavigatedHandler)
    this.cdpListeners.set('frameStoppedLoading', frameStoppedLoadingHandler)
    this.cdpListeners.set('loadingFailed', loadingFailedHandler)

    console.log('📱 [PageStateManager] CDP monitoring initialized')
  }

  /**
   * Initialize WebKit monitoring (iOS - limited)
   */
  private async initializeWebKitMonitoring(): Promise<void> {
    // WebKit has limited page lifecycle events
    // Poll for document.readyState changes as fallback
    console.log('📱 [PageStateManager] WebKit monitoring initialized (limited)')
  }

  /**
   * Handle navigation start
   */
  private handleNavigationStart(url: string): void {
    console.log(`📱 [PageStateManager] Navigation started: ${url}`)

    this.currentUrl = url
    this.currentState = 'loading'
    this.navigationStartTime = Date.now()

    this.emitEvent({
      url,
      timestamp: this.navigationStartTime,
      loadState: 'loading'
    })
  }

  /**
   * Handle navigation complete
   */
  private handleNavigationComplete(url: string): void {
    console.log(`📱 [PageStateManager] Navigation completed: ${url}`)

    this.currentUrl = url
    this.currentState = 'interactive'

    this.emitEvent({
      url,
      timestamp: Date.now(),
      loadState: 'interactive',
      loadTime: Date.now() - this.navigationStartTime
    })
  }

  /**
   * Handle load complete
   */
  private handleLoadComplete(): void {
    console.log(`📱 [PageStateManager] Load complete: ${this.currentUrl}`)

    this.currentState = 'complete'

    this.emitEvent({
      url: this.currentUrl,
      timestamp: Date.now(),
      loadState: 'complete',
      loadTime: Date.now() - this.navigationStartTime
    })
  }

  /**
   * Handle load error
   */
  private handleLoadError(errorMessage: string): void {
    console.error(`📱 [PageStateManager] Load error: ${errorMessage}`)

    this.currentState = 'error'

    this.emitEvent({
      url: this.currentUrl,
      timestamp: Date.now(),
      loadState: 'error',
      errorMessage,
      loadTime: Date.now() - this.navigationStartTime
    })
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: PageNavigationEvent): void {
    // Add to history
    this.eventHistory.push(event)

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('📱 [PageStateManager] Listener error:', error)
      }
    })
  }

  /**
   * Wait for page load
   */
  async waitForLoad(timeout: number = 30000): Promise<boolean> {
    console.log(`📱 [PageStateManager] Waiting for page load (timeout: ${timeout}ms)`)

    return new Promise((resolve) => {
      const startTime = Date.now()

      // Check if already loaded
      if (this.currentState === 'complete') {
        resolve(true)
        return
      }

      // Create listener
      const listener: PageStateListener = (event) => {
        if (event.loadState === 'complete') {
          this.removeListener(listener)
          resolve(true)
        } else if (event.loadState === 'error') {
          this.removeListener(listener)
          resolve(false)
        }
      }

      this.addListener(listener)

      // Set timeout
      setTimeout(() => {
        this.removeListener(listener)
        resolve(false)
      }, timeout)
    })
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(timeout: number = 30000): Promise<boolean> {
    console.log(`📱 [PageStateManager] Waiting for navigation (timeout: ${timeout}ms)`)

    return new Promise((resolve) => {
      const startTime = Date.now()

      // Create listener
      const listener: PageStateListener = (event) => {
        if (event.loadState === 'interactive' || event.loadState === 'complete') {
          this.removeListener(listener)
          resolve(true)
        } else if (event.loadState === 'error') {
          this.removeListener(listener)
          resolve(false)
        }
      }

      this.addListener(listener)

      // Set timeout
      setTimeout(() => {
        this.removeListener(listener)
        resolve(false)
      }, timeout)
    })
  }

  /**
   * Check document ready state
   */
  async getReadyState(): Promise<string> {
    try {
      let result

      if (this.device.os === 'android') {
        result = await cdpConnectionManager.executeJavaScript(
          this.device.id,
          'document.readyState'
        )
      } else {
        result = await webkitConnectionManager.executeJavaScript(
          this.device.id,
          'document.readyState'
        )
      }

      return result || 'unknown'
    } catch (error) {
      console.error('📱 [PageStateManager] Error getting ready state:', error)
      return 'unknown'
    }
  }

  /**
   * Wait for selector
   */
  async waitForSelector(
    selector: string,
    timeout: number = 10000
  ): Promise<boolean> {
    console.log(`📱 [PageStateManager] Waiting for selector: ${selector}`)

    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      try {
        let result

        if (this.device.os === 'android') {
          result = await cdpConnectionManager.executeJavaScript(
            this.device.id,
            `
            (function() {
              const result = document.evaluate(
                '${selector.replace(/'/g, "\\'")}',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              );
              return result.singleNodeValue !== null;
            })()
            `
          )
        } else {
          result = await webkitConnectionManager.executeJavaScript(
            this.device.id,
            `
            (function() {
              const result = document.evaluate(
                '${selector.replace(/'/g, "\\'")}',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              );
              return result.singleNodeValue !== null;
            })()
            `
          )
        }

        if (result) {
          console.log(`📱 [PageStateManager] Selector found: ${selector}`)
          return true
        }
      } catch (error) {
        // Continue waiting
      }

      // Wait 100ms before next check
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.warn(`📱 [PageStateManager] Selector not found (timeout): ${selector}`)
    return false
  }

  /**
   * Add listener
   */
  addListener(listener: PageStateListener): void {
    this.listeners.add(listener)
  }

  /**
   * Remove listener
   */
  removeListener(listener: PageStateListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Get current state
   */
  getCurrentState(): PageLoadState {
    return this.currentState
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.currentUrl
  }

  /**
   * Get event history
   */
  getEventHistory(): PageNavigationEvent[] {
    return [...this.eventHistory]
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = []
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    console.log(`📱 [PageStateManager] Cleaning up for ${this.device.name}`)

    // Remove CDP listeners
    if (this.device.os === 'android') {
      // CDP listeners are automatically cleaned up when connection closes
      this.cdpListeners.clear()
    }

    // Clear listeners
    this.listeners.clear()

    // Clear history
    this.eventHistory = []
  }
}

/**
 * Singleton manager for page state managers
 */
class PageStateManagerRegistry {
  private managers: Map<string, MobilePageStateManager> = new Map()

  /**
   * Get or create manager for device
   */
  async getManager(device: MobileDevice): Promise<MobilePageStateManager> {
    let manager = this.managers.get(device.id)

    if (!manager) {
      manager = new MobilePageStateManager(device)
      await manager.initialize()
      this.managers.set(device.id, manager)
    }

    return manager
  }

  /**
   * Remove manager
   */
  async removeManager(deviceId: string): Promise<void> {
    const manager = this.managers.get(deviceId)

    if (manager) {
      await manager.cleanup()
      this.managers.delete(deviceId)
    }
  }

  /**
   * Clear all managers
   */
  async clearAll(): Promise<void> {
    for (const manager of this.managers.values()) {
      await manager.cleanup()
    }

    this.managers.clear()
  }
}

// Export singleton instance
export const pageStateManagerRegistry = new PageStateManagerRegistry()
