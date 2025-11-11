/**
 * Chrome DevTools Protocol (CDP) Connection Utility
 *
 * Handles connection to Android Chrome/Chromium browsers via CDP for remote debugging.
 * Used for controlling mobile Chrome browsers on Android devices.
 */

import CDP from 'chrome-remote-interface'
import { MobileDevice, AndroidDevice } from '../types/mobileDevice'

export interface CDPTarget {
  id: string
  type: string
  title: string
  url: string
  webSocketDebuggerUrl: string
}

export interface CDPConnection {
  client: any // CDP.Client
  targetId: string
  device: AndroidDevice
  isConnected: boolean
}

export class CDPConnectionManager {
  private connections: Map<string, CDPConnection> = new Map()

  /**
   * Get list of available targets (tabs/pages) on the device
   */
  async listTargets(device: AndroidDevice): Promise<CDPTarget[]> {
    console.log('📱 [CDP] Listing targets for device:', device.name)

    try {
      // CDP endpoint is typically at http://device-ip:9222
      const host = device.ip
      const port = 9222 // Standard CDP port

      const targets = await CDP.List({
        host,
        port
      })

      console.log(`📱 [CDP] Found ${targets.length} targets`)
      return targets as CDPTarget[]
    } catch (error: any) {
      console.error('📱 [CDP] Error listing targets:', error)
      throw new Error(`Failed to list CDP targets: ${error.message}`)
    }
  }

  /**
   * Connect to a specific target (tab/page) with retry logic
   */
  async connect(device: AndroidDevice, targetId?: string, retries = 3): Promise<CDPConnection> {
    console.log('📱 [CDP] Connecting to device:', device.name, 'target:', targetId || 'default')

    // Check if already connected
    const existing = this.connections.get(device.id)
    if (existing && existing.isConnected) {
      console.log('📱 [CDP] Using existing connection')
      return existing
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const host = device.ip
        const port = 9222

        // If no targetId specified, get the first available page
        let target = targetId
        if (!target) {
          const targets = await this.listTargets(device)
          const pageTarget = targets.find(t => t.type === 'page')
          if (!pageTarget) {
            throw new Error('No page targets found on device')
          }
          target = pageTarget.id
        }

        // Connect to CDP with timeout
        const client = await Promise.race([
          CDP({ host, port, target }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('CDP connection timeout (10s)')), 10000)
          )
        ])

        console.log('📱 [CDP] Connected successfully')

        // Enable necessary domains with timeout
        await Promise.race([
          Promise.all([
            client.Page.enable(),
            client.DOM.enable(),
            client.Runtime.enable(),
            client.Network.enable()
          ]),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('CDP domain enable timeout')), 5000)
          )
        ])

        const connection: CDPConnection = {
          client,
          targetId: target,
          device,
          isConnected: true
        }

        this.connections.set(device.id, connection)

        // Handle disconnection with auto-reconnect
        client.on('disconnect', () => {
          console.log('📱 [CDP] Disconnected from device:', device.name)
          connection.isConnected = false
          this.connections.delete(device.id)

          // Auto-reconnect attempt
          console.log('📱 [CDP] Attempting auto-reconnect...')
          setTimeout(() => {
            this.connect(device, targetId, 1).catch(err => {
              console.error('📱 [CDP] Auto-reconnect failed:', err.message)
            })
          }, 2000)
        })

        // Handle errors
        client.on('error', (error: Error) => {
          console.error('📱 [CDP] Client error:', error.message)
        })

        return connection
      } catch (error: any) {
        lastError = error
        console.error(`📱 [CDP] Connection attempt ${attempt}/${retries} failed:`, error.message)

        if (attempt < retries) {
          const delay = attempt * 1000 // Exponential backoff: 1s, 2s, 3s
          console.log(`📱 [CDP] Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`Failed to connect via CDP after ${retries} attempts: ${lastError?.message}`)
  }

  /**
   * Navigate to a URL
   */
  async navigate(deviceId: string, url: string): Promise<void> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error('No active CDP connection for device')
    }

    console.log('📱 [CDP] Navigating to:', url)

    try {
      await connection.client.Page.navigate({ url })
      await connection.client.Page.loadEventFired()
      console.log('📱 [CDP] Navigation complete')
    } catch (error: any) {
      console.error('📱 [CDP] Navigation error:', error)
      throw new Error(`Failed to navigate: ${error.message}`)
    }
  }

  /**
   * Execute JavaScript on the page
   */
  async executeJavaScript(deviceId: string, expression: string): Promise<any> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error('No active CDP connection for device')
    }

    console.log('📱 [CDP] Executing JS:', expression.substring(0, 50) + '...')

    try {
      const result = await connection.client.Runtime.evaluate({
        expression,
        returnByValue: true,
        awaitPromise: true
      })

      if (result.exceptionDetails) {
        throw new Error(`JS execution error: ${result.exceptionDetails.text}`)
      }

      return result.result.value
    } catch (error: any) {
      console.error('📱 [CDP] JS execution error:', error)
      throw new Error(`Failed to execute JavaScript: ${error.message}`)
    }
  }

  /**
   * Get DOM snapshot
   */
  async getDOMSnapshot(deviceId: string): Promise<any> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error('No active CDP connection for device')
    }

    console.log('📱 [CDP] Getting DOM snapshot')

    try {
      const { root } = await connection.client.DOM.getDocument()
      return root
    } catch (error: any) {
      console.error('📱 [CDP] DOM snapshot error:', error)
      throw new Error(`Failed to get DOM snapshot: ${error.message}`)
    }
  }

  /**
   * Click element at coordinates
   */
  async clickElement(deviceId: string, x: number, y: number): Promise<void> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error('No active CDP connection for device')
    }

    console.log(`📱 [CDP] Clicking at (${x}, ${y})`)

    try {
      // Simulate touch tap
      await connection.client.Input.dispatchTouchEvent({
        type: 'touchStart',
        touchPoints: [{ x, y }]
      })

      await connection.client.Input.dispatchTouchEvent({
        type: 'touchEnd',
        touchPoints: []
      })

      console.log('📱 [CDP] Click complete')
    } catch (error: any) {
      console.error('📱 [CDP] Click error:', error)
      throw new Error(`Failed to click element: ${error.message}`)
    }
  }

  /**
   * Type text into focused element
   */
  async typeText(deviceId: string, text: string): Promise<void> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error('No active CDP connection for device')
    }

    console.log('📱 [CDP] Typing text:', text.substring(0, 20) + '...')

    try {
      // Type each character
      for (const char of text) {
        await connection.client.Input.dispatchKeyEvent({
          type: 'char',
          text: char
        })
      }

      console.log('📱 [CDP] Typing complete')
    } catch (error: any) {
      console.error('📱 [CDP] Typing error:', error)
      throw new Error(`Failed to type text: ${error.message}`)
    }
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(deviceId: string): Promise<string> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error('No active CDP connection for device')
    }

    console.log('📱 [CDP] Taking screenshot')

    try {
      const { data } = await connection.client.Page.captureScreenshot({
        format: 'png'
      })

      console.log('📱 [CDP] Screenshot captured')
      return `data:image/png;base64,${data}`
    } catch (error: any) {
      console.error('📱 [CDP] Screenshot error:', error)
      throw new Error(`Failed to take screenshot: ${error.message}`)
    }
  }

  /**
   * Get page HTML
   */
  async getPageHTML(deviceId: string): Promise<string> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error('No active CDP connection for device')
    }

    console.log('📱 [CDP] Getting page HTML')

    try {
      const html = await this.executeJavaScript(deviceId, 'document.documentElement.outerHTML')
      return html
    } catch (error: any) {
      console.error('📱 [CDP] Get HTML error:', error)
      throw new Error(`Failed to get page HTML: ${error.message}`)
    }
  }

  /**
   * Wait for selector
   */
  async waitForSelector(deviceId: string, selector: string, timeout: number = 30000): Promise<boolean> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error('No active CDP connection for device')
    }

    console.log('📱 [CDP] Waiting for selector:', selector)

    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      try {
        const exists = await this.executeJavaScript(
          deviceId,
          `!!document.querySelector('${selector.replace(/'/g, "\\'")}')`
        )

        if (exists) {
          console.log('📱 [CDP] Selector found')
          return true
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        // Continue waiting
      }
    }

    console.log('📱 [CDP] Selector not found within timeout')
    return false
  }

  /**
   * Disconnect from device
   */
  async disconnect(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId)
    if (!connection) {
      return
    }

    console.log('📱 [CDP] Disconnecting from device')

    try {
      await connection.client.close()
      this.connections.delete(deviceId)
      console.log('📱 [CDP] Disconnected successfully')
    } catch (error: any) {
      console.error('📱 [CDP] Disconnection error:', error)
    }
  }

  /**
   * Get connection for device
   */
  getConnection(deviceId: string): CDPConnection | undefined {
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
    console.log('📱 [CDP] Disconnecting all devices')

    const promises = Array.from(this.connections.keys()).map(deviceId =>
      this.disconnect(deviceId)
    )

    await Promise.all(promises)
  }
}

// Export singleton instance
export const cdpConnectionManager = new CDPConnectionManager()
