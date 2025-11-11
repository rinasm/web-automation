import { useState } from 'react'
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
    updateDeviceStatus
  } = useMobileDeviceStore()

  const [isOpen, setIsOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const currentDevice = devices.find(d => d.id === currentDeviceId)
  const connectedDevices = devices.filter(d => d.status === 'connected')

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setScanning(true)

    try {
      const discoveredDevices = await deviceConnectionService.scanForDevices()
      discoveredDevices.forEach(device => {
        addDevice(device)
      })
    } catch (error) {
      console.error('Failed to scan for devices:', error)
    } finally {
      setIsRefreshing(false)
      setScanning(false)
    }
  }

  const handleSelectDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) return

    // If device is not connected, try to connect
    if (device.status !== 'connected') {
      connectDevice(device.id)
    } else {
      setCurrentDevice(deviceId)
    }

    setIsOpen(false)
  }

  const connectDevice = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) return

    updateDeviceStatus(deviceId, 'connecting')

    try {
      const connection = await deviceConnectionService.connectToDevice(device)
      updateDeviceStatus(deviceId, 'connected')
      setCurrentDevice(deviceId)
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
                Mobile Devices
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
            {connectedDevices.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  {connectedDevices.length} device{connectedDevices.length > 1 ? 's' : ''} connected
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
