/**
 * Appium Connection Manager for iOS Automation
 *
 * Provides full iOS Safari automation capabilities via Appium + WebDriverAgent.
 * Supports: screenshots, element interaction, navigation, DOM inspection, etc.
 *
 * Requirements:
 * - Appium 2.0+ installed
 * - XCUITest driver installed
 * - iOS device with WebDriverAgent deployed
 * - Device connected via USB
 */

import { IOSDevice } from '../types/mobileDevice'

export interface AppiumSession {
  sessionId: string
  device: IOSDevice
  capabilities: any
  isConnected: boolean
  currentUrl: string | null
}

export interface AppiumConnection {
  device: IOSDevice
  session: AppiumSession | null
  isConnected: boolean
  appiumUrl: string
}

export interface AppiumElement {
  ELEMENT: string
  'element-6066-11e4-a52e-4f735466cecf'?: string
}

/**
 * Appium Connection Manager
 *
 * Manages WebDriver sessions for iOS devices via Appium XCUITest driver
 */
export class AppiumConnectionManager {
  private connections: Map<string, AppiumConnection> = new Map()
  private appiumServerUrl: string = 'http://127.0.0.1:4723'

  /**
   * Helper method to send Appium commands via IPC (avoids CORS)
   */
  private async sendCommand(sessionId: string, method: string, path: string, body?: any): Promise<any> {
    const result = await (window as any).electronAPI.invoke('mobile:appium-session-command', {
      sessionId,
      method,
      path,
      body
    })

    if (!result.success) {
      throw new Error(result.error || 'Appium command failed')
    }

    return result.value
  }

  /**
   * Connect to iOS device via Appium
   * @param bundleId Optional bundle ID to launch native app instead of Safari
   */
  async connect(device: IOSDevice, bundleId?: string): Promise<AppiumConnection> {
    console.log('📱 [Appium] Connecting to iOS device:', device.name)
    console.log('📱 [Appium] UDID:', device.udid)
    if (bundleId) {
      console.log('📱 [Appium] Target app bundle ID:', bundleId)
    }

    try {
      // Create WebDriver session via IPC (to avoid CORS)
      const capabilities: any = {
        platformName: 'iOS',
        'appium:deviceName': device.name,
        'appium:udid': device.udid,
        'appium:automationName': 'XCUITest',
        'appium:newCommandTimeout': 300,
        'appium:wdaLaunchTimeout': 120000,
        'appium:usePrebuiltWDA': false,
        'appium:useNewWDA': false,
        'appium:clearSystemFiles': false,
        'appium:preventWDAAttachments': true,
        'appium:simpleIsVisibleCheck': true,
        'appium:shouldUseSingletonTestManager': true,
        'appium:showXcodeLog': true,
        'appium:xcodeOrgId': '7MFG6W6M8G',
        'appium:xcodeSigningId': 'iPhone Developer',
        'appium:updatedWDABundleId': 'com.rinasmusthafa.WebDriverAgentRunner'
      }

      // Launch native app if bundleId provided, otherwise launch Safari
      if (bundleId) {
        capabilities['appium:bundleId'] = bundleId
        console.log('📱 [Appium] Configured for NATIVE APP automation')
      } else {
        capabilities['appium:browserName'] = 'Safari'
        console.log('📱 [Appium] Configured for SAFARI browser automation')
      }

      console.log('📱 [Appium] Creating WebDriver session with capabilities:', capabilities)

      // Use IPC to create session from main process (avoids CORS)
      const result = await (window as any).electronAPI.invoke('mobile:appium-create-session', {
        device,
        capabilities
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create Appium session')
      }

      const sessionId = result.sessionId

      if (!sessionId) {
        throw new Error('No session ID returned from Appium')
      }

      console.log('📱 [Appium] Session created successfully:', sessionId)

      const session: AppiumSession = {
        sessionId,
        device,
        capabilities: result.capabilities,
        isConnected: true,
        currentUrl: null
      }

      const connection: AppiumConnection = {
        device,
        session,
        isConnected: true,
        appiumUrl: this.appiumServerUrl
      }

      this.connections.set(device.id, connection)

      console.log('📱 [Appium] iOS device connected successfully')
      console.log('📱 [Appium] Safari browser ready for automation')

      return connection

    } catch (error: any) {
      console.error('📱 [Appium] Connection error:', error)
      throw new Error(`Failed to connect to iOS device via Appium: ${error.message}`)
    }
  }

  /**
   * Navigate to URL in Safari
   */
  async navigate(deviceId: string, url: string): Promise<void> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    console.log('📱 [Appium] Navigating to:', url)

    try {
      await this.sendCommand(connection.session.sessionId, 'POST', '/url', { url })
      connection.session.currentUrl = url
      console.log('📱 [Appium] Navigation successful')
    } catch (error: any) {
      console.error('📱 [Appium] Navigation error:', error)
      throw error
    }
  }

  /**
   * Execute JavaScript in Safari context
   */
  async executeJavaScript(deviceId: string, script: string): Promise<any> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    console.log('📱 [Appium] Executing JavaScript')

    try {
      return await this.sendCommand(connection.session.sessionId, 'POST', '/execute/sync', {
        script,
        args: []
      })
    } catch (error: any) {
      console.error('📱 [Appium] JS execution error:', error)
      throw error
    }
  }

  /**
   * Take screenshot of Safari browser
   */
  async takeScreenshot(deviceId: string): Promise<string> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    try {
      const base64Image = await this.sendCommand(connection.session.sessionId, 'GET', '/screenshot')
      // Return as data URL
      return `data:image/png;base64,${base64Image}`

    } catch (error: any) {
      const errorMsg = error.message || ''

      // Silently ignore common transient errors (expected during fast polling)
      if (errorMsg.includes('Too many pending tasks in queue')) {
        throw new Error('QUEUE_OVERFLOW')
      }
      if (errorMsg.includes('Session does not exist')) {
        throw new Error('SESSION_NOT_EXIST')
      }

      // Only log unexpected errors
      console.error('📱 [Appium] Screenshot error:', error)
      throw error
    }
  }

  /**
   * Get DOM snapshot
   */
  async getDOMSnapshot(deviceId: string): Promise<any> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    console.log('📱 [Appium] Getting DOM snapshot')

    try {
      return await this.sendCommand(connection.session.sessionId, 'GET', '/source')
    } catch (error: any) {
      console.error('📱 [Appium] Get DOM error:', error)
      throw error
    }
  }

  /**
   * Find element by XPath
   */
  async findElement(deviceId: string, xpath: string): Promise<AppiumElement | null> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    console.log('📱 [Appium] Finding element by XPath:', xpath)

    try {
      return await this.sendCommand(connection.session.sessionId, 'POST', '/element', {
        using: 'xpath',
        value: xpath
      })
    } catch (error: any) {
      console.error('📱 [Appium] Find element error:', error)
      return null
    }
  }

  /**
   * Find element by accessibility ID
   */
  async findElementByAccessibilityId(deviceId: string, accessibilityId: string): Promise<AppiumElement | null> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    console.log('📱 [Appium] Finding element by accessibility ID:', accessibilityId)

    try {
      return await this.sendCommand(connection.session.sessionId, 'POST', '/element', {
        using: 'accessibility id',
        value: accessibilityId
      })
    } catch (error: any) {
      console.error('📱 [Appium] Find element by accessibility ID error:', error)
      return null
    }
  }

  /**
   * Find element by selector (xpath or accessibility ID)
   * Automatically detects selector type and uses appropriate strategy
   */
  async findElementBySelector(deviceId: string, selector: string): Promise<AppiumElement | null> {
    // If selector starts with //, it's an XPath
    if (selector.startsWith('//')) {
      return await this.findElement(deviceId, selector)
    }

    // Otherwise, try accessibility ID first
    let element = await this.findElementByAccessibilityId(deviceId, selector)

    // If not found, try as XPath
    if (!element) {
      element = await this.findElement(deviceId, selector)
    }

    return element
  }

  /**
   * Click element by its reference
   * Uses mobile:tap for faster performance than W3C element click
   */
  async clickElementByReference(deviceId: string, element: AppiumElement): Promise<void> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    const elementId = element.ELEMENT || element['element-6066-11e4-a52e-4f735466cecf']
    console.log('📱 [Appium] Clicking element:', elementId)

    try {
      // Get element location and size for tap coordinates
      const rect = await this.sendCommand(connection.session.sessionId, 'GET', `/element/${elementId}/rect`, {})

      const centerX = rect.x + (rect.width / 2)
      const centerY = rect.y + (rect.height / 2)

      console.log('📱 [Appium] Tapping at coordinates:', centerX, centerY)

      // Use mobile:tap for faster performance (no implicit waits)
      await this.sendCommand(connection.session.sessionId, 'POST', '/execute/sync', {
        script: 'mobile: tap',
        args: [{
          x: centerX,
          y: centerY
        }]
      })

      console.log('📱 [Appium] Element tapped successfully')
    } catch (error: any) {
      console.error('📱 [Appium] Click element error:', error)
      throw error
    }
  }

  /**
   * Type text into a specific element
   */
  async typeTextIntoElement(deviceId: string, element: AppiumElement, text: string): Promise<void> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    const elementId = element.ELEMENT || element['element-6066-11e4-a52e-4f735466cecf']
    console.log('📱 [Appium] Typing into element:', elementId, 'text:', text.substring(0, 20) + '...')

    try {
      // Send keys to element
      await this.sendCommand(connection.session.sessionId, 'POST', `/element/${elementId}/value`, {
        text,
        value: text.split('')
      })

      console.log('📱 [Appium] Text typed successfully')
    } catch (error: any) {
      console.error('📱 [Appium] Type text into element error:', error)
      throw error
    }
  }

  /**
   * Click element at coordinates
   */
  async clickElement(deviceId: string, x: number, y: number): Promise<void> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    console.log(`📱 [Appium] Clicking at (${x}, ${y})`)

    try {
      // Use touch action to tap at coordinates
      await this.sendCommand(connection.session.sessionId, 'POST', '/actions', {
        actions: [{
          type: 'pointer',
          id: 'finger1',
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 }
          ]
        }]
      })

      console.log('📱 [Appium] Click successful')
    } catch (error: any) {
      console.error('📱 [Appium] Click error:', error)
      throw error
    }
  }

  /**
   * Type text (sends keys to active element)
   */
  async typeText(deviceId: string, text: string): Promise<void> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    console.log('📱 [Appium] Typing text:', text.substring(0, 20) + '...')

    try {
      // Get active element
      const activeElement = await this.getActiveElement(deviceId)

      if (!activeElement) {
        throw new Error('No active element to type into')
      }

      const elementId = activeElement.ELEMENT || activeElement['element-6066-11e4-a52e-4f735466cecf']

      // Send keys to element
      await this.sendCommand(connection.session.sessionId, 'POST', `/element/${elementId}/value`, {
        text,
        value: text.split('')
      })

      console.log('📱 [Appium] Text typed successfully')
    } catch (error: any) {
      console.error('📱 [Appium] Type text error:', error)
      throw error
    }
  }

  /**
   * Get active element
   */
  private async getActiveElement(deviceId: string): Promise<AppiumElement | null> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    try {
      return await this.sendCommand(connection.session.sessionId, 'GET', '/element/active')
    } catch (error) {
      return null
    }
  }

  /**
   * Perform swipe gesture
   */
  async swipe(
    deviceId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 500
  ): Promise<void> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    console.log(`📱 [Appium] Swiping from (${startX},${startY}) to (${endX},${endY})`)

    try {
      await this.sendCommand(connection.session.sessionId, 'POST', '/actions', {
        actions: [{
          type: 'pointer',
          id: 'finger1',
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 50 },
            { type: 'pointerMove', duration, x: endX, y: endY },
            { type: 'pointerUp', button: 0 }
          ]
        }]
      })

      console.log('📱 [Appium] Swipe successful')
    } catch (error: any) {
      console.error('📱 [Appium] Swipe error:', error)
      throw error
    }
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(deviceId: string): Promise<string> {
    const connection = this.getConnection(deviceId)
    if (!connection?.session) {
      throw new Error('No active Appium session')
    }

    try {
      return await this.sendCommand(connection.session.sessionId, 'GET', '/url')
    } catch (error: any) {
      console.error('📱 [Appium] Get URL error:', error)
      throw error
    }
  }

  /**
   * Disconnect from device (delete session)
   */
  async disconnect(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId)
    if (!connection?.session) {
      return
    }

    console.log('📱 [Appium] Disconnecting from device')

    try {
      await (window as any).electronAPI.invoke('mobile:appium-delete-session', {
        sessionId: connection.session.sessionId
      })

      console.log('📱 [Appium] Session deleted successfully')
    } catch (error) {
      console.error('📱 [Appium] Disconnect error:', error)
    } finally {
      this.connections.delete(deviceId)
    }
  }

  /**
   * Get connection for device
   */
  getConnection(deviceId: string): AppiumConnection | undefined {
    return this.connections.get(deviceId)
  }

  /**
   * Check if device is connected
   */
  isConnected(deviceId: string): boolean {
    const connection = this.connections.get(deviceId)
    return connection?.isConnected ?? false
  }

  /**
   * Disconnect all devices
   */
  async disconnectAll(): Promise<void> {
    console.log('📱 [Appium] Disconnecting all devices')

    const promises = Array.from(this.connections.keys()).map(deviceId =>
      this.disconnect(deviceId)
    )

    await Promise.all(promises)
  }

  /**
   * Get Appium server URL
   */
  getServerUrl(): string {
    return this.appiumServerUrl
  }

  /**
   * Set Appium server URL
   */
  setServerUrl(url: string): void {
    this.appiumServerUrl = url
    console.log('📱 [Appium] Server URL updated:', url)
  }
}

// Export singleton instance
export const appiumConnectionManager = new AppiumConnectionManager()
