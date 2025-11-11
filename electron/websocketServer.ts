import { WebSocketServer, WebSocket } from 'ws'
import { BrowserWindow } from 'electron'
import Bonjour from 'bonjour-service'

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

  constructor(private port: number = 8080) {}

  /**
   * Start WebSocket server
   */
  start(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow

    this.wss = new WebSocketServer({ port: this.port })

    this.wss.on('listening', () => {
      console.log(`🟢 [WebSocket Server] Listening on ws://localhost:${this.port}`)

      // Publish Bonjour service for auto-discovery
      this.startBonjourService()

      this.notifyRenderer('server-started', { port: this.port })
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

  // ==================== Private Methods ====================

  /**
   * Start Bonjour service for auto-discovery
   */
  private startBonjourService() {
    try {
      this.bonjourInstance = new Bonjour()

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
        const message = JSON.parse(data.toString())
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
