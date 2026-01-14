import { MobileDevice, AndroidDevice, IOSDevice, DeviceConnection, ConnectionStatus, ADBPairingInfo, DeviceCapabilities } from '../types/mobileDevice'

/**
 * Device Connection Service
 *
 * Handles connection to mobile devices via:
 * - Android: ADB over WiFi + Chrome DevTools Protocol (CDP)
 * - iOS: WebKit Remote Debugging (limited support)
 *
 * Note: This is a client-side service that communicates with Electron main process
 * for actual ADB/device operations. The main process will handle native device communication.
 */

export type DeviceEventType =
  | 'device-discovered'
  | 'device-connected'
  | 'device-disconnected'
  | 'device-error'
  | 'scan-complete'

export interface DeviceEvent {
  type: DeviceEventType
  device?: MobileDevice
  error?: string
  timestamp: number
}

export type DeviceEventListener = (event: DeviceEvent) => void

class DeviceConnectionService {
  private eventListeners: DeviceEventListener[] = []
  private scanInterval: NodeJS.Timeout | null = null
  private isElectronAvailable: boolean = false

  constructor() {
    // Check if running in Electron environment
    this.isElectronAvailable = typeof window !== 'undefined' && 'electronAPI' in window
    console.log('📱 [DEVICE SERVICE] Initialized. Electron available:', this.isElectronAvailable)
  }

  /**
   * Register event listener
   */
  on(listener: DeviceEventListener): void {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  off(listener: DeviceEventListener): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener)
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: DeviceEvent): void {
    console.log('📱 [DEVICE SERVICE] Event:', event.type, event.device?.name || '')
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('📱 [DEVICE SERVICE] Error in event listener:', error)
      }
    })
  }

  /**
   * Scan for devices on the network
   * For Android: Uses ADB to discover devices
   * For iOS: Uses WebKit remote inspection
   */
  async scanForDevices(): Promise<MobileDevice[]> {
    console.log('📱 [DEVICE SERVICE] Starting device scan...')

    if (!this.isElectronAvailable) {
      console.warn('📱 [DEVICE SERVICE] Electron API not available. Running in browser mode.')
      return this.getMockDevices() // Return mock devices for development
    }

    try {
      // Call Electron IPC to scan for real devices
      console.log('📱 [DEVICE SERVICE] Calling Electron IPC to scan for devices...')
      const result = await (window as any).electronAPI.invoke('mobile:scan-devices')

      if (!result.success) {
        throw new Error(result.error || 'Device scan failed')
      }

      const devices = result.devices || []
      console.log(`📱 [DEVICE SERVICE] Found ${devices.length} device(s)`)

      devices.forEach((device: MobileDevice) => {
        this.emit({
          type: 'device-discovered',
          device,
          timestamp: Date.now()
        })
      })

      this.emit({
        type: 'scan-complete',
        timestamp: Date.now()
      })

      return devices
    } catch (error: any) {
      console.error('📱 [DEVICE SERVICE] Scan error:', error)
      this.emit({
        type: 'device-error',
        error: error.message,
        timestamp: Date.now()
      })
      throw error
    }
  }

  /**
   * Connect to a specific device
   */
  async connectToDevice(device: MobileDevice): Promise<DeviceConnection> {
    console.log('📱 [DEVICE SERVICE] Connecting to device:', device.name)

    if (device.os === 'android') {
      return this.connectToAndroidDevice(device as AndroidDevice)
    } else {
      return this.connectToIOSDevice(device as IOSDevice)
    }
  }

  /**
   * Connect to Android device via ADB and CDP
   */
  private async connectToAndroidDevice(device: AndroidDevice): Promise<DeviceConnection> {
    console.log('📱 [DEVICE SERVICE] Connecting to Android device via ADB...')

    try {
      // Step 1: Establish ADB connection
      if (!this.isElectronAvailable) {
        console.warn('📱 [DEVICE SERVICE] Mock connection for development')
        return this.getMockConnection(device)
      }

      // In production:
      // 1. Connect via ADB: adb connect ${device.ip}:${device.port}
      // 2. Forward CDP port: adb -s ${device.adbId} forward tcp:9222 localabstract:chrome_devtools_remote
      // 3. Get CDP URL: http://localhost:9222/json
      // 4. Connect to CDP WebSocket

      const connection: DeviceConnection = {
        device,
        cdpUrl: `http://${device.ip}:9222`,
        socket: null // Will be WebSocket connection to CDP
      }

      this.emit({
        type: 'device-connected',
        device,
        timestamp: Date.now()
      })

      return connection
    } catch (error: any) {
      console.error('📱 [DEVICE SERVICE] Android connection error:', error)
      this.emit({
        type: 'device-error',
        device,
        error: error.message,
        timestamp: Date.now()
      })
      throw error
    }
  }

  /**
   * Connect to iOS device via WebKit remote debugging
   */
  private async connectToIOSDevice(device: IOSDevice): Promise<DeviceConnection> {
    console.log('📱 [DEVICE SERVICE] Connecting to iOS device via WebKit...')

    try {
      if (!this.isElectronAvailable) {
        console.warn('📱 [DEVICE SERVICE] Mock connection for development')
        return this.getMockConnection(device)
      }

      // In production:
      // 1. Use ios-webkit-debug-proxy to connect
      // 2. Connect to WebKit inspector protocol
      // 3. Forward to local port

      const connection: DeviceConnection = {
        device,
        webkitUrl: `http://${device.ip}:9221`,
        socket: null
      }

      this.emit({
        type: 'device-connected',
        device,
        timestamp: Date.now()
      })

      return connection
    } catch (error: any) {
      console.error('📱 [DEVICE SERVICE] iOS connection error:', error)
      this.emit({
        type: 'device-error',
        device,
        error: error.message,
        timestamp: Date.now()
      })
      throw error
    }
  }

  /**
   * Disconnect from device
   */
  async disconnectFromDevice(deviceId: string): Promise<void> {
    console.log('📱 [DEVICE SERVICE] Disconnecting from device:', deviceId)

    // Close WebSocket connection
    // Stop port forwarding
    // Disconnect ADB

    this.emit({
      type: 'device-disconnected',
      timestamp: Date.now()
    })
  }

  /**
   * Pair with Android device using pairing code (Android 11+)
   */
  async pairAndroidDevice(pairingInfo: ADBPairingInfo): Promise<AndroidDevice> {
    console.log('📱 [DEVICE SERVICE] Pairing Android device...')

    if (!this.isElectronAvailable) {
      console.warn('📱 [DEVICE SERVICE] Mock pairing for development')
      return this.getMockAndroidDevice()
    }

    // In production: adb pair ${pairingInfo.ip}:${pairingInfo.port}
    // Then enter pairing code when prompted

    throw new Error('Not implemented yet - will be handled by Electron main process')
  }

  /**
   * Get device capabilities (screen size, user agent, etc.)
   */
  async getDeviceCapabilities(device: MobileDevice): Promise<DeviceCapabilities> {
    console.log('📱 [DEVICE SERVICE] Getting device capabilities...')

    // This would query the device via CDP/WebKit
    // For now, return mock data based on device type

    if (device.os === 'android') {
      return {
        screenWidth: 1080,
        screenHeight: 2340,
        pixelRatio: 3,
        userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36',
        hasTouch: true,
        supportsOrientation: true,
        supportsGeolocation: true
      }
    } else {
      return {
        screenWidth: 1170,
        screenHeight: 2532,
        pixelRatio: 3,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        hasTouch: true,
        supportsOrientation: true,
        supportsGeolocation: true
      }
    }
  }

  /**
   * Start auto-scan interval
   */
  startAutoScan(intervalMs: number = 10000): void {
    console.log('📱 [DEVICE SERVICE] Starting auto-scan (interval:', intervalMs, 'ms)')

    if (this.scanInterval) {
      this.stopAutoScan()
    }

    this.scanInterval = setInterval(() => {
      this.scanForDevices().catch(error => {
        console.error('📱 [DEVICE SERVICE] Auto-scan error:', error)
      })
    }, intervalMs)
  }

  /**
   * Stop auto-scan interval
   */
  stopAutoScan(): void {
    console.log('📱 [DEVICE SERVICE] Stopping auto-scan')

    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
  }

  /**
   * Mock devices for development/testing
   */
  private async getMockDevices(): Promise<MobileDevice[]> {
    return [
      {
        id: 'android-1',
        name: 'Pixel 7 Pro',
        os: 'android',
        osVersion: '13.0',
        ip: '192.168.1.100',
        port: 5555,
        status: 'disconnected',
        isEmulator: false,
        capabilities: {
          screenWidth: 1080,
          screenHeight: 2340,
          pixelRatio: 3,
          userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36',
          hasTouch: true,
          supportsOrientation: true,
          supportsGeolocation: true
        },
        adbId: 'ABC123'
      } as AndroidDevice,
      {
        id: 'ios-1',
        name: 'iPhone 14 Pro',
        os: 'ios',
        osVersion: '17.0',
        ip: '192.168.1.101',
        port: 9221,
        status: 'disconnected',
        isEmulator: false,
        capabilities: {
          screenWidth: 1170,
          screenHeight: 2532,
          pixelRatio: 3,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
          hasTouch: true,
          supportsOrientation: true,
          supportsGeolocation: true
        },
        udid: 'UDID123'
      } as IOSDevice
    ]
  }

  private getMockAndroidDevice(): AndroidDevice {
    return {
      id: 'android-paired',
      name: 'Paired Android Device',
      os: 'android',
      osVersion: '13.0',
      ip: '192.168.1.102',
      port: 5555,
      status: 'disconnected',
      isEmulator: false,
      capabilities: {
        screenWidth: 1080,
        screenHeight: 2340,
        pixelRatio: 3,
        userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36',
        hasTouch: true,
        supportsOrientation: true,
        supportsGeolocation: true
      },
      adbId: 'PAIRED123'
    }
  }

  private getMockConnection(device: MobileDevice): DeviceConnection {
    return {
      device,
      cdpUrl: device.os === 'android' ? `http://${device.ip}:9222` : undefined,
      webkitUrl: device.os === 'ios' ? `http://${device.ip}:9221` : undefined,
      socket: null
    }
  }
}

// Export singleton instance
export const deviceConnectionService = new DeviceConnectionService()
