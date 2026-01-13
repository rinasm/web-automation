/**
 * Mobile Action Executor
 *
 * Executes test actions on iOS mobile devices via SnapTest SDK.
 * Handles touch gestures, element interactions, and mobile-specific operations.
 *
 * Note: Android support via CDP is deprecated. iOS is supported via SDK only.
 */

import { MobileDevice, AndroidDevice, IOSDevice } from '../types/mobileDevice'
import { Action } from '../store/flowStore'
import { cdpConnectionManager } from './cdpConnection'
import {
  performTap,
  performSwipe,
  performLongPress,
  performPinch,
  performDoubleTap,
  SwipeDirection
} from './touchGestures'
import { sdkActionExecutorManager } from './sdkActionExecutor'
import { useAppConfigStore } from '../store/appConfigStore'

/**
 * Action execution result
 */
export interface ActionExecutionResult {
  success: boolean
  actionId: string
  error?: string
  duration?: number
  screenshot?: string
}

/**
 * Mobile-specific action types
 */
export type MobileActionType =
  | 'tap'
  | 'swipe'
  | 'longPress'
  | 'doubleTap'
  | 'pinch'
  | 'type'
  | 'scroll'
  | 'wait'
  | 'screenshot'
  | 'navigate'
  | 'back'
  | 'refresh'

/**
 * Mobile Action Executor Class
 *
 * Executes actions on connected mobile devices
 */
export class MobileActionExecutor {
  private device: MobileDevice
  private executionLog: ActionExecutionResult[] = []

  constructor(device: MobileDevice) {
    this.device = device
  }

  /**
   * Execute a single action
   */
  async executeAction(action: Action): Promise<ActionExecutionResult> {
    const startTime = Date.now()

    console.log(`📱 [MobileActionExecutor] Executing action: ${action.type} on ${this.device.name}`)

    try {
      let result: ActionExecutionResult

      switch (action.type) {
        case 'click':
        case 'tap':
          result = await this.handleClick(action)
          break

        case 'type':
          result = await this.handleType(action)
          break

        case 'hover':
          result = await this.handleHover(action)
          break

        case 'wait':
          result = await this.handleWait(action)
          break

        case 'screenshot':
          result = await this.handleScreenshot(action)
          break

        case 'navigate':
          result = await this.handleNavigate(action)
          break

        case 'scroll':
          result = await this.handleScroll(action)
          break

        case 'swipe':
          result = await this.handleSwipe(action)
          break

        default:
          result = {
            success: false,
            actionId: action.id,
            error: `Unsupported action type: ${action.type}`
          }
      }

      const duration = Date.now() - startTime
      result.duration = duration

      this.executionLog.push(result)

      console.log(`📱 [MobileActionExecutor] Action completed in ${duration}ms:`, result.success ? '✅' : '❌')

      return result

    } catch (error: any) {
      const duration = Date.now() - startTime
      const result: ActionExecutionResult = {
        success: false,
        actionId: action.id,
        error: error.message,
        duration
      }

      this.executionLog.push(result)
      console.error(`📱 [MobileActionExecutor] Action failed:`, error)

      return result
    }
  }

  /**
   * Execute multiple actions in sequence
   */
  async executeActions(actions: Action[]): Promise<ActionExecutionResult[]> {
    console.log(`📱 [MobileActionExecutor] Executing ${actions.length} actions on ${this.device.name}`)

    const results: ActionExecutionResult[] = []

    for (const action of actions) {
      const result = await this.executeAction(action)
      results.push(result)

      // Stop execution if action fails (unless it's a soft assertion)
      if (!result.success && action.type !== 'wait') {
        console.error(`📱 [MobileActionExecutor] Stopping execution due to failure at action: ${action.type}`)
        break
      }

      // Delay between actions for UI animations (sheet, alerts, etc.)
      await this.delay(1000)
    }

    console.log(`📱 [MobileActionExecutor] Execution complete: ${results.filter(r => r.success).length}/${results.length} succeeded`)

    return results
  }

  /**
   * Handle click/tap action
   */
  private async handleClick(action: Action): Promise<ActionExecutionResult> {
    if (!action.selector) {
      return {
        success: false,
        actionId: action.id,
        error: 'No selector provided for click action'
      }
    }

    // iOS: Use element-based approach (xpath/accessibilityId)
    if (this.device.os === 'ios') {
      try {
        // Find element by selector (xpath or accessibilityId)
        const element = await appiumConnectionManager.findElementBySelector(this.device.id, action.selector)

        if (!element) {
          return {
            success: false,
            actionId: action.id,
            error: `Element not found with selector: ${action.selector}`
          }
        }

        // Click element by reference (not coordinates!)
        await appiumConnectionManager.clickElementByReference(this.device.id, element)

        return {
          success: true,
          actionId: action.id
        }
      } catch (error: any) {
        console.error('📱 [MobileActionExecutor] Click error:', error)
        return {
          success: false,
          actionId: action.id,
          error: error.message || 'Failed to click element'
        }
      }
    }

    // Android: Fall back to coordinate-based approach
    const coords = await this.getElementCoordinates(action.selector)

    if (!coords) {
      return {
        success: false,
        actionId: action.id,
        error: `Element not found: ${action.selector}`
      }
    }

    await performTap(this.device.id, coords.x, coords.y, cdpConnectionManager)

    return {
      success: true,
      actionId: action.id
    }
  }

  /**
   * Handle type action
   */
  private async handleType(action: Action): Promise<ActionExecutionResult> {
    if (!action.selector) {
      return {
        success: false,
        actionId: action.id,
        error: 'No selector provided for type action'
      }
    }

    if (!action.value) {
      return {
        success: false,
        actionId: action.id,
        error: 'No value provided for type action'
      }
    }

    // iOS: Use element-based approach (xpath/accessibilityId)
    if (this.device.os === 'ios') {
      try {
        // Find element by selector (xpath or accessibilityId)
        const element = await appiumConnectionManager.findElementBySelector(this.device.id, action.selector)

        if (!element) {
          return {
            success: false,
            actionId: action.id,
            error: `Element not found with selector: ${action.selector}`
          }
        }

        // Click element to focus it first
        await appiumConnectionManager.clickElementByReference(this.device.id, element)
        await this.delay(300)

        // Type text into the element
        await appiumConnectionManager.typeTextIntoElement(this.device.id, element, action.value)

        return {
          success: true,
          actionId: action.id
        }
      } catch (error: any) {
        console.error('📱 [MobileActionExecutor] Type error:', error)
        return {
          success: false,
          actionId: action.id,
          error: error.message || 'Failed to type into element'
        }
      }
    }

    // Android: Fall back to coordinate-based approach
    const coords = await this.getElementCoordinates(action.selector)

    if (coords) {
      // Tap to focus
      await performTap(this.device.id, coords.x, coords.y, cdpConnectionManager)
      await this.delay(300)
    }

    // Type text
    await cdpConnectionManager.typeText(this.device.id, action.value)

    return {
      success: true,
      actionId: action.id
    }
  }

  /**
   * Handle hover action (converted to tap on mobile)
   */
  private async handleHover(action: Action): Promise<ActionExecutionResult> {
    // On mobile, hover is simulated as a tap
    console.log('📱 [MobileActionExecutor] Converting hover to tap for mobile')
    return await this.handleClick(action)
  }

  /**
   * Handle wait action
   */
  private async handleWait(action: Action): Promise<ActionExecutionResult> {
    const waitTime = action.value ? parseInt(action.value) : 1000
    await this.delay(waitTime)

    return {
      success: true,
      actionId: action.id
    }
  }

  /**
   * Handle screenshot action
   */
  private async handleScreenshot(action: Action): Promise<ActionExecutionResult> {
    let screenshot: string

    if (this.device.os === 'android') {
      screenshot = await cdpConnectionManager.takeScreenshot(this.device.id)
    } else {
      screenshot = await appiumConnectionManager.takeScreenshot(this.device.id)
    }

    return {
      success: true,
      actionId: action.id,
      screenshot
    }
  }

  /**
   * Handle navigate action
   */
  private async handleNavigate(action: Action): Promise<ActionExecutionResult> {
    if (!action.value) {
      return {
        success: false,
        actionId: action.id,
        error: 'No URL provided for navigate action'
      }
    }

    if (this.device.os === 'android') {
      await cdpConnectionManager.navigate(this.device.id, action.value)
    } else {
      await appiumConnectionManager.navigate(this.device.id, action.value)
    }

    // Wait for page load
    await this.delay(2000)

    return {
      success: true,
      actionId: action.id
    }
  }

  /**
   * Handle scroll action
   */
  private async handleScroll(action: Action): Promise<ActionExecutionResult> {
    const direction = action.value || 'down'

    // Scroll by swiping
    const screenHeight = this.device.capabilities.screenHeight
    const screenWidth = this.device.capabilities.screenWidth

    const centerX = screenWidth / 2
    const startY = direction === 'down' ? screenHeight * 0.8 : screenHeight * 0.2
    const endY = direction === 'down' ? screenHeight * 0.2 : screenHeight * 0.8

    if (this.device.os === 'android') {
      await performSwipe(
        this.device.id,
        centerX,
        startY,
        centerX,
        endY,
        500,
        cdpConnectionManager
      )
    } else {
      await appiumConnectionManager.swipe(
        this.device.id,
        centerX,
        startY,
        centerX,
        endY,
        500
      )
    }

    return {
      success: true,
      actionId: action.id
    }
  }

  /**
   * Handle swipe action
   */
  private async handleSwipe(action: Action): Promise<ActionExecutionResult> {
    const direction = (action.value || 'up') as SwipeDirection

    const screenHeight = this.device.capabilities.screenHeight
    const screenWidth = this.device.capabilities.screenWidth

    let startX: number, startY: number, endX: number, endY: number

    switch (direction) {
      case 'up':
        startX = screenWidth / 2
        startY = screenHeight * 0.8
        endX = screenWidth / 2
        endY = screenHeight * 0.2
        break

      case 'down':
        startX = screenWidth / 2
        startY = screenHeight * 0.2
        endX = screenWidth / 2
        endY = screenHeight * 0.8
        break

      case 'left':
        startX = screenWidth * 0.8
        startY = screenHeight / 2
        endX = screenWidth * 0.2
        endY = screenHeight / 2
        break

      case 'right':
        startX = screenWidth * 0.2
        startY = screenHeight / 2
        endX = screenWidth * 0.8
        endY = screenHeight / 2
        break
    }

    if (this.device.os === 'android') {
      await performSwipe(
        this.device.id,
        startX,
        startY,
        endX,
        endY,
        500,
        cdpConnectionManager
      )
    } else {
      await appiumConnectionManager.swipe(
        this.device.id,
        startX,
        startY,
        endX,
        endY,
        500
      )
    }

    return {
      success: true,
      actionId: action.id
    }
  }

  /**
   * Get element coordinates from selector
   */
  private async getElementCoordinates(selector: string): Promise<{ x: number; y: number } | null> {
    try {
      let result: any

      if (this.device.os === 'android') {
        result = await cdpConnectionManager.executeJavaScript(
          this.device.id,
          `
          (function() {
            const element = document.evaluate(
              "${selector.replace(/"/g, '\\"')}",
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;

            if (!element) return null;

            const rect = element.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            };
          })()
          `
        )
      } else {
        result = await appiumConnectionManager.executeJavaScript(
          this.device.id,
          `
          (function() {
            const element = document.evaluate(
              "${selector.replace(/"/g, '\\"')}",
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;

            if (!element) return null;

            const rect = element.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            };
          })()
          `
        )
      }

      return result
    } catch (error) {
      console.error('📱 [MobileActionExecutor] Failed to get element coordinates:', error)
      return null
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get execution log
   */
  getExecutionLog(): ActionExecutionResult[] {
    return [...this.executionLog]
  }

  /**
   * Clear execution log
   */
  clearExecutionLog(): void {
    this.executionLog = []
  }

  /**
   * Get device info
   */
  getDevice(): MobileDevice {
    return this.device
  }
}

/**
 * Singleton manager for mobile action executors
 */
class MobileActionExecutorManager {
  private executors: Map<string, MobileActionExecutor> = new Map()

  /**
   * Get or create executor for device
   */
  getExecutor(device: MobileDevice): MobileActionExecutor {
    let executor = this.executors.get(device.id)

    if (!executor) {
      executor = new MobileActionExecutor(device)
      this.executors.set(device.id, executor)
    }

    return executor
  }

  /**
   * Execute actions on device
   * Routes to SDK executor for iOS devices (faster!), Appium for others
   */
  async executeActions(device: MobileDevice, actions: Action[]): Promise<ActionExecutionResult[]> {
    // Use SDK-based execution for iOS devices (much faster than Appium!)
    if (device.os === 'ios') {
      // Use bundleId from app config for SDK device identification
      const { targetAppBundleId } = useAppConfigStore.getState()
      const deviceId = targetAppBundleId || device.id

      console.log(`📱 [MobileActionExecutorManager] Using SDK execution for iOS device: ${device.name} (${deviceId})`)
      const sdkExecutor = sdkActionExecutorManager.getExecutor(deviceId)
      const sdkResults = await sdkExecutor.executeActions(actions)

      // Convert SDK results to ActionExecutionResult format
      return sdkResults.map(result => ({
        success: result.success,
        actionId: result.actionId,
        error: result.error,
        duration: result.duration
      }))
    }

    // Android and other platforms not currently supported
    console.error(`❌ [MobileActionExecutorManager] Device OS "${device.os}" is not supported`)
    console.error(`📱 [MobileActionExecutorManager] Only iOS devices with SnapTest SDK are currently supported`)
    console.error(`💡 [MobileActionExecutorManager] To use this device, ensure SnapTest SDK is integrated in your iOS app`)

    throw new Error(
      `Device platform "${device.os}" is not supported. ` +
      `Only iOS devices with SnapTest SDK integration are supported. ` +
      `For iOS testing, ensure the SnapTest SDK is embedded in your app and connected via WebSocket.`
    )
  }

  /**
   * Execute single action on device
   * Routes to SDK executor for iOS devices (faster!), Appium for others
   */
  async executeAction(device: MobileDevice, action: Action): Promise<ActionExecutionResult> {
    // Use SDK-based execution for iOS devices (much faster than Appium!)
    if (device.os === 'ios') {
      // Use bundleId from app config for SDK device identification
      const { targetAppBundleId } = useAppConfigStore.getState()
      const deviceId = targetAppBundleId || device.id

      console.log(`📱 [MobileActionExecutorManager] Using SDK execution for iOS device: ${device.name} (${deviceId})`)
      const sdkExecutor = sdkActionExecutorManager.getExecutor(deviceId)
      const sdkResult = await sdkExecutor.executeAction(action)

      // Convert SDK result to ActionExecutionResult format
      return {
        success: sdkResult.success,
        actionId: sdkResult.actionId,
        error: sdkResult.error,
        duration: sdkResult.duration
      }
    }

    // Android and other platforms not currently supported
    console.error(`❌ [MobileActionExecutorManager] Device OS "${device.os}" is not supported`)
    console.error(`📱 [MobileActionExecutorManager] Only iOS devices with SnapTest SDK are currently supported`)

    throw new Error(
      `Device platform "${device.os}" is not supported. ` +
      `Only iOS devices with SnapTest SDK integration are supported.`
    )
  }

  /**
   * Get execution log for device
   */
  getExecutionLog(deviceId: string): ActionExecutionResult[] {
    const executor = this.executors.get(deviceId)
    return executor ? executor.getExecutionLog() : []
  }

  /**
   * Clear execution log for device
   */
  clearExecutionLog(deviceId: string): void {
    const executor = this.executors.get(deviceId)
    executor?.clearExecutionLog()
  }

  /**
   * Remove executor for device
   */
  removeExecutor(deviceId: string): void {
    this.executors.delete(deviceId)
  }

  /**
   * Clear all executors
   */
  clearAll(): void {
    this.executors.clear()
  }
}

// Export singleton instance
export const mobileActionExecutorManager = new MobileActionExecutorManager()
