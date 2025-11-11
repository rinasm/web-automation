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
        swipeDirection: action.value // For swipe actions
      }
    }

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

      // Stop execution if action fails
      if (!result.success) {
        console.error(`📱 [SDKActionExecutor] Stopping execution due to failure at action: ${action.type}`)
        break
      }
    }

    console.log(`📱 [SDKActionExecutor] Execution complete: ${results.filter(r => r.success).length}/${results.length} succeeded`)

    return results
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
