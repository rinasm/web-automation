import { useEffect, useCallback } from 'react'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import { deviceConnectionService } from '../services/deviceConnectionService'
import { MobileDevice } from '../types/mobileDevice'

/**
 * Custom React hook for mobile device management
 * Provides convenient access to device store and connection handling
 */
export function useMobileDevice() {
  const {
    currentMode,
    devices,
    currentDeviceId,
    isScanning,
    setMode,
    addDevice,
    removeDevice,
    updateDevice,
    setCurrentDevice,
    updateDeviceStatus,
    setScanning,
    getCurrentDevice,
    getConnectedDevices,
    setDeviceConnection
  } = useMobileDeviceStore()

  const currentDevice = getCurrentDevice()
  const connectedDevices = getConnectedDevices()

  /**
   * Scan for available devices
   */
  const scanDevices = useCallback(async () => {
    setScanning(true)

    try {
      const discoveredDevices = await deviceConnectionService.scanForDevices()

      discoveredDevices.forEach(device => {
        addDevice(device)
      })

      return discoveredDevices
    } catch (error) {
      console.error('Failed to scan devices:', error)
      throw error
    } finally {
      setScanning(false)
    }
  }, [setScanning, addDevice])

  /**
   * Connect to a device
   */
  const connectDevice = useCallback(async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) {
      throw new Error('Device not found')
    }

    updateDeviceStatus(deviceId, 'connecting')

    try {
      const connection = await deviceConnectionService.connectToDevice(device)

      setDeviceConnection(deviceId, connection)
      updateDeviceStatus(deviceId, 'connected')
      setCurrentDevice(deviceId)

      return connection
    } catch (error) {
      console.error('Failed to connect to device:', error)
      updateDeviceStatus(deviceId, 'error')
      throw error
    }
  }, [devices, updateDeviceStatus, setDeviceConnection, setCurrentDevice])

  /**
   * Disconnect from a device
   */
  const disconnectDevice = useCallback(async (deviceId: string) => {
    try {
      await deviceConnectionService.disconnectFromDevice(deviceId)
      updateDeviceStatus(deviceId, 'disconnected')

      if (currentDeviceId === deviceId) {
        setCurrentDevice(null)
      }
    } catch (error) {
      console.error('Failed to disconnect from device:', error)
      throw error
    }
  }, [currentDeviceId, updateDeviceStatus, setCurrentDevice])

  /**
   * Switch between web and mobile modes
   */
  const switchMode = useCallback((mode: 'web' | 'mobile') => {
    if (mode === 'mobile' && connectedDevices.length === 0) {
      throw new Error('No devices connected. Please connect a device first.')
    }

    setMode(mode)
  }, [connectedDevices, setMode])

  /**
   * Auto-disconnect when component unmounts
   */
  useEffect(() => {
    return () => {
      // Cleanup: Optionally disconnect all devices on unmount
      // Uncomment if you want auto-disconnect
      // deviceConnectionService.disconnectFromDevice(currentDeviceId).catch(() => {})
    }
  }, [])

  /**
   * Listen to device connection events
   */
  useEffect(() => {
    const handleDeviceEvent = (event: any) => {
      switch (event.type) {
        case 'device-discovered':
          if (event.device) {
            addDevice(event.device)
          }
          break

        case 'device-connected':
          if (event.device) {
            updateDeviceStatus(event.device.id, 'connected')
          }
          break

        case 'device-disconnected':
          if (event.device) {
            updateDeviceStatus(event.device.id, 'disconnected')
          }
          break

        case 'device-error':
          console.error('Device error:', event.error)
          break
      }
    }

    deviceConnectionService.on(handleDeviceEvent)

    return () => {
      deviceConnectionService.off(handleDeviceEvent)
    }
  }, [addDevice, updateDeviceStatus])

  return {
    // State
    currentMode,
    devices,
    currentDevice,
    currentDeviceId,
    connectedDevices,
    isScanning,

    // Actions
    scanDevices,
    connectDevice,
    disconnectDevice,
    switchMode,
    setCurrentDevice,
    removeDevice,

    // Helpers
    isInMobileMode: currentMode === 'mobile',
    hasConnectedDevices: connectedDevices.length > 0,
    canSwitchToMobile: connectedDevices.length > 0
  }
}
