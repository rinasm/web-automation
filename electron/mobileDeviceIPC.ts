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

  // Appium Server Operations (REMOVED - SDK only)
  // APPIUM_START_SERVER: Removed in Phase 3
  // APPIUM_STOP_SERVER: Removed in Phase 3
  // APPIUM_SERVER_STATUS: Removed in Phase 3
  // APPIUM_RESTART_SERVER: Removed in Phase 3

  // Appium Session Operations (REMOVED - SDK only)
  // APPIUM_CREATE_SESSION: Removed in Phase 3
  // APPIUM_DELETE_SESSION: Removed in Phase 3
  // APPIUM_SESSION_COMMAND: Removed in Phase 3

  // WebDriverAgent Element Lookup (REMOVED - SDK hierarchy lookup replaces this)
  // WDA_FIND_ELEMENT_AT_COORDINATES: Removed in Phase 3

  // SDK Hierarchy Lookup (instant, no network delay!)
  SDK_HIERARCHY_LOOKUP: 'mobile:sdk-hierarchy-lookup',

  // Get complete page source XML (REMOVED - SDK hierarchy provides element info)
  // GET_PAGE_SOURCE: Removed in Phase 3

  // Parse iOS debugDescription (INSTANT - uses iOS native API!)
  PARSE_DEBUG_DESCRIPTION: 'mobile:parse-debug-description',

  // Network Monitoring
  NETWORK_START_MONITORING: 'mobile:network-start-monitoring',
  NETWORK_STOP_MONITORING: 'mobile:network-stop-monitoring',
  NETWORK_CLEAR: 'mobile:network-clear',
  NETWORK_EXPORT_HAR: 'mobile:network-export-har',

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

  // Appium server management (REMOVED - Phase 3)
  // All Appium server handlers removed - SDK WebSocket connection replaces Appium

  // Appium session operations (REMOVED - Phase 3)
  // All Appium session handlers removed - SDK provides direct action execution

  // WebDriverAgent element lookup handler (REMOVED - Phase 3)
  // WDA element lookup removed - SDK hierarchy lookup provides instant element info

  // SDK hierarchy lookup handler (INSTANT - no network delay!)
  ipcMain.handle(IPC_CHANNELS.SDK_HIERARCHY_LOOKUP, async (_event: any, { hierarchy, x, y }: any) => {
    console.log(`🔍 [IPC] SDK hierarchy lookup at (${x}, ${y})`)
    console.log(`🔍 [IPC] Processing ${hierarchy?.length || 0} ancestors`)

    try {
      const { findElementInHierarchy } = require('./sdkHierarchyLookup')
      const elementInfo = await findElementInHierarchy(hierarchy, x, y)

      if (elementInfo) {
        console.log(`✅ [IPC] Found element: ${elementInfo.accessibilityId || 'no ID'} (INSTANT!)`)
        return { success: true, elementInfo }
      } else {
        console.log(`❌ [IPC] No element with accessibility ID found in hierarchy`)
        return { success: false, error: 'No element found in hierarchy' }
      }
    } catch (error: any) {
      console.error('❌ [IPC] SDK hierarchy lookup error:', error)
      return { success: false, error: error.message }
    }
  })

  // Get page source XML handler (REMOVED - Phase 3)
  // Page source handler removed - SDK hierarchy provides element info without network delay

  // Parse iOS debugDescription handler (INSTANT - uses iOS native API!)
  ipcMain.handle(IPC_CHANNELS.PARSE_DEBUG_DESCRIPTION, async (_event: any, { debugDescription, x, y }: any) => {
    const startTime = Date.now()
    console.log(`🚀 [IPC] Parsing iOS debugDescription at (${x}, ${y})`)
    console.log(`🚀 [IPC] debugDescription length: ${debugDescription.length} characters`)

    try {
      // 🎯 USE NEW HIERARCHY ELEMENT FINDER (fixes wrong element recording!)
      const { parseViewHierarchy, findElementAtCoordinates } = require('./hierarchyElementFinder')

      // Parse hierarchy into tree structure
      const hierarchy = parseViewHierarchy(debugDescription)

      // Find actual clickable element at coordinates
      const element = hierarchy ? findElementAtCoordinates(hierarchy, x, y, {
        preferClickable: true,
        returnDeepest: true
      }) : null

      // Map ViewNode to expected result format
      const result = element ? {
        accessibilityId: element.accessibilityIdentifier,
        className: element.className
      } : null

      const elapsed = Date.now() - startTime
      if (result) {
        console.log(`✅ [iOS Parser] Found accessibility ID: ${result.accessibilityId} in ${elapsed}ms`)
        return { success: true, accessibilityId: result.accessibilityId, className: result.className, elapsed }
      } else {
        console.log(`❌ [iOS Parser] No element found in debugDescription at (${x}, ${y})`)
        return { success: false, error: 'No element found in debugDescription', elapsed }
      }
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      console.error('❌ [iOS Parser] Parse debugDescription error:', error)
      return { success: false, error: error.message, elapsed }
    }
  })

  // Network monitoring handlers
  ipcMain.handle(IPC_CHANNELS.NETWORK_START_MONITORING, async (_event: any, { deviceId }: { deviceId: string }) => {
    console.log(`🌐 [IPC] Starting network monitoring for device: ${deviceId}`)
    try {
      const { getWebSocketServer } = require('./websocketServer')
      const wsServer = getWebSocketServer()

      // Send startNetworkMonitoring command to SDK
      const success = wsServer.sendToDevice(deviceId, {
        type: 'startNetworkMonitoring',
        timestamp: Date.now()
      })

      if (success) {
        console.log(`✅ [IPC] Network monitoring command sent to device: ${deviceId}`)
        return { success: true }
      } else {
        console.error(`❌ [IPC] Failed to send network monitoring command - device not found: ${deviceId}`)
        return { success: false, error: 'Device not found' }
      }
    } catch (error: any) {
      console.error('❌ [IPC] Start network monitoring error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK_STOP_MONITORING, async (_event: any, { deviceId }: { deviceId: string }) => {
    console.log(`🌐 [IPC] Stopping network monitoring for device: ${deviceId}`)
    try {
      const { getWebSocketServer } = require('./websocketServer')
      const wsServer = getWebSocketServer()

      // Send stopNetworkMonitoring command to SDK
      const success = wsServer.sendToDevice(deviceId, {
        type: 'stopNetworkMonitoring',
        timestamp: Date.now()
      })

      if (success) {
        console.log(`✅ [IPC] Network monitoring stop command sent to device: ${deviceId}`)
        return { success: true }
      } else {
        console.error(`❌ [IPC] Failed to send stop command - device not found: ${deviceId}`)
        return { success: false, error: 'Device not found' }
      }
    } catch (error: any) {
      console.error('❌ [IPC] Stop network monitoring error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK_CLEAR, async () => {
    console.log(`🌐 [IPC] Clearing network entries`)
    try {
      // Network entries are stored in renderer process (networkStore)
      // This handler is just for consistency - actual clearing happens in renderer
      return { success: true }
    } catch (error: any) {
      console.error('❌ [IPC] Clear network error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.NETWORK_EXPORT_HAR, async (_event: any, { harData, filename }: { harData: any, filename: string }) => {
    console.log(`🌐 [IPC] Exporting network log as HAR: ${filename}`)
    try {
      const { dialog } = require('electron')
      const fs = require('fs')

      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Network Log (HAR)',
        defaultPath: filename || 'network-log.har',
        filters: [
          { name: 'HAR Files', extensions: ['har'] },
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'User canceled' }
      }

      // Write HAR data to file
      fs.writeFileSync(result.filePath, JSON.stringify(harData, null, 2), 'utf-8')

      console.log(`✅ [IPC] Network log exported to: ${result.filePath}`)
      return { success: true, filePath: result.filePath }
    } catch (error: any) {
      console.error('❌ [IPC] Export HAR error:', error)
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
