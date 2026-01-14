import { useEffect } from 'react'
import { useProjectStore } from './store/projectStore'
import { useMobileDeviceStore } from './store/mobileDeviceStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectView from './pages/ProjectView'

function App() {
  const { currentPage } = useProjectStore()
  const { resetAllDeviceStatuses, removeOldIPBasedDevices, clearAllDevices, updateDeviceStatus, addDevice } = useMobileDeviceStore()

  // Initialize app - clear stale devices and sync with SDK WebSocket events
  useEffect(() => {
    console.log('🚀 [App] Initializing...')

    // Migration: Remove old IP-based device IDs (one-time cleanup)
    removeOldIPBasedDevices()

    // IMPORTANT: Clear ALL persisted devices on app startup
    // Devices will be re-added automatically when SDK connects
    // This prevents stale USB devices and unreliable network-scanned devices
    console.log('🧹 [App] Clearing all persisted devices (will reconnect via SDK)')
    clearAllDevices()

    // Sync device status with SDK WebSocket connection events
    if (window.electronAPI) {
      // IMPORTANT: Check for already-connected SDK devices on startup
      // This handles the case where SDK was connected before the app started
      window.electronAPI.invoke('mobile:get-connected-sdk-devices').then((connectedDevices: any[]) => {
        console.log(`📱 [App] Found ${connectedDevices?.length || 0} already-connected SDK device(s)`)
        if (connectedDevices && connectedDevices.length > 0) {
          connectedDevices.forEach((device) => {
            console.log(`✅ [App] Re-adding already-connected SDK device: ${device.deviceName}`)
            const normalizedHostname = device.deviceName.toLowerCase().replace(/[^a-z0-9]/g, '-')
            const deviceId = `ios-wifi-${normalizedHostname}`
            const deviceData = {
              id: deviceId,
              name: device.deviceName,
              os: 'ios' as const,
              osVersion: device.systemVersion || 'Unknown',
              ip: device.ipAddress || 'Unknown',
              port: 8080,
              status: 'connected' as const,
              isEmulator: false,
              capabilities: {
                screenWidth: 1170,
                screenHeight: 2532,
                pixelRatio: 3,
                userAgent: 'iOS App',
                hasTouch: true,
                supportsOrientation: true,
                supportsGeolocation: false
              },
              udid: device.bundleId || normalizedHostname
            }
            addDevice(deviceData)
          })
        }
      }).catch((err) => {
        console.warn('⚠️ [App] Could not query connected SDK devices:', err)
      })

      // When SDK connects via WebSocket, mark device as connected in store
      window.electronAPI.onSDKConnected((device) => {
        console.log(`✅ [App] SDK connected, updating device status: ${device.deviceName}`)

        // Generate consistent device ID using hostname (matches device discovery format)
        // Normalize hostname to match ios-wifi-XXX format from network scan
        const normalizedHostname = device.deviceName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const deviceId = `ios-wifi-${normalizedHostname}`

        // Add/update device in store with connected status
        const deviceData = {
          id: deviceId,
          name: device.deviceName,
          os: 'ios' as const, // SDK is iOS-only
          osVersion: device.systemVersion || 'Unknown',
          ip: device.ipAddress || 'Unknown',
          port: 8080,
          status: 'connected' as const,
          isEmulator: false,
          capabilities: {
            screenWidth: 1170,
            screenHeight: 2532,
            pixelRatio: 3,
            userAgent: 'iOS App',
            hasTouch: true,
            supportsOrientation: true,
            supportsGeolocation: false
          },
          udid: device.bundleId || normalizedHostname
        }

        addDevice(deviceData)
      })

      // When SDK disconnects, remove device from store entirely
      window.electronAPI.onSDKDisconnected((device) => {
        console.log(`❌ [App] SDK disconnected, removing device: ${device.deviceName}`)

        // Use same normalized hostname format
        const normalizedHostname = device.deviceName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const deviceId = `ios-wifi-${normalizedHostname}`

        // Remove device entirely instead of marking as disconnected
        // This prevents stale devices from persisting in localStorage
        const { removeDevice } = useMobileDeviceStore.getState()
        removeDevice(deviceId)
        console.log(`✅ [App] Device removed from store: ${deviceId}`)
      })
    }

    console.log('✅ [App] Initialized')
  }, [removeOldIPBasedDevices, clearAllDevices, updateDeviceStatus, addDevice])

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login />
      case 'dashboard':
        return <Dashboard />
      case 'project':
        return <ProjectView />
      default:
        return <Login />
    }
  }

  return <>{renderPage()}</>
}

export default App
