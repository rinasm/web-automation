/**
 * Electron IPC Handlers for Mobile Device Operations
 *
 * Handles communication between the renderer process and native ADB/device operations.
 * This module would be imported in the Electron main process.
 *
 * Note: This is a blueprint for future Electron integration.
 * Actual implementation requires Electron's ipcMain and Node.js native modules.
 */

import { MobileDevice, IOSDevice } from '../src/types/mobileDevice'

/**
 * IPC Channel Names
 */
export const IPC_CHANNELS = {
  // Device Discovery
  SCAN_DEVICES: 'mobile:scan-devices',
  DEVICE_DISCOVERED: 'mobile:device-discovered',
  SCAN_COMPLETE: 'mobile:scan-complete',

  // ADB Operations (Android)
  ADB_CONNECT: 'mobile:adb-connect',
  ADB_DISCONNECT: 'mobile:adb-disconnect',
  ADB_FORWARD_PORT: 'mobile:adb-forward-port',
  ADB_PAIR: 'mobile:adb-pair',
  ADB_DEVICES: 'mobile:adb-devices',

  // iOS Operations
  IOS_CHECK_PROXY: 'mobile:ios-check-proxy',
  IOS_START_PROXY: 'mobile:ios-start-proxy',
  IOS_STOP_PROXY: 'mobile:ios-stop-proxy',

  // Appium Server Operations
  APPIUM_START_SERVER: 'mobile:appium-start-server',
  APPIUM_STOP_SERVER: 'mobile:appium-stop-server',
  APPIUM_SERVER_STATUS: 'mobile:appium-server-status',
  APPIUM_RESTART_SERVER: 'mobile:appium-restart-server',

  // Appium Session Operations
  APPIUM_CREATE_SESSION: 'mobile:appium-create-session',
  APPIUM_DELETE_SESSION: 'mobile:appium-delete-session',
  APPIUM_SESSION_COMMAND: 'mobile:appium-session-command',

  // Connection Status
  CONNECTION_STATUS: 'mobile:connection-status',
  CONNECTION_ERROR: 'mobile:connection-error'
}

/**
 * Example IPC Handler Setup (for Electron main process)
 *
 * This would be called in electron/main.ts:
 *
 * import { ipcMain } from 'electron'
 * import { setupMobileDeviceIPC } from './mobileDeviceIPC'
 *
 * setupMobileDeviceIPC(ipcMain)
 */

export interface ADBDevice {
  id: string
  type: 'device' | 'emulator'
  model?: string
  product?: string
  device?: string
  transportId?: string
}

/**
 * Setup IPC handlers (blueprint)
 */
export function setupMobileDeviceIPC(ipcMain: any) {
  console.log('📱 [IPC] Setting up mobile device IPC handlers')

  // Scan for devices
  ipcMain.handle(IPC_CHANNELS.SCAN_DEVICES, async () => {
    console.log('📱 [IPC] Scanning for devices...')

    try {
      // In actual implementation:
      // 1. Use @devicefarmer/adbkit to list ADB devices
      // 2. Check for iOS devices via ios-webkit-debug-proxy
      // 3. Return discovered devices

      // Mock implementation
      const devices: MobileDevice[] = await scanForDevices()
      return { success: true, devices }
    } catch (error: any) {
      console.error('📱 [IPC] Scan error:', error)
      return { success: false, error: error.message }
    }
  })

  // Connect to Android device via ADB
  ipcMain.handle(IPC_CHANNELS.ADB_CONNECT, async (_event: any, { ip, port }: { ip: string; port: number }) => {
    console.log(`📱 [IPC] Connecting to ADB device: ${ip}:${port}`)

    try {
      // In actual implementation:
      // const adb = require('@devicefarmer/adbkit').createClient()
      // await adb.connect(ip, port)

      // Mock success
      return { success: true }
    } catch (error: any) {
      console.error('📱 [IPC] ADB connect error:', error)
      return { success: false, error: error.message }
    }
  })

  // Disconnect from ADB device
  ipcMain.handle(IPC_CHANNELS.ADB_DISCONNECT, async (_event: any, { ip, port }: { ip: string; port: number }) => {
    console.log(`📱 [IPC] Disconnecting from ADB device: ${ip}:${port}`)

    try {
      // In actual implementation:
      // const adb = require('@devicefarmer/adbkit').createClient()
      // await adb.disconnect(ip, port)

      return { success: true }
    } catch (error: any) {
      console.error('📱 [IPC] ADB disconnect error:', error)
      return { success: false, error: error.message }
    }
  })

  // Forward CDP port
  ipcMain.handle(IPC_CHANNELS.ADB_FORWARD_PORT, async (_event: any, { deviceId }: { deviceId: string }) => {
    console.log(`📱 [IPC] Forwarding CDP port for device: ${deviceId}`)

    try {
      // In actual implementation:
      // const adb = require('@devicefarmer/adbkit').createClient()
      // await adb.forward(deviceId, 'tcp:9222', 'localabstract:chrome_devtools_remote')

      return { success: true, port: 9222 }
    } catch (error: any) {
      console.error('📱 [IPC] Port forward error:', error)
      return { success: false, error: error.message }
    }
  })

  // Pair Android device (Android 11+)
  ipcMain.handle(IPC_CHANNELS.ADB_PAIR, async (_event: any, { ip, port }: { ip: string; port: number; code: string }) => {
    console.log(`📱 [IPC] Pairing with Android device: ${ip}:${port}`)

    try {
      // In actual implementation:
      // const adb = require('@devicefarmer/adbkit').createClient()
      // await adb.pair(ip, port, code)

      return { success: true }
    } catch (error: any) {
      console.error('📱 [IPC] Pairing error:', error)
      return { success: false, error: error.message }
    }
  })

  // List ADB devices
  ipcMain.handle(IPC_CHANNELS.ADB_DEVICES, async () => {
    console.log('📱 [IPC] Listing ADB devices')

    try {
      // In actual implementation:
      // const adb = require('@devicefarmer/adbkit').createClient()
      // const devices = await adb.listDevices()

      const devices: ADBDevice[] = []
      return { success: true, devices }
    } catch (error: any) {
      console.error('📱 [IPC] List devices error:', error)
      return { success: false, error: error.message }
    }
  })

  // Check iOS proxy
  ipcMain.handle(IPC_CHANNELS.IOS_CHECK_PROXY, async () => {
    console.log('📱 [IPC] Checking iOS proxy status')

    try {
      // In actual implementation:
      // Check if ios-webkit-debug-proxy is running
      // const { exec } = require('child_process')
      // Check process or connection

      return { success: true, running: false }
    } catch (error: any) {
      console.error('📱 [IPC] iOS proxy check error:', error)
      return { success: false, error: error.message }
    }
  })

  // Appium server management
  ipcMain.handle(IPC_CHANNELS.APPIUM_START_SERVER, async () => {
    console.log('📱 [IPC] Starting Appium server...')

    try {
      const { appiumServerManager } = require('./appiumServerManager')
      const status = await appiumServerManager.startServer()
      return { success: true, status }
    } catch (error: any) {
      console.error('📱 [IPC] Appium server start error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.APPIUM_STOP_SERVER, async () => {
    console.log('📱 [IPC] Stopping Appium server...')

    try {
      const { appiumServerManager } = require('./appiumServerManager')
      await appiumServerManager.stopServer()
      return { success: true }
    } catch (error: any) {
      console.error('📱 [IPC] Appium server stop error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.APPIUM_SERVER_STATUS, async () => {
    console.log('📱 [IPC] Checking Appium server status')

    try {
      const { appiumServerManager } = require('./appiumServerManager')
      const status = appiumServerManager.getStatus()
      return { success: true, status }
    } catch (error: any) {
      console.error('📱 [IPC] Appium server status error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.APPIUM_RESTART_SERVER, async () => {
    console.log('📱 [IPC] Restarting Appium server...')

    try {
      const { appiumServerManager } = require('./appiumServerManager')
      const status = await appiumServerManager.restartServer()
      return { success: true, status }
    } catch (error: any) {
      console.error('📱 [IPC] Appium server restart error:', error)
      return { success: false, error: error.message }
    }
  })

  // Appium session operations (proxied from main process to avoid CORS)
  ipcMain.handle(IPC_CHANNELS.APPIUM_CREATE_SESSION, async (_event: any, { device, capabilities }: any) => {
    console.log('📱 [IPC] Creating Appium session for device:', device.name)

    try {
      const fetch = require('node-fetch')
      const appiumUrl = 'http://127.0.0.1:4723'

      const response = await fetch(`${appiumUrl}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capabilities: {
            alwaysMatch: capabilities,
            firstMatch: [{}]
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('📱 [IPC] Appium session creation failed:', data)
        return {
          success: false,
          error: data.value?.message || data.message || 'Failed to create session'
        }
      }

      const sessionId = data.value?.sessionId || data.sessionId

      console.log('📱 [IPC] Appium session created:', sessionId)
      return {
        success: true,
        sessionId,
        capabilities: data.value?.capabilities || data.capabilities
      }
    } catch (error: any) {
      console.error('📱 [IPC] Appium session creation error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.APPIUM_DELETE_SESSION, async (_event: any, { sessionId }: any) => {
    console.log('📱 [IPC] Deleting Appium session:', sessionId)

    try {
      const fetch = require('node-fetch')
      const appiumUrl = 'http://127.0.0.1:4723'

      const response = await fetch(`${appiumUrl}/session/${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.error('📱 [IPC] Session deletion failed:', response.status)
      }

      console.log('📱 [IPC] Appium session deleted')
      return { success: true }
    } catch (error: any) {
      console.error('📱 [IPC] Session deletion error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.APPIUM_SESSION_COMMAND, async (_event: any, { sessionId, method, path, body }: any) => {
    console.log(`📱 [IPC] Appium command: ${method} ${path}`)

    try {
      const fetch = require('node-fetch')
      const appiumUrl = 'http://127.0.0.1:4723'

      const url = `${appiumUrl}/session/${sessionId}${path}`
      const options: any = {
        method,
        headers: { 'Content-Type': 'application/json' }
      }

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(url, options)
      const data = await response.json()

      if (!response.ok) {
        console.error('📱 [IPC] Appium command failed:', data)
        return {
          success: false,
          error: data.value?.message || data.message || 'Command failed'
        }
      }

      return {
        success: true,
        value: data.value
      }
    } catch (error: any) {
      console.error('📱 [IPC] Appium command error:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('📱 [IPC] Mobile device IPC handlers registered')
}

/**
 * Scan for iOS devices connected via USB
 */
async function scanForIOSDevices(): Promise<IOSDevice[]> {
  const { exec } = require('child_process')
  const util = require('util')
  const execPromise = util.promisify(exec)

  try {
    console.log('📱 [IPC] Scanning for iOS devices (Network scan for WiFi automation)...')

    const devices: IOSDevice[] = []

    // Method 1: Scan network for iOS devices using ARP
    console.log('📱 [IPC] Scanning network for iOS devices...')
    try {
      const arpResult = await execPromise('arp -a')
      const arpOutput = arpResult.stdout

      // Look for devices with "iphone" or "ipad" in their hostname
      const arpLines = arpOutput.split('\n')
      const iosDeviceLines = arpLines.filter((line: string) =>
        line.toLowerCase().includes('iphone') || line.toLowerCase().includes('ipad')
      )

      console.log(`📱 [IPC] Found ${iosDeviceLines.length} potential iOS device(s) on network`)

      for (const line of iosDeviceLines) {
        // Extract hostname and IP address
        // Format: "hostname (192.168.x.x) at xx:xx:xx:xx:xx:xx on en0 ifscope [ethernet]"
        const match = line.match(/^([^\s]+)\s+\((\d+\.\d+\.\d+\.\d+)\)/)
        if (match) {
          const hostname = match[1]
          const ipAddress = match[2]

          console.log(`📱 [IPC] Found iOS device: ${hostname} at ${ipAddress}`)

          const device: IOSDevice = {
            id: `ios-wifi-${ipAddress.replace(/\./g, '-')}`,
            name: `${hostname} (WiFi)`,
            os: 'ios',
            osVersion: 'Unknown',
            ip: ipAddress,
            port: 8100, // WDA default port
            status: 'disconnected',
            isEmulator: false,
            capabilities: {
              screenWidth: 1170,
              screenHeight: 2532,
              pixelRatio: 3,
              userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
              hasTouch: true,
              supportsOrientation: true,
              supportsGeolocation: true
            },
            udid: ipAddress // Use IP as UDID for network devices
          }

          devices.push(device)
        }
      }
    } catch (error: any) {
      console.error('📱 [IPC] Error scanning network:', error.message)
    }

    // Method 2: Try USB devices (backup method)
    console.log('📱 [IPC] Checking USB connections...')
    try {
      const result = await execPromise('/opt/homebrew/bin/idevice_id -l')
      const stdout = result.stdout
      const udids = stdout.trim().split('\n').filter((line: string) => line.length > 0)

      if (udids.length > 0) {
        console.log(`📱 [IPC] Found ${udids.length} USB device(s):`, udids)

        for (const udid of udids) {
          try {
            const nameResult = await execPromise(`/opt/homebrew/bin/ideviceinfo -u ${udid} -k DeviceName`)
            const deviceName = nameResult.stdout.trim()

            const versionResult = await execPromise(`/opt/homebrew/bin/ideviceinfo -u ${udid} -k ProductVersion`)
            const iosVersion = versionResult.stdout.trim()

            // Check if we already have this device via WiFi
            const existingWiFiDevice = devices.find(d => d.name.includes(deviceName))
            if (existingWiFiDevice) {
              console.log(`📱 [IPC] Device ${deviceName} already found via WiFi, skipping USB entry`)
              continue
            }

            const device: IOSDevice = {
              id: `ios-usb-${udid}`,
              name: `${deviceName} (USB)`,
              os: 'ios',
              osVersion: iosVersion || 'Unknown',
              ip: 'localhost',
              port: 8100,
              status: 'disconnected',
              isEmulator: false,
              capabilities: {
                screenWidth: 1170,
                screenHeight: 2532,
                pixelRatio: 3,
                userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS ${iosVersion.replace(/\./g, '_')} like Mac OS X) AppleWebKit/605.1.15`,
                hasTouch: true,
                supportsOrientation: true,
                supportsGeolocation: true
              },
              udid: udid
            }

            devices.push(device)
            console.log(`📱 [IPC] Detected USB device: ${deviceName} (${iosVersion})`)
          } catch (error: any) {
            console.error(`📱 [IPC] Error getting info for USB device ${udid}:`, error.message)
          }
        }
      }
    } catch (error: any) {
      console.log('📱 [IPC] No USB devices found')
    }

    if (devices.length === 0) {
      console.log('📱 [IPC] ❌ No iOS devices found')
      console.log('📱 [IPC] For WiFi automation:')
      console.log('📱 [IPC]   1. Connect your iPhone to the same WiFi network')
      console.log('📱 [IPC]   2. Ensure iPhone and Mac are on the same network')
      console.log('📱 [IPC]   3. iPhone should appear in ARP table with hostname containing "iphone"')
    } else {
      console.log(`📱 [IPC] ✅ Found ${devices.length} iOS device(s) total`)
    }

    return devices
  } catch (error: any) {
    console.error('📱 [IPC] Error scanning for iOS devices:', error.message)
    return []
  }
}

/**
 * Scan for all devices (iOS + Android)
 */
async function scanForDevices(): Promise<MobileDevice[]> {
  console.log('📱 [IPC] Scanning for all devices...')

  const devices: MobileDevice[] = []

  // Scan for iOS devices (USB)
  const iosDevices = await scanForIOSDevices()
  devices.push(...iosDevices)

  // TODO: Scan for Android devices via ADB
  // const androidDevices = await scanForAndroidDevices()
  // devices.push(...androidDevices)

  console.log(`📱 [IPC] Total devices found: ${devices.length}`)
  return devices
}

/**
 * Helper: Execute ADB command
 * In actual implementation:
 */
// async function execAdbCommand(args: string[]): Promise<string> {
//   const { exec } = require('child_process')
//   const util = require('util')
//   const execPromise = util.promisify(exec)
//
//   const command = `adb ${args.join(' ')}`
//   const { stdout, stderr } = await execPromise(command)
//
//   if (stderr) {
//     throw new Error(stderr)
//   }
//
//   return stdout
// }

/**
 * Example usage in renderer process (React):
 *
 * // In src/services/deviceConnectionService.ts:
 *
 * async scanForDevices() {
 *   if (window.electronAPI) {
 *     const result = await window.electronAPI.invoke('mobile:scan-devices')
 *     if (result.success) {
 *       return result.devices
 *     } else {
 *       throw new Error(result.error)
 *     }
 *   } else {
 *     // Fallback to mock devices
 *     return this.getMockDevices()
 *   }
 * }
 */

/**
 * TypeScript declarations for window.electronAPI
 * Add to src/vite-env.d.ts:
 *
 * interface ElectronAPI {
 *   invoke: (channel: string, ...args: any[]) => Promise<any>
 *   on: (channel: string, callback: (...args: any[]) => void) => void
 *   off: (channel: string, callback: (...args: any[]) => void) => void
 * }
 *
 * interface Window {
 *   electronAPI?: ElectronAPI
 * }
 */

export default {
  IPC_CHANNELS,
  setupMobileDeviceIPC
}
