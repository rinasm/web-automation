/**
 * SDK Action Executor
 *
 * Executes test actions on iOS devices via SnapTest SDK WebSocket commands.
 * Much faster than Appium! (milliseconds vs 100+ seconds)
 */

import { Action } from '../store/flowStore'

/**
 * Action execution result
 */
export interface SDKActionExecutionResult {
  success: boolean
  actionId: string
  error?: string
  duration?: number
}

/**
 * Pending action promise
 */
interface PendingAction {
  resolve: (result: SDKActionExecutionResult) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

/**
 * SDK Action Executor Class
 *
 * Sends action commands to SDK via WebSocket and waits for results
 */
export class SDKActionExecutor {
  private deviceId: string
  private pendingActions: Map<string, PendingAction> = new Map()
  private actionCounter: number = 0

  constructor(deviceId: string) {
    this.deviceId = deviceId
  }

  /**
   * Execute a single action via SDK
   */
  async executeAction(action: Action): Promise<SDKActionExecutionResult> {
    const actionId = `action_${this.deviceId}_${Date.now()}_${this.actionCounter++}`

    console.log(`📱 [SDKActionExecutor] Executing action: ${action.type} (${actionId})`)
    console.log(`📱 [SDKActionExecutor] Action object:`, JSON.stringify(action, null, 2))

    // Map action type
    let actionType = action.type
    if (actionType === 'click') {
      actionType = 'tap'
    }

    // Build command payload
    const command = {
      type: 'executeAction',
      timestamp: Date.now() / 1000,
      payload: {
        actionId,
        actionType,
        selector: action.selector,
        value: action.value,
        swipeDirection: action.swipeDirection, // Swipe/scroll direction
        swipeDistance: action.swipeDistance // Swipe/scroll distance in pixels
      }
    }

    console.log(`📱 [SDKActionExecutor] Command payload:`, JSON.stringify(command.payload, null, 2))

    // Send command via WebSocket
    const result = await this.sendCommandAndWait(actionId, command)

    console.log(`📱 [SDKActionExecutor] Action completed:`, result.success ? '✅' : '❌', result.duration + 'ms')

    return result
  }

  /**
   * Execute multiple actions in sequence
   */
  async executeActions(actions: Action[]): Promise<SDKActionExecutionResult[]> {
    console.log(`📱 [SDKActionExecutor] Executing ${actions.length} actions`)

    const results: SDKActionExecutionResult[] = []

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]

      // Delay before EACH action (including first one) to allow UI to settle
      // This gives sheets, modals, and transitions time to complete
      console.log(`📱 [SDKActionExecutor] Waiting 1s before action ${i + 1}/${actions.length}...`)
      await this.delay(1000)

      const result = await this.executeAction(action)
      results.push(result)

      // Log warning if action fails but continue execution
      if (!result.success) {
        console.warn(`⚠️ [SDKActionExecutor] Action failed: ${action.type} - ${result.error || 'Unknown error'}`)
        console.warn(`⚠️ [SDKActionExecutor] Continuing with remaining actions...`)
        // Continue instead of breaking - DO NOT STOP on errors
      }
    }

    console.log(`📱 [SDKActionExecutor] Execution complete: ${results.filter(r => r.success).length}/${results.length} succeeded`)

    return results
  }

  /**
   * Take screenshot via SDK
   * @param format Image format ('png' or 'jpeg', default: 'png')
   * @returns Base64-encoded screenshot image
   */
  async takeScreenshot(format: 'png' | 'jpeg' = 'png'): Promise<string | null> {
    const screenshotId = `screenshot_${this.deviceId}_${Date.now()}`

    // Build screenshot command
    const command = {
      type: 'screenshot',
      timestamp: Date.now() / 1000,
      payload: {
        actionType: format // Reuse actionType field for format
      }
    }

    try {
      // Send command and wait for response
      const result = await this.sendScreenshotCommand(screenshotId, command)

      if (result.success && result.image) {
        return result.image
      } else {
        console.error(`❌ [SDKActionExecutor] Screenshot failed: ${result.error || 'Unknown error'}`)
        return null
      }
    } catch (error) {
      console.error(`❌ [SDKActionExecutor] Screenshot error:`, error)
      return null
    }
  }

  /**
   * Send screenshot command to SDK and wait for result
   */
  private sendScreenshotCommand(screenshotId: string, command: any): Promise<{
    success: boolean
    image?: string
    error?: string
  }> {
    return new Promise((resolve, reject) => {
      // Set timeout (10 seconds for screenshot - might be large)
      const timeout = setTimeout(() => {
        this.pendingActions.delete(screenshotId)
        reject(new Error(`Screenshot timed out after 10000ms`))
      }, 10000)

      // Store pending promise (reuse pendingActions map)
      this.pendingActions.set(screenshotId, {
        resolve: (result: any) => resolve(result),
        reject,
        timeout
      })

      // Send command via IPC to WebSocket server
      if (window.electronAPI) {
        window.electronAPI.sendToMobileDevice(this.deviceId, command)
      } else {
        clearTimeout(timeout)
        this.pendingActions.delete(screenshotId)
        reject(new Error('Electron API not available'))
      }
    })
  }

  /**
   * Handle screenshot result from SDK
   */
  handleScreenshotResult(result: {
    success: boolean
    image?: string
    format?: string
    error?: string
  }): void {
    // Screenshot results don't have actionId, so we need to find the pending screenshot by type
    // For simplicity, resolve the first pending screenshot (since they're usually sequential)
    for (const [id, pending] of this.pendingActions.entries()) {
      if (id.startsWith('screenshot_')) {
        clearTimeout(pending.timeout)
        this.pendingActions.delete(id)
        pending.resolve(result)
        return
      }
    }

    // Silently ignore if no pending screenshot found (likely was cancelled)
  }

  /**
   * Send command to SDK and wait for result
   */
  private sendCommandAndWait(actionId: string, command: any): Promise<SDKActionExecutionResult> {
    return new Promise((resolve, reject) => {
      // Set timeout (5 seconds)
      const timeout = setTimeout(() => {
        this.pendingActions.delete(actionId)
        reject(new Error(`Action timed out after 5000ms`))
      }, 5000)

      // Store pending promise
      this.pendingActions.set(actionId, {
        resolve,
        reject,
        timeout
      })

      // Send command via IPC to WebSocket server
      if (window.electronAPI) {
        window.electronAPI.sendToMobileDevice(this.deviceId, command)
      } else {
        clearTimeout(timeout)
        this.pendingActions.delete(actionId)
        reject(new Error('Electron API not available'))
      }
    })
  }

  /**
   * Handle action result from SDK
   * Called by the WebSocket server when it receives an actionResult event
   */
  handleActionResult(result: {
    actionId: string
    success: boolean
    error?: string
    duration: number
  }): void {
    const pending = this.pendingActions.get(result.actionId)

    if (!pending) {
      console.warn(`📱 [SDKActionExecutor] Received result for unknown action: ${result.actionId}`)
      return
    }

    // Clear timeout
    clearTimeout(pending.timeout)
    this.pendingActions.delete(result.actionId)

    // Resolve promise
    pending.resolve({
      success: result.success,
      actionId: result.actionId,
      error: result.error,
      duration: result.duration
    })
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return this.deviceId
  }

  /**
   * Clear all pending actions
   */
  clearPending(): void {
    for (const [actionId, pending] of this.pendingActions.entries()) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Executor cleared'))
    }
    this.pendingActions.clear()
  }
}

/**
 * Singleton manager for SDK action executors
 */
class SDKActionExecutorManager {
  private executors: Map<string, SDKActionExecutor> = new Map()
  private isListenerSetup: boolean = false

  /**
   * Set up event listener for SDK action results
   * Called lazily on first use to ensure window.electronAPI is available
   */
  private setupEventListener(): void {
    if (this.isListenerSetup || !window.electronAPI) {
      return
    }

    console.log('📱 [SDKActionExecutorManager] Setting up event listener...')

    window.electronAPI.onSDKActionResult((data: { deviceId: string; result: any }) => {
      console.log(`📊 [SDKActionExecutorManager] Received action result for device: ${data.deviceId}`)
      this.handleActionResult(data.deviceId, data.result)
    })

    // Listen for execution logs and display with green styling
    window.electronAPI.onSDKExecutionLog((data: { deviceId: string; log: any }) => {
      const log = data.log

      // Build detailed message
      let message = `🟢 [EXECUTION] Action ${log.actionId} - Step: ${log.step}\n   ${log.message}`

      if (log.data) {
        if (log.data.elementType) {
          message += `\n   Element Type: ${log.data.elementType}`
        }
        if (log.data.bounds) {
          const b = log.data.bounds
          message += `\n   Bounds: (x: ${b.x}, y: ${b.y}, width: ${b.width}, height: ${b.height})`
        }
        if (log.data.centerPoint) {
          const c = log.data.centerPoint
          message += `\n   Center Point: (${c.x}, ${c.y})`
        }
        if (log.data.tapStrategy) {
          message += `\n   Tap Strategy: ${log.data.tapStrategy}`
        }
      }

      // Display with green color styling
      console.log(`%c${message}`, 'color: #00ff00; font-weight: bold; background-color: #001a00; padding: 4px;')
    })

    // Listen for screenshot results
    if (window.electronAPI.onSDKScreenshotResult) {
      window.electronAPI.onSDKScreenshotResult((data: { deviceId: string; result: any }) => {
        this.handleScreenshotResult(data.deviceId, data.result)
      })
    }

    this.isListenerSetup = true
    console.log('📱 [SDKActionExecutorManager] Event listener setup complete')
  }

  /**
   * Get or create executor for device
   */
  getExecutor(deviceId: string): SDKActionExecutor {
    // Set up event listener on first use (lazy initialization)
    this.setupEventListener()

    let executor = this.executors.get(deviceId)

    if (!executor) {
      executor = new SDKActionExecutor(deviceId)
      this.executors.set(deviceId, executor)
    }

    return executor
  }

  /**
   * Handle action result from any device
   */
  handleActionResult(deviceId: string, result: any): void {
    const executor = this.executors.get(deviceId)
    if (executor) {
      executor.handleActionResult(result)
    } else {
      console.warn(`📱 [SDKActionExecutorManager] No executor found for device: ${deviceId}`)
    }
  }

  /**
   * Handle screenshot result from any device
   */
  handleScreenshotResult(deviceId: string, result: any): void {
    const executor = this.executors.get(deviceId)
    if (executor) {
      executor.handleScreenshotResult(result)
    }
    // Silently ignore if executor not found (device may have disconnected)
  }

  /**
   * Remove executor for device
   */
  removeExecutor(deviceId: string): void {
    const executor = this.executors.get(deviceId)
    if (executor) {
      executor.clearPending()
    }
    this.executors.delete(deviceId)
  }

  /**
   * Clear all executors
   */
  clearAll(): void {
    for (const executor of this.executors.values()) {
      executor.clearPending()
    }
    this.executors.clear()
  }
}

// Export singleton instance
export const sdkActionExecutorManager = new SDKActionExecutorManager()
