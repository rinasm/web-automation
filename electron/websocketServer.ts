import { WebSocketServer, WebSocket } from 'ws'
import { BrowserWindow } from 'electron'
import Bonjour from 'bonjour-service'
import { networkInterfaces } from 'os'
import { parseViewHierarchy, findElementAtCoordinates } from './hierarchyElementFinder'

/**
 * Check if an interface name indicates a VPN/tunnel connection
 * VPN interfaces are virtual tunnels, not physical network connections
 */
function isVPNInterface(interfaceName: string): boolean {
  const vpnPatterns = [
    /^utun/i,      // macOS/iOS VPN tunnels (utun0, utun1, etc.)
    /^tun/i,       // Generic tunnel interfaces (OpenVPN, WireGuard)
    /^tap/i,       // TAP virtual network interfaces
    /^ppp/i,       // Point-to-Point Protocol (legacy VPN)
    /^ipsec/i,     // IPsec VPN interfaces
    /^wg/i,        // WireGuard VPN (wg0, wg1, etc.)
    /^vpn/i,       // Generic VPN naming
    /^tun\d+$/i,   // Linux tunnel interfaces
    /^tailscale/i, // Tailscale VPN
    /^zt/i,        // ZeroTier VPN
    /^veth/i,      // Docker/container virtual ethernet
    /^docker/i,    // Docker bridge interfaces
    /^br-/i,       // Linux bridge interfaces (Docker, libvirt)
    /^virbr/i,     // Virtual machine bridges (libvirt)
  ]

  return vpnPatterns.some(pattern => pattern.test(interfaceName))
}

/**
 * Determine the type of network interface
 */
function getInterfaceType(interfaceName: string): 'hotspot' | 'wifi' | 'ethernet' | 'vpn' | 'virtual' | 'other' {
  if (isVPNInterface(interfaceName)) {
    return 'vpn'
  }

  // iPhone hotspot (macOS creates bridge interfaces)
  if (interfaceName.startsWith('bridge')) {
    return 'hotspot'
  }

  // WiFi interfaces
  if (interfaceName === 'en0' || interfaceName === 'wlan0' || interfaceName.match(/^wl/)) {
    return 'wifi'
  }

  // Ethernet interfaces
  if (interfaceName === 'en1' || interfaceName === 'eth0' || interfaceName.match(/^eth\d+$/)) {
    return 'ethernet'
  }

  // Virtual/loopback (should already be filtered by internal flag)
  if (interfaceName === 'lo' || interfaceName === 'lo0') {
    return 'virtual'
  }

  return 'other'
}

/**
 * Get all local IP addresses for network interfaces
 * Returns all non-internal IPv4 addresses with their interface names and types
 */
function getAllLocalIPAddresses(): Array<{interface: string, address: string, type: string}> {
  const nets = networkInterfaces()
  const addresses: Array<{interface: string, address: string, type: string}> = []

  for (const name of Object.keys(nets)) {
    const interfaces = nets[name]
    if (!interfaces) continue

    for (const net of interfaces) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        const type = getInterfaceType(name)
        addresses.push({ interface: name, address: net.address, type })
      }
    }
  }

  return addresses
}

/**
 * Get primary local IP address for display
 * Filters out VPN/tunnel interfaces to ensure local network connectivity
 * Priority: iPhone hotspot (bridge*) > WiFi (en0/wlan0) > Ethernet > Other physical interfaces
 */
function getLocalIPAddress(): string {
  const allAddresses = getAllLocalIPAddresses()

  // Log all detected interfaces for debugging
  console.log(`🔍 [Network] Detected ${allAddresses.length} network interface(s):`)
  allAddresses.forEach(addr => {
    const typeEmoji = {
      'hotspot': '📱',
      'wifi': '📶',
      'ethernet': '🔌',
      'vpn': '🔒',
      'virtual': '💻',
      'other': '❓'
    }[addr.type] || '❓'
    console.log(`   ${typeEmoji} ${addr.interface} (${addr.type}): ${addr.address}`)
  })

  // Filter out VPN and virtual interfaces for local network communication
  const physicalAddresses = allAddresses.filter(addr => addr.type !== 'vpn' && addr.type !== 'virtual')

  if (physicalAddresses.length === 0) {
    console.warn('⚠️ [Network] No physical network interfaces found (only VPN/virtual)')
    console.warn('⚠️ [Network] This may prevent device connections. Consider disconnecting VPN or using WiFi.')
    if (allAddresses.length > 0) {
      // Fallback to first available address (even if VPN)
      const fallback = allAddresses[0]
      console.warn(`⚠️ [Network] Falling back to ${fallback.interface} (${fallback.type}): ${fallback.address}`)
      return fallback.address
    }
    return '127.0.0.1'
  }

  // Prioritize iPhone hotspot (bridge interfaces) - best for iPhone testing
  const hotspotInterface = physicalAddresses.find(addr => addr.type === 'hotspot')
  if (hotspotInterface) {
    console.log(`✅ [Network] Using iPhone Hotspot: ${hotspotInterface.interface} → ${hotspotInterface.address}`)
    return hotspotInterface.address
  }

  // Then WiFi interface (most common for local testing)
  const wifiInterface = physicalAddresses.find(addr => addr.type === 'wifi')
  if (wifiInterface) {
    console.log(`✅ [Network] Using WiFi: ${wifiInterface.interface} → ${wifiInterface.address}`)
    return wifiInterface.address
  }

  // Then Ethernet (also good for local network)
  const ethernetInterface = physicalAddresses.find(addr => addr.type === 'ethernet')
  if (ethernetInterface) {
    console.log(`✅ [Network] Using Ethernet: ${ethernetInterface.interface} → ${ethernetInterface.address}`)
    return ethernetInterface.address
  }

  // Fallback to first physical interface
  const firstPhysical = physicalAddresses[0]
  console.log(`✅ [Network] Using interface: ${firstPhysical.interface} (${firstPhysical.type}) → ${firstPhysical.address}`)
  return firstPhysical.address
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
  type: 'startRecording' | 'stopRecording' | 'ping' | 'executeAction' | 'startNetworkMonitoring' | 'stopNetworkMonitoring'
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

interface NetworkEvent extends SDKEvent {
  type: 'network'
  requestId: string
  method: string
  url: string
  requestHeaders: Record<string, string>
  requestBody?: string // Base64 encoded
  requestBodySize: number
  responseStatus?: number
  responseHeaders: Record<string, string>
  responseBody?: string // Base64 encoded
  responseBodySize: number
  responseMimeType?: string
  startTime: number // Unix timestamp in milliseconds
  endTime?: number // Unix timestamp in milliseconds
  totalDuration: number // milliseconds
  waitTime: number // Time waiting for first byte (milliseconds)
  downloadTime: number // Time downloading response (milliseconds)
  error?: string
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
  private clientIPs: Map<WebSocket, string> = new Map() // Track client IP addresses
  private bonjourInstance: any = null
  private bonjourService: any = null
  private currentIP: string = ''
  private networkCheckInterval: NodeJS.Timeout | null = null

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

      // Store client IP for device ID matching
      if (clientIP) {
        // Clean up IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
        const cleanIP = clientIP.replace('::ffff:', '')
        this.clientIPs.set(ws, cleanIP)
      }

      this.handleConnection(ws)
    })

    this.wss.on('error', (error) => {
      console.error('❌ [WebSocket Server] Error:', error)
      this.notifyRenderer('server-error', { error: error.message })
    })

    // Start network change detection
    this.startNetworkMonitoring()
  }

  /**
   * Stop WebSocket server
   */
  stop() {
    if (this.wss) {
      console.log('🔴 [WebSocket Server] Stopping...')

      // Stop network monitoring
      this.stopNetworkMonitoring()

      // Stop Bonjour service
      this.stopBonjourService()

      // Close all client connections
      this.connectedClients.forEach((_, ws) => {
        ws.close()
      })
      this.connectedClients.clear()
      this.clientIPs.clear() // Clean up IP tracking

      this.wss.close(() => {
        console.log('🔴 [WebSocket Server] Stopped')
        this.notifyRenderer('server-stopped', {})
      })

      this.wss = null
    }
  }

  /**
   * Send command to SDK (start/stop recording, network monitoring)
   */
  sendCommand(deviceId: string, commandType: 'startRecording' | 'stopRecording' | 'startNetworkMonitoring' | 'stopNetworkMonitoring') {
    console.log(`📤 [WebSocket Server] Sending command: ${commandType} to device ${deviceId}`)

    const command: SDKCommand = {
      type: commandType,
      timestamp: Date.now()
    }

    // Find client with matching device ID
    for (const [ws, deviceInfo] of this.connectedClients.entries()) {
      if (deviceInfo.bundleId === deviceId || deviceInfo.deviceName === deviceId) {
        this.sendJSON(ws, command)
        console.log(`✅ [WebSocket Server] Command sent: ${commandType}`)
        return true
      }
    }

    console.warn(`⚠️ [WebSocket Server] Device not found: ${deviceId}`)
    console.warn(`⚠️ [WebSocket Server] Connected devices:`, Array.from(this.connectedClients.values()).map(d => `${d.deviceName} (${d.bundleId})`))
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

  /**
   * Start monitoring for network changes
   * Checks every 30 seconds if the IP address has changed
   */
  private startNetworkMonitoring() {
    console.log('🔍 [Network] Starting network change detection...')

    // Check for network changes every 30 seconds
    this.networkCheckInterval = setInterval(() => {
      const newIP = getLocalIPAddress()

      if (newIP !== this.currentIP) {
        console.log(`🔄 [Network] Network change detected: ${this.currentIP} → ${newIP}`)

        // Clear stale device connections (they may not be reachable on new network)
        this.clearStaleConnections()

        // Announce new network addresses
        this.announceServerAddresses()
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Stop monitoring for network changes
   */
  private stopNetworkMonitoring() {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval)
      this.networkCheckInterval = null
      console.log('🔍 [Network] Network change detection stopped')
    }
  }

  /**
   * Clear stale device connections
   * Called when network changes, as devices may no longer be reachable
   */
  private clearStaleConnections() {
    const deviceCount = this.connectedClients.size

    if (deviceCount === 0) {
      return
    }

    console.log(`🧹 [Network] Clearing ${deviceCount} stale device connection(s) due to network change...`)

    // Close all WebSocket connections
    this.connectedClients.forEach((deviceInfo, ws) => {
      console.log(`   ❌ Disconnecting: ${deviceInfo.deviceName} (${deviceInfo.bundleId})`)
      try {
        ws.close(1001, 'Network changed') // 1001 = Going Away
      } catch (error) {
        console.error(`   ⚠️  Failed to close connection for ${deviceInfo.deviceName}:`, error)
      }
    })

    // Clear the maps
    this.connectedClients.clear()
    this.clientIPs.clear()

    // Notify renderer to update UI
    this.notifyRenderer('devices-cleared', {
      reason: 'network-change',
      message: 'Network changed - cleared stale device connections'
    })

    console.log('🧹 [Network] Stale connections cleared')
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

    // Separate physical and VPN interfaces for clearer display
    const physicalAddresses = allAddresses.filter(addr => addr.type !== 'vpn' && addr.type !== 'virtual')
    const vpnAddresses = allAddresses.filter(addr => addr.type === 'vpn' || addr.type === 'virtual')

    // Show physical interfaces first (these are the ones that should be used)
    physicalAddresses.forEach(addr => {
      const isPrimary = addr.address === primaryIP
      const marker = isPrimary ? '⭐' : '  '
      const typeEmoji = {
        'hotspot': '📱',
        'wifi': '📶',
        'ethernet': '🔌',
        'other': '🌐'
      }[addr.type] || '🌐'
      console.log(`${marker} ${typeEmoji} ws://${addr.address}:${this.port} (${addr.interface} - ${addr.type})`)
    })

    // Show VPN interfaces separately with warning
    if (vpnAddresses.length > 0) {
      console.log(`\n🔒 [Network] VPN/Virtual interfaces detected (filtered out):`)
      vpnAddresses.forEach(addr => {
        console.log(`   🔒 ${addr.interface} (${addr.type}): ${addr.address} - Not used for device connections`)
      })
      console.log(`💡 [Network] Tip: Devices should connect via WiFi/physical network, not VPN`)
    }

    if (allAddresses.some(addr => addr.type === 'hotspot')) {
      console.log(`\n📱 [WebSocket Server] iPhone Hotspot detected - devices can connect directly!`)
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
        const message = JSON.parse(rawString)

        // 🔍 SMART LOGGING: Filter out screenshot data to prevent memory leak
        // Screenshots can be 800+ lines of base64 data and cause heap exhaustion
        if (message.type === 'screenshotResponse') {
          console.log('🔍 [WebSocket Server] Received message: screenshotResponse')
          console.log('🔍 [WebSocket Server] Screenshot data size:', message.image?.length || 0, 'characters')
          console.log('🔍 [WebSocket Server] Success:', message.success)
        } else {
          // Log full message for non-screenshot events
          console.log('🔍 [WebSocket Server] ===== RAW MESSAGE START =====')
          console.log(rawString)
          console.log('🔍 [WebSocket Server] ===== RAW MESSAGE END =====')

          console.log('🔍 [WebSocket Server] Parsed message keys:', Object.keys(message))
          if (message.element) {
            console.log('🔍 [WebSocket Server] Element keys:', Object.keys(message.element))
            console.log('🔍 [WebSocket Server] Has hierarchy?', !!message.element.hierarchy)
            console.log('🔍 [WebSocket Server] Hierarchy length:', message.element.hierarchy?.length || 0)
          }
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
      this.clientIPs.delete(ws) // Clean up IP tracking
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

      case 'network':
        this.handleNetworkEvent(ws, message as NetworkEvent)
        break

      case 'screenshotResponse':
        this.handleScreenshotResponse(ws, message)
        break

      default:
        console.warn(`⚠️ [WebSocket Server] Unknown event type: ${message.type}`)
    }
  }

  private handleHandshake(ws: WebSocket, handshake: HandshakeEvent) {
    const clientIP = this.clientIPs.get(ws)

    const deviceInfo: DeviceInfo = {
      deviceName: handshake.deviceName,
      deviceModel: handshake.deviceModel,
      systemVersion: handshake.systemVersion,
      bundleId: handshake.bundleId,
      connectedAt: Date.now(),
      ipAddress: clientIP // Store IP address for ios-wifi-XXX device ID matching
    }

    this.connectedClients.set(ws, deviceInfo)

    console.log(`🤝 [WebSocket Server] Handshake completed:`, deviceInfo)
    if (clientIP) {
      console.log(`🌐 [WebSocket Server] Device IP: ${clientIP} -> will match ios-wifi-${clientIP.replace(/\./g, '-')}`)
    }

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

  private handleScreenshotResponse(ws: WebSocket, message: any) {
    const deviceInfo = this.connectedClients.get(ws)

    if (!deviceInfo) {
      console.warn('⚠️ [WebSocket Server] Screenshot response from unknown device')
      return
    }

    console.log(`📸 [WebSocket Server] Screenshot response received: success=${message.success}, imageSize=${message.image?.length || 0} chars`)
    console.log(`📸 [WebSocket Server] Forwarding to renderer for device: ${deviceInfo.bundleId}`)

    // Forward to renderer for sdkActionExecutor to handle
    this.notifyRenderer('sdk-screenshot-result', {
      deviceId: deviceInfo.bundleId,
      result: {
        success: message.success,
        image: message.image,
        format: message.format,
        error: message.error
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

  private handleNetworkEvent(ws: WebSocket, networkEvent: NetworkEvent) {
    const deviceInfo = this.connectedClients.get(ws)

    if (!deviceInfo) {
      console.warn('⚠️ [WebSocket Server] Network event from unknown device')
      return
    }

    // Log network request/response
    if (networkEvent.endTime) {
      // Complete request
      const statusEmoji = networkEvent.error ? '❌' : networkEvent.responseStatus && networkEvent.responseStatus >= 400 ? '⚠️' : '✅'
      console.log(`🌐 [WebSocket Server] ${statusEmoji} ${networkEvent.method} ${networkEvent.url} - ${networkEvent.responseStatus || 'ERROR'} (${networkEvent.totalDuration}ms)`)
      if (networkEvent.error) {
        console.log(`   └─ Error: ${networkEvent.error}`)
      }
    } else {
      // Request started
      console.log(`🌐 [WebSocket Server] ⏱️ ${networkEvent.method} ${networkEvent.url} - Started`)
    }

    // Forward to renderer for Network Panel
    this.notifyRenderer('sdk-network-event', {
      deviceId: deviceInfo.bundleId,
      device: deviceInfo,
      event: networkEvent
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

    // Extract IP or hostname from ios-wifi-XXX format
    // New format: ios-wifi-iphone (hostname-based)
    // Old format: ios-wifi-192-168-1-100 (IP-based, for backward compatibility)
    const wifiMatch = deviceId.match(/^ios-wifi-(.+)$/)
    const wifiIdentifier = wifiMatch ? wifiMatch[1] : null

    // Try to parse as IP (backward compatibility with old format)
    const isIPFormat = wifiIdentifier && /^\d+(-\d+){3}$/.test(wifiIdentifier)
    const wifiIP = isIPFormat ? wifiIdentifier.replace(/-/g, '.') : null

    // Extract hostname from new format (ios-wifi-iphone -> iphone)
    const wifiHostname = wifiIdentifier && !isIPFormat ? wifiIdentifier : null

    // Find client with matching device ID, bundleId, deviceName, UDID, hostname, or IP address
    for (const [ws, deviceInfo] of this.connectedClients.entries()) {
      const ipMatch = wifiIP && deviceInfo.ipAddress === wifiIP

      // Hostname matching: flexible matching by normalizing both names
      const normalizeHostname = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
      const hostnameMatch = wifiHostname &&
        (normalizeHostname(deviceInfo.deviceName).includes(wifiHostname) ||
         wifiHostname.includes(normalizeHostname(deviceInfo.deviceName)))

      if (
        deviceInfo.bundleId === deviceId ||
        deviceInfo.deviceName === deviceId ||
        (extractedUdid && deviceInfo.bundleId.includes(extractedUdid)) ||
        ipMatch || // Match by IP address (backward compatibility)
        hostnameMatch // Match by hostname (new format)
      ) {
        console.log(`✅ [WebSocket Server] Found matching device: ${deviceInfo.deviceName} (${deviceInfo.bundleId})`)
        if (ipMatch) {
          console.log(`✅ [WebSocket Server] Matched by IP address: ${deviceInfo.ipAddress}`)
        } else if (hostnameMatch) {
          console.log(`✅ [WebSocket Server] Matched by hostname: ${wifiHostname}`)
        }
        console.log(`📤 [WebSocket Server] Sending to SDK:`, JSON.stringify(message))
        this.sendJSON(ws, message)
        return true
      }
    }

    console.warn(`⚠️ [WebSocket Server] Device not found: ${deviceId}`)
    console.warn(`⚠️ [WebSocket Server] Connected devices:`, Array.from(this.connectedClients.values()).map(d => `${d.deviceName} (${d.bundleId}) [IP: ${d.ipAddress || 'unknown'}]`))
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
  ipAddress?: string // Client IP address for matching ios-wifi-XXX device IDs
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
