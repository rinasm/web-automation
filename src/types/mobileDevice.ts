// Mobile Device Types and Interfaces

export type DeviceOS = 'android' | 'ios'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type DeviceOrientation = 'portrait' | 'landscape'

export interface DeviceCapabilities {
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  userAgent: string
  hasTouch: boolean
  supportsOrientation: boolean
  supportsGeolocation: boolean
}

export interface MobileDevice {
  id: string // Unique device identifier
  name: string // Device model name (e.g., "Pixel 7", "iPhone 14")
  os: DeviceOS
  osVersion: string
  ip: string
  port: number
  status: ConnectionStatus
  capabilities: DeviceCapabilities
  isEmulator: boolean
  lastConnected?: number
}

export interface AndroidDevice extends MobileDevice {
  os: 'android'
  adbId: string // ADB device ID
  chromeVersion?: string
}

export interface IOSDevice extends MobileDevice {
  os: 'ios'
  udid: string // iOS unique device identifier
  safariVersion?: string
}

export interface DeviceConnection {
  device: MobileDevice
  cdpUrl?: string // Chrome DevTools Protocol URL (for Android)
  webkitUrl?: string // WebKit remote debugging URL (for iOS)
  socket?: any // WebSocket connection
}

export interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'scroll' | 'pinch'
  x?: number
  y?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  duration?: number
  distance?: number
}

export interface MobileAction {
  type: 'tap' | 'swipe' | 'type' | 'wait' | 'scroll' | 'rotate'
  selector?: string
  value?: string
  gesture?: TouchGesture
  orientation?: DeviceOrientation
}

export interface DeviceDiscoveryResult {
  devices: MobileDevice[]
  timestamp: number
  networkScanComplete: boolean
}

export interface ADBPairingInfo {
  ip: string
  port: number
  pairingCode: string
}

export interface DeviceNetworkInfo {
  ip: string
  port: number
  connected: boolean
  latency?: number
}
