import { useState, useEffect } from 'react'
import { Smartphone, ChevronDown, RefreshCw, Plus, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import { deviceConnectionService } from '../services/deviceConnectionService'

interface MobileDeviceSelectorProps {
  onConnectDevice?: () => void
  className?: string
}

export const MobileDeviceSelector: React.FC<MobileDeviceSelectorProps> = ({
  onConnectDevice,
  className = ''
}) => {
  const {
    devices,
    currentDeviceId,
    setCurrentDevice,
    isScanning,
    setScanning,
    addDevice,
    updateDeviceStatus,
    clearAllDevices,
    removeDevice
  } = useMobileDeviceStore()

  const [isOpen, setIsOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const currentDevice = devices.find(d => d.id === currentDeviceId)
  const connectedDevices = devices.filter(d => d.status === 'connected')

  // DEBUG: Log devices when component renders
  useEffect(() => {
    console.log('📱 [MobileDeviceSelector] Component rendered')
    console.log('📱 [MobileDeviceSelector] Total devices:', devices.length)
    console.log('📱 [MobileDeviceSelector] Devices:', devices.map(d => `${d.id} (${d.name}) - ${d.status}`))
    console.log('📱 [MobileDeviceSelector] Current device ID:', currentDeviceId)
  }, [devices, currentDeviceId])

  // Listen for network changes that clear stale devices
  useEffect(() => {
    if (!window.electronAPI) return

    const unsubscribe = window.electronAPI.onSDKEvent('devices-cleared', (data: any) => {
      console.log('🧹 [DeviceSelector] Devices cleared due to:', data.reason)

      // Remove all connected devices from the store
      // This prevents stale devices from persisting in localStorage
      devices.forEach(device => {
        if (device.status === 'connected') {
          console.log(`🗑️ [DeviceSelector] Removing device due to network change: ${device.id}`)
          removeDevice(device.id)
        }
      })

      // Show notification to user
      console.log(`📱 [DeviceSelector] ${data.message}`)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [devices, updateDeviceStatus])

  const handleRefresh = async () => {
    console.log('🔄 [DeviceSelector] Refreshing devices...')
    setIsRefreshing(true)
    setScanning(true)

    try {
      // Step 1: Clear all persisted devices (same as app startup)
      console.log('🧹 [DeviceSelector] Clearing all persisted devices')
      clearAllDevices()

      // Step 2: Query for already-connected SDK devices (same as app startup)
      if (window.electronAPI) {
        const connectedDevices = await window.electronAPI.invoke('mobile:get-connected-sdk-devices')
        console.log(`📱 [DeviceSelector] Found ${connectedDevices?.length || 0} already-connected SDK device(s)`)

        if (connectedDevices && connectedDevices.length > 0) {
          connectedDevices.forEach((device: any) => {
            console.log(`✅ [DeviceSelector] Re-adding already-connected SDK device: ${device.deviceName}`)
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
      }

      console.log('✅ [DeviceSelector] Refresh complete')
    } catch (error) {
      console.error('❌ [DeviceSelector] Failed to refresh devices:', error)
    } finally {
      setIsRefreshing(false)
      setScanning(false)
    }
  }

  const handleSelectDevice = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) return

    // If selecting a different device, disconnect all others first
    if (currentDeviceId && currentDeviceId !== deviceId) {
      console.log('📱 [DeviceSelector] Disconnecting current device before switching')
      // Remove all other connected devices (single connection mode)
      const connectedDevices = devices.filter(d => d.status === 'connected' && d.id !== deviceId)
      connectedDevices.forEach(d => {
        console.log(`🗑️ [DeviceSelector] Removing other device: ${d.id}`)
        removeDevice(d.id)
      })
    }

    // If device is not connected, try to connect
    if (device.status !== 'connected') {
      await connectDevice(device.id)
    } else {
      setCurrentDevice(deviceId)
    }

    setIsOpen(false)
  }

  const connectDevice = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) return

    // IMPORTANT: Remove ALL other devices before connecting (single connection mode)
    const otherConnectedDevices = devices.filter(d => d.id !== deviceId && d.status === 'connected')
    if (otherConnectedDevices.length > 0) {
      console.log(`📱 [DeviceSelector] Removing ${otherConnectedDevices.length} other device(s) (single connection mode)`)
      otherConnectedDevices.forEach(d => {
        removeDevice(d.id)
        console.log(`   🗑️ Removed: ${d.name}`)
      })
    }

    updateDeviceStatus(deviceId, 'connecting')

    try {
      const connection = await deviceConnectionService.connectToDevice(device)
      updateDeviceStatus(deviceId, 'connected')
      setCurrentDevice(deviceId)
      console.log(`✅ [DeviceSelector] Connected to: ${device.name} (single connection)`)
    } catch (error) {
      console.error('Failed to connect to device:', error)
      updateDeviceStatus(deviceId, 'error')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-500'
      case 'connecting':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi size={14} />
      case 'connecting':
        return <RefreshCw size={14} className="animate-spin" />
      case 'error':
        return <AlertCircle size={14} />
      default:
        return <WifiOff size={14} />
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Smartphone size={18} className="text-gray-600" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-700">
            {currentDevice ? currentDevice.name : 'No device'}
          </span>
          {currentDevice && (
            <span className="text-xs text-gray-500">
              {currentDevice.os === 'android' ? 'Android' : 'iOS'} {currentDevice.osVersion}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Content */}
          <div className="absolute top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                Mobile Devices ({devices.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                  title="Refresh device list"
                >
                  <RefreshCw size={14} className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                {onConnectDevice && (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      onConnectDevice()
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    title="Connect new device"
                  >
                    <Plus size={14} className="text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Device List */}
            <div className="max-h-80 overflow-y-auto">
              {devices.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Smartphone size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 mb-1">No devices found</p>
                  <p className="text-xs text-gray-400">
                    Click the refresh button or connect a new device
                  </p>
                </div>
              ) : (
                devices.map(device => (
                  <button
                    key={device.id}
                    onClick={() => handleSelectDevice(device.id)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      device.id === currentDeviceId ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Device Icon */}
                    <div className={`flex-shrink-0 ${getStatusColor(device.status)}`}>
                      {getStatusIcon(device.status)}
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {device.name}
                        </span>
                        {device.id === currentDeviceId && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-500 text-white rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {device.os === 'android' ? 'Android' : 'iOS'} {device.osVersion} • {device.ip}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          device.status === 'connected'
                            ? 'bg-green-100 text-green-700'
                            : device.status === 'connecting'
                            ? 'bg-yellow-100 text-yellow-700'
                            : device.status === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {device.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {devices.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                {connectedDevices.length > 0 ? (
                  <p className="text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      1 device connected (single connection mode)
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    No devices connected
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
