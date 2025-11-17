import { WebSocketServer, WebSocket } from 'ws'
import { BrowserWindow } from 'electron'
import Bonjour from 'bonjour-service'
import { networkInterfaces } from 'os'
import { parseViewHierarchy, findElementAtCoordinates } from './hierarchyElementFinder'

/**
 * Get all local IP addresses for network interfaces
 * Returns all non-internal IPv4 addresses with their interface names
 */
function getAllLocalIPAddresses(): Array<{interface: string, address: string}> {
  const nets = networkInterfaces()
  const addresses: Array<{interface: string, address: string}> = []

  for (const name of Object.keys(nets)) {
    const interfaces = nets[name]
    if (!interfaces) continue

    for (const net of interfaces) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address })
      }
    }
  }

  return addresses
}

/**
 * Get primary local IP address for display
 * Prioritizes: iPhone hotspot (bridge*) > WiFi (en0) > Other interfaces
 */
function getLocalIPAddress(): string {
  const allAddresses = getAllLocalIPAddresses()

  if (allAddresses.length === 0) {
    console.warn('⚠️ [Network] No network interfaces found, falling back to localhost')
    return '127.0.0.1'
  }

  // Prioritize iPhone hotspot (bridge interfaces)
  const hotspotInterface = allAddresses.find(addr => addr.interface.startsWith('bridge'))
  if (hotspotInterface) {
    console.log(`🌐 [Network] Found iPhone Hotspot interface ${hotspotInterface.interface}: ${hotspotInterface.address}`)
    return hotspotInterface.address
  }

  // Then WiFi interface (en0 on macOS, wlan0 on Linux)
  const wifiInterface = allAddresses.find(addr => addr.interface === 'en0' || addr.interface === 'wlan0')
  if (wifiInterface) {
    console.log(`🌐 [Network] Found WiFi interface ${wifiInterface.interface}: ${wifiInterface.address}`)
    return wifiInterface.address
  }

  // Return first available address
  const firstAddress = allAddresses[0]
  console.log(`🌐 [Network] Using interface ${firstAddress.interface}: ${firstAddress.address}`)
  return firstAddress.address
}

// Types for SDK events
interface SDKEvent {
  type: string
  timestamp: number
  [key: string]: any
}

interface HandshakeEvent extends SDKEvent {
  type: 'handshake'
  deviceName: string
  deviceModel: string
  systemVersion: string
  bundleId: string
}

interface TouchEvent extends SDKEvent {
  type: 'touch'
  gestureType: 'tap' | 'longPress' | 'swipe' | 'scroll' | 'type'
  coordinates: { x: number; y: number }
  element?: {
    className: string
    accessibilityIdentifier?: string
    accessibilityLabel?: string
    text?: string
    bounds: { x: number; y: number; width: number; height: number }
    isClickable: boolean
    isEditable: boolean
    xpath?: string
    viewHierarchyDebugDescription?: string
  }
  duration?: number
  swipeDirection?: 'up' | 'down' | 'left' | 'right'
  value?: string
}

interface SDKCommand {
  type: 'startRecording' | 'stopRecording' | 'ping' | 'executeAction'
  timestamp: number
  payload?: {
    actionId?: string
    actionType?: string
    selector?: string
    value?: string
    swipeDirection?: string
  }
}

interface ExecutionLogEvent extends SDKEvent {
  type: 'executionLog'
  actionId: string
  step: string
  message: string
  data?: {
    elementType?: string
    bounds?: { x: number; y: number; width: number; height: number }
    centerPoint?: { x: number; y: number }
    tapStrategy?: string
  }
}

/**
 * WebSocket Server for SnapTest SDK
 *
 * Handles connections from iOS apps with integrated SnapTest SDK.
 * Receives real-time touch events and forwards them to the renderer process.
 */
export class SnapTestWebSocketServer {
  private wss: WebSocketServer | null = null
  private mainWindow: BrowserWindow | null = null
  private connectedClients: Map<WebSocket, DeviceInfo> = new Map()
  private bonjourInstance: any = null
  private bonjourService: any = null
  private currentIP: string = ''

  constructor(private port: number = 8080) {}

  /**
   * Start WebSocket server
   */
  start(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow

    // CRITICAL: Bind to 0.0.0.0 (all network interfaces) to accept connections from iPhone
    this.wss = new WebSocketServer({
      port: this.port,
      host: '0.0.0.0' // Listen on all network interfaces, not just localhost
    })

    this.wss.on('listening', () => {
      this.announceServerAddresses()
    })

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIP = req.socket.remoteAddress
      console.log(`🔵 [WebSocket Server] New connection from ${clientIP}`)

      this.handleConnection(ws)
    })

    this.wss.on('error', (error) => {
      console.error('❌ [WebSocket Server] Error:', error)
      this.notifyRenderer('server-error', { error: error.message })
    })
  }

  /**
   * Stop WebSocket server
   */
  stop() {
    if (this.wss) {
      console.log('🔴 [WebSocket Server] Stopping...')

      // Stop Bonjour service
      this.stopBonjourService()

      // Close all client connections
      this.connectedClients.forEach((_, ws) => {
        ws.close()
      })
      this.connectedClients.clear()

      this.wss.close(() => {
        console.log('🔴 [WebSocket Server] Stopped')
        this.notifyRenderer('server-stopped', {})
      })

      this.wss = null
    }
  }

  /**
   * Send command to SDK (start/stop recording)
   */
  sendCommand(deviceId: string, commandType: 'startRecording' | 'stopRecording') {
    console.log(`📤 [WebSocket Server] Sending command: ${commandType} to device ${deviceId}`)

    const command: SDKCommand = {
      type: commandType,
      timestamp: Date.now()
    }

    // Find client with matching device ID
    for (const [ws, deviceInfo] of this.connectedClients.entries()) {
      if (deviceInfo.bundleId === deviceId || deviceInfo.deviceName === deviceId) {
        this.sendJSON(ws, command)
        return true
      }
    }

    console.warn(`⚠️ [WebSocket Server] Device not found: ${deviceId}`)
    return false
  }

  /**
   * Get list of connected devices
   */
  getConnectedDevices(): DeviceInfo[] {
    return Array.from(this.connectedClients.values())
  }

  /**
   * Manually refresh network detection and republish Bonjour service
   * Called when user clicks refresh button in UI
   */
  public refreshNetwork() {
    console.log('🔄 [Network] Manual refresh requested...')
    this.announceServerAddresses()
  }

  // ==================== Private Methods ====================

  /**
   * Announce server addresses and (re)publish Bonjour service
   * Called on startup and when network changes
   */
  private announceServerAddresses() {
    const allAddresses = getAllLocalIPAddresses()
    const primaryIP = getLocalIPAddress()

    // Check if IP changed
    if (this.currentIP && this.currentIP !== primaryIP) {
      console.log(`🔄 [Network] IP changed from ${this.currentIP} to ${primaryIP}`)
      console.log(`🔄 [Network] Republishing Bonjour service...`)
    }

    this.currentIP = primaryIP

    console.log(`🟢 [WebSocket Server] Listening on ws://0.0.0.0:${this.port}`)
    console.log(`🟢 [WebSocket Server] Available connection addresses:`)
    allAddresses.forEach(addr => {
      const isPrimary = addr.address === primaryIP
      const marker = isPrimary ? '⭐' : '  '
      console.log(`${marker}   ws://${addr.address}:${this.port} (${addr.interface})`)
    })

    if (allAddresses.some(addr => addr.interface.startsWith('bridge'))) {
      console.log(`📱 [WebSocket Server] iPhone Hotspot detected - use bridge interface IP`)
    }

    // Start/Restart Bonjour service (handles unpublish/republish internally)
    this.startBonjourService()

    // Notify renderer with network information
    this.notifyRenderer('server-started', {
      port: this.port,
      ip: primaryIP,
      allIPs: allAddresses
    })
  }

  /**
   * Start Bonjour service for auto-discovery
   */
  private startBonjourService() {
    try {
      // If instance already exists, reuse it (don't create a new one)
      if (!this.bonjourInstance) {
        this.bonjourInstance = new Bonjour()
      }

      // Unpublish existing service if any (for network refresh)
      if (this.bonjourService) {
        try {
          this.bonjourService.stop()
          this.bonjourService = null
        } catch (error) {
          console.error('❌ [Bonjour] Failed to stop existing service:', error)
        }
      }

      // Small delay to ensure service name is released
      setTimeout(() => {
        this.bonjourService = this.bonjourInstance.publish({
          name: 'SnapTest Desktop',
          type: 'snaptest',
          port: this.port,
          txt: {
            version: '1.0',
            protocol: 'websocket'
          }
        })

        console.log('🔍 [Bonjour] Service published: _snaptest._tcp.local')
        console.log(`🔍 [Bonjour] iOS devices can now auto-discover this server`)
      }, 100) // 100ms delay to allow service name to be released
    } catch (error) {
      console.error('❌ [Bonjour] Failed to publish service:', error)
    }
  }

  /**
   * Stop Bonjour service
   */
  private stopBonjourService() {
    if (this.bonjourService) {
      try {
        this.bonjourService.stop()
        console.log('🔍 [Bonjour] Service unpublished')
      } catch (error) {
        console.error('❌ [Bonjour] Failed to unpublish service:', error)
      }
      this.bonjourService = null
    }

    if (this.bonjourInstance) {
      try {
        this.bonjourInstance.destroy()
      } catch (error) {
        console.error('❌ [Bonjour] Failed to destroy instance:', error)
      }
      this.bonjourInstance = null
    }
  }

  private handleConnection(ws: WebSocket) {
    // Set up message handler
    ws.on('message', (data: Buffer) => {
      try {
        const rawString = data.toString()

        // 🔍 LOG COMPLETE RAW MESSAGE (unfiltered!)
        console.log('🔍 [WebSocket Server] ===== RAW MESSAGE START =====')
        console.log(rawString)
        console.log('🔍 [WebSocket Server] ===== RAW MESSAGE END =====')

        const message = JSON.parse(rawString)

        // Also log parsed object structure
        console.log('🔍 [WebSocket Server] Parsed message keys:', Object.keys(message))
        if (message.element) {
          console.log('🔍 [WebSocket Server] Element keys:', Object.keys(message.element))
          console.log('🔍 [WebSocket Server] Has hierarchy?', !!message.element.hierarchy)
          console.log('🔍 [WebSocket Server] Hierarchy length:', message.element.hierarchy?.length || 0)
        }

        this.handleMessage(ws, message)
      } catch (error) {
        console.error('❌ [WebSocket Server] Failed to parse message:', error)
      }
    })

    // Set up close handler
    ws.on('close', () => {
      const deviceInfo = this.connectedClients.get(ws)
      console.log(`🔴 [WebSocket Server] Client disconnected: ${deviceInfo?.deviceName || 'unknown'}`)

      this.connectedClients.delete(ws)
      this.notifyRenderer('sdk-disconnected', { device: deviceInfo })
    })

    // Set up error handler
    ws.on('error', (error) => {
      console.error('❌ [WebSocket Server] Client error:', error)
    })

    // Send welcome message
    this.sendJSON(ws, {
      type: 'welcome',
      message: 'Connected to SnapTest Desktop',
      timestamp: Date.now()
    })
  }

  private handleMessage(ws: WebSocket, message: SDKEvent) {
    console.log(`📥 [WebSocket Server] Received event: ${message.type}`)

    switch (message.type) {
      case 'handshake':
        this.handleHandshake(ws, message as HandshakeEvent)
        break

      case 'touch':
        this.handleTouchEvent(ws, message as TouchEvent)
        break

      case 'pong':
        // Heartbeat response
        console.log('🏓 [WebSocket Server] Pong received')
        break

      case 'actionResult':
        this.handleActionResult(ws, message)
        break

      case 'executionLog':
        this.handleExecutionLog(ws, message as ExecutionLogEvent)
        break

      case 'viewHierarchyResponse':
        this.handleViewHierarchyResponse(ws, message)
        break

      default:
        console.warn(`⚠️ [WebSocket Server] Unknown event type: ${message.type}`)
    }
  }

  private handleHandshake(ws: WebSocket, handshake: HandshakeEvent) {
    const deviceInfo: DeviceInfo = {
      deviceName: handshake.deviceName,
      deviceModel: handshake.deviceModel,
      systemVersion: handshake.systemVersion,
      bundleId: handshake.bundleId,
      connectedAt: Date.now()
    }

    this.connectedClients.set(ws, deviceInfo)

    console.log(`🤝 [WebSocket Server] Handshake completed:`, deviceInfo)

    // Notify renderer
    this.notifyRenderer('sdk-connected', { device: deviceInfo })

    // Send acknowledgment
    this.sendJSON(ws, {
      type: 'handshake-ack',
      message: 'Handshake successful',
      timestamp: Date.now()
    })
  }

  private handleTouchEvent(ws: WebSocket, touchEvent: TouchEvent) {
    const deviceInfo = this.connectedClients.get(ws)

    if (!deviceInfo) {
      console.warn('⚠️ [WebSocket Server] Touch event from unknown device')
      return
    }

    // Enhanced logging for typing events
    if (touchEvent.gestureType === 'type') {
      console.log(`⌨️  [WebSocket Server] Type event: "${touchEvent.value}" in ${touchEvent.element?.className || 'unknown element'}`)
    } else {
      console.log(`👆 [WebSocket Server] Touch event: ${touchEvent.gestureType} at (${touchEvent.coordinates.x}, ${touchEvent.coordinates.y})`)
    }

    // 🎯 ENHANCE: Find actual clickable element from hierarchy
    // This fixes the issue of recording container views instead of actual buttons
    if (touchEvent.element?.viewHierarchyDebugDescription && touchEvent.gestureType === 'tap') {
      console.log('🔍 [Element Finder] Analyzing hierarchy to find actual clickable element...')

      try {
        // Parse the hierarchy string into a tree structure
        const hierarchy = parseViewHierarchy(touchEvent.element.viewHierarchyDebugDescription)

        if (hierarchy) {
          console.log(`📊 [Element Finder] Searching at coordinates: (${touchEvent.coordinates.x}, ${touchEvent.coordinates.y})`)
          console.log(`📊 [Element Finder] Root frame: (${hierarchy.frame.x}, ${hierarchy.frame.y}, ${hierarchy.frame.width}, ${hierarchy.frame.height})`)

          // Find the actual element at the tap coordinates
          const actualElement = findElementAtCoordinates(
            hierarchy,
            touchEvent.coordinates.x,
            touchEvent.coordinates.y,
            { preferClickable: true, returnDeepest: true }
          )

          if (actualElement) {
            console.log(`🎯 [Element Finder] Found element: ${actualElement.className}`)
            console.log(`   └─ Frame: (${actualElement.frame.x}, ${actualElement.frame.y}, ${actualElement.frame.width}, ${actualElement.frame.height})`)
            console.log(`   └─ ID: "${actualElement.accessibilityIdentifier || '(none)'}"`)
          }

          if (actualElement) {
            const originalId = touchEvent.element.accessibilityIdentifier
            const originalClass = touchEvent.element.className

            // Check if we found a more specific element than what was recorded
            if (
              actualElement.accessibilityIdentifier &&
              (actualElement.accessibilityIdentifier !== originalId || actualElement.className !== originalClass)
            ) {
              console.log(`🎯 [Element Finder] Found actual clickable element!`)
              console.log(`   ├─ Original: ${originalClass} "${originalId}"`)
              console.log(`   └─ Actual:   ${actualElement.className} "${actualElement.accessibilityIdentifier}"`)

              // OVERRIDE recorded selector with actual button
              touchEvent.element.accessibilityIdentifier = actualElement.accessibilityIdentifier
              touchEvent.element.className = actualElement.className

              if (actualElement.accessibilityLabel) {
                touchEvent.element.accessibilityLabel = actualElement.accessibilityLabel
              }

              // Update bounds to actual element's bounds
              touchEvent.element.bounds = {
                x: actualElement.frame.x,
                y: actualElement.frame.y,
                width: actualElement.frame.width,
                height: actualElement.frame.height
              }
            } else {
              console.log(`✅ [Element Finder] Recorded element is already the actual button (${actualElement.className})`)
            }
          } else {
            console.log(`⚠️ [Element Finder] No element found at coordinates (${touchEvent.coordinates.x}, ${touchEvent.coordinates.y})`)
          }
        } else {
          console.log(`⚠️ [Element Finder] Failed to parse hierarchy`)
        }
      } catch (error) {
        console.error(`❌ [Element Finder] Error finding element:`, error)
      }
    }

    // Forward to renderer
    this.notifyRenderer('sdk-event', {
      device: deviceInfo,
      event: touchEvent
    })
  }

  private handleActionResult(ws: WebSocket, message: any) {
    const deviceInfo = this.connectedClients.get(ws)

    if (!deviceInfo) {
      console.warn('⚠️ [WebSocket Server] Action result from unknown device')
      return
    }

    console.log(`📊 [WebSocket Server] Action result: ${message.actionId} - ${message.success ? '✅' : '❌'} (${message.duration}ms)`)

    // Forward to renderer for sdkActionExecutor to handle
    this.notifyRenderer('sdk-action-result', {
      deviceId: deviceInfo.bundleId,
      result: {
        actionId: message.actionId,
        success: message.success,
        error: message.error,
        duration: message.duration
      }
    })
  }

  private handleExecutionLog(ws: WebSocket, message: ExecutionLogEvent) {
    const deviceInfo = this.connectedClients.get(ws)

    if (!deviceInfo) {
      console.warn('⚠️ [WebSocket Server] Execution log from unknown device')
      return
    }

    // Log in Electron console (not colored here, will be colored in renderer)
    console.log(`🟢 [EXECUTION] ${message.actionId} - ${message.step}: ${message.message}`)
    if (message.data) {
      if (message.data.elementType) {
        console.log(`   Element: ${message.data.elementType}`)
      }
      if (message.data.bounds) {
        console.log(`   Bounds: (${message.data.bounds.x}, ${message.data.bounds.y}, ${message.data.bounds.width}, ${message.data.bounds.height})`)
      }
      if (message.data.centerPoint) {
        console.log(`   Center: (${message.data.centerPoint.x}, ${message.data.centerPoint.y})`)
      }
      if (message.data.tapStrategy) {
        console.log(`   Strategy: ${message.data.tapStrategy}`)
      }
    }

    // Forward to renderer for green console logging
    this.notifyRenderer('sdk-execution-log', {
      deviceId: deviceInfo.bundleId,
      log: {
        actionId: message.actionId,
        step: message.step,
        message: message.message,
        data: message.data,
        timestamp: message.timestamp
      }
    })
  }

  private handleViewHierarchyResponse(ws: WebSocket, message: any) {
    const deviceInfo = this.connectedClients.get(ws)

    if (!deviceInfo) {
      console.warn('⚠️ [WebSocket Server] View hierarchy response from unknown device')
      return
    }

    if (message.success) {
      console.log(`🌳 [WebSocket Server] View hierarchy received: ${message.hierarchy?.length || 0} characters`)
    } else {
      console.error(`❌ [WebSocket Server] View hierarchy error: ${message.error}`)
    }

    // Forward to renderer for mobileTextToFlowController to handle
    this.notifyRenderer('sdk-view-hierarchy-response', {
      deviceId: deviceInfo.bundleId,
      response: {
        success: message.success,
        hierarchy: message.hierarchy,
        error: message.error
      }
    })
  }

  /**
   * Send any command/message to a specific device
   */
  sendToDevice(deviceId: string, message: any): boolean {
    console.log(`📤 [WebSocket Server] Sending message to device ${deviceId}:`, message.type)

    // Extract UDID from device ID if it's in format "ios-usb-UDID" or "android-UDID"
    const udidMatch = deviceId.match(/(?:ios-usb-|android-)([A-F0-9-]+)/i)
    const extractedUdid = udidMatch ? udidMatch[1] : null

    // Find client with matching device ID, bundleId, deviceName, or UDID
    for (const [ws, deviceInfo] of this.connectedClients.entries()) {
      if (
        deviceInfo.bundleId === deviceId ||
        deviceInfo.deviceName === deviceId ||
        (extractedUdid && deviceInfo.bundleId.includes(extractedUdid))
      ) {
        console.log(`✅ [WebSocket Server] Found matching device: ${deviceInfo.deviceName} (${deviceInfo.bundleId})`)
        console.log(`📤 [WebSocket Server] Sending to SDK:`, JSON.stringify(message))
        this.sendJSON(ws, message)
        return true
      }
    }

    console.warn(`⚠️ [WebSocket Server] Device not found: ${deviceId}`)
    console.warn(`⚠️ [WebSocket Server] Connected devices:`, Array.from(this.connectedClients.values()).map(d => `${d.deviceName} (${d.bundleId})`))
    return false
  }

  private sendJSON(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  private notifyRenderer(channel: string, data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(`sdk:${channel}`, data)
    }
  }
}

interface DeviceInfo {
  deviceName: string
  deviceModel: string
  systemVersion: string
  bundleId: string
  connectedAt: number
}

// Singleton instance
let serverInstance: SnapTestWebSocketServer | null = null

/**
 * Get or create WebSocket server instance
 */
export function getWebSocketServer(): SnapTestWebSocketServer {
  if (!serverInstance) {
    serverInstance = new SnapTestWebSocketServer(8080)
  }
  return serverInstance
}

/**
 * Stop WebSocket server
 */
export function stopWebSocketServer() {
  if (serverInstance) {
    serverInstance.stop()
    serverInstance = null
  }
}
