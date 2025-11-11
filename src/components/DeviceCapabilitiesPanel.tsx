/**
 * Device Capabilities Panel
 *
 * UI component for controlling device capabilities:
 * - Device rotation
 * - Network throttling
 * - Geolocation mocking
 */

import { useState, useEffect } from 'react'
import { RotateCw, Wifi, MapPin, RotateCcw } from 'lucide-react'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import {
  deviceCapabilitiesRegistry,
  DeviceOrientation,
  NETWORK_PROFILES,
  PRESET_LOCATIONS
} from '../utils/deviceCapabilities'

interface DeviceCapabilitiesPanelProps {
  className?: string
  onCapabilityChange?: (capability: string, value: any) => void
}

export default function DeviceCapabilitiesPanel({
  className = '',
  onCapabilityChange
}: DeviceCapabilitiesPanelProps) {
  const { getCurrentDevice, currentMode } = useMobileDeviceStore()
  const currentDevice = getCurrentDevice()

  const [orientation, setOrientation] = useState<DeviceOrientation>('portrait')
  const [networkProfile, setNetworkProfile] = useState<string>('No Throttling')
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAndroid = currentDevice?.os === 'android'
  const isConnected = currentMode === 'mobile' && currentDevice

  // Get capabilities manager
  const manager = currentDevice ? deviceCapabilitiesRegistry.getManager(currentDevice) : null

  /**
   * Handle orientation change
   */
  const handleOrientationChange = async (newOrientation: DeviceOrientation) => {
    if (!manager || !isAndroid) {
      setError('Orientation change only supported on Android')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await manager.setOrientation(newOrientation)
      setOrientation(newOrientation)
      onCapabilityChange?.('orientation', newOrientation)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to change orientation:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle network throttling change
   */
  const handleNetworkChange = async (profile: string) => {
    if (!manager || !isAndroid) {
      setError('Network throttling only supported on Android')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await manager.setNetworkThrottling(profile)
      setNetworkProfile(profile)
      onCapabilityChange?.('network', profile)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to set network throttling:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle geolocation change
   */
  const handleLocationChange = async (locationName: string) => {
    if (!manager || !isAndroid) {
      setError('Geolocation mocking only supported on Android')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (locationName === '') {
        await manager.clearGeolocation()
        setSelectedLocation('')
        onCapabilityChange?.('location', null)
      } else {
        await manager.setPresetLocation(locationName)
        setSelectedLocation(locationName)
        onCapabilityChange?.('location', locationName)
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to set geolocation:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Reset all capabilities
   */
  const handleResetAll = async () => {
    if (!manager || !isAndroid) return

    setIsLoading(true)
    setError(null)

    try {
      await manager.resetAll()
      setOrientation('portrait')
      setNetworkProfile('No Throttling')
      setSelectedLocation('')
      onCapabilityChange?.('reset', true)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to reset capabilities:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-sm text-gray-500 text-center">
          Connect a mobile device to access capabilities
        </p>
      </div>
    )
  }

  if (!isAndroid) {
    return (
      <div className={`p-4 bg-yellow-50 rounded-lg ${className}`}>
        <p className="text-sm text-yellow-700 text-center">
          Device capabilities are only supported on Android devices
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Device Capabilities</h3>
        <button
          onClick={handleResetAll}
          disabled={isLoading}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
          title="Reset all overrides"
        >
          <RotateCcw size={14} />
          <span>Reset All</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Capabilities */}
      <div className="p-4 space-y-4">
        {/* Device Orientation */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-2">
            <RotateCw size={14} />
            <span>Device Orientation</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleOrientationChange('portrait')}
              disabled={isLoading || orientation === 'portrait'}
              className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                orientation === 'portrait'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              Portrait
            </button>
            <button
              onClick={() => handleOrientationChange('landscape')}
              disabled={isLoading || orientation === 'landscape'}
              className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                orientation === 'landscape'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              Landscape
            </button>
          </div>
        </div>

        {/* Network Throttling */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-2">
            <Wifi size={14} />
            <span>Network Throttling</span>
          </label>
          <select
            value={networkProfile}
            onChange={(e) => handleNetworkChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {Object.keys(NETWORK_PROFILES).map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
          {networkProfile !== 'No Throttling' && (
            <p className="mt-1 text-xs text-gray-500">
              {networkProfile === 'Offline' ? (
                'Network disabled'
              ) : (
                <>
                  {NETWORK_PROFILES[networkProfile].downloadThroughput > 0 && (
                    <>
                      {(NETWORK_PROFILES[networkProfile].downloadThroughput * 8 / 1024 / 1024).toFixed(1)} Mbps down,{' '}
                      {(NETWORK_PROFILES[networkProfile].uploadThroughput * 8 / 1024 / 1024).toFixed(1)} Mbps up,{' '}
                      {NETWORK_PROFILES[networkProfile].latency}ms latency
                    </>
                  )}
                </>
              )}
            </p>
          )}
        </div>

        {/* Geolocation */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-2">
            <MapPin size={14} />
            <span>Geolocation</span>
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => handleLocationChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Use actual location</option>
            {Object.keys(PRESET_LOCATIONS).map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          {selectedLocation && (
            <p className="mt-1 text-xs text-gray-500">
              {PRESET_LOCATIONS[selectedLocation].latitude.toFixed(4)},{' '}
              {PRESET_LOCATIONS[selectedLocation].longitude.toFixed(4)}
            </p>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> These capabilities are only available for Android devices using Chrome DevTools Protocol.
          iOS support is limited.
        </p>
      </div>
    </div>
  )
}
