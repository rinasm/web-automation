/**
 * Device Capabilities Manager
 *
 * Manages device features like rotation, network throttling, and geolocation.
 * Works with both CDP (Android) and WebKit (iOS) connections.
 */

import { MobileDevice, AndroidDevice, IOSDevice } from '../types/mobileDevice'
import { cdpConnectionManager } from './cdpConnection'
import { webkitConnectionManager } from './webkitConnection'

/**
 * Device orientation
 */
export type DeviceOrientation = 'portrait' | 'landscape'

/**
 * Network throttling profile
 */
export interface NetworkThrottlingProfile {
  name: string
  downloadThroughput: number // bytes/sec
  uploadThroughput: number // bytes/sec
  latency: number // ms
}

/**
 * Predefined network profiles
 */
export const NETWORK_PROFILES: Record<string, NetworkThrottlingProfile> = {
  'No Throttling': {
    name: 'No Throttling',
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0
  },
  'Fast 3G': {
    name: 'Fast 3G',
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8, // 750 Kbps
    latency: 40
  },
  'Slow 3G': {
    name: 'Slow 3G',
    downloadThroughput: 400 * 1024 / 8, // 400 Kbps
    uploadThroughput: 400 * 1024 / 8, // 400 Kbps
    latency: 400
  },
  '4G': {
    name: '4G',
    downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
    uploadThroughput: 3 * 1024 * 1024 / 8, // 3 Mbps
    latency: 20
  },
  'WiFi': {
    name: 'WiFi',
    downloadThroughput: 30 * 1024 * 1024 / 8, // 30 Mbps
    uploadThroughput: 15 * 1024 * 1024 / 8, // 15 Mbps
    latency: 2
  },
  'Offline': {
    name: 'Offline',
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0
  }
}

/**
 * Geolocation coordinates
 */
export interface GeolocationCoordinates {
  latitude: number
  longitude: number
  accuracy?: number
}

/**
 * Predefined locations
 */
export const PRESET_LOCATIONS: Record<string, GeolocationCoordinates> = {
  'San Francisco': { latitude: 37.7749, longitude: -122.4194, accuracy: 100 },
  'New York': { latitude: 40.7128, longitude: -74.0060, accuracy: 100 },
  'London': { latitude: 51.5074, longitude: -0.1278, accuracy: 100 },
  'Tokyo': { latitude: 35.6762, longitude: 139.6503, accuracy: 100 },
  'Sydney': { latitude: -33.8688, longitude: 151.2093, accuracy: 100 },
  'Berlin': { latitude: 52.5200, longitude: 13.4050, accuracy: 100 },
  'Mumbai': { latitude: 19.0760, longitude: 72.8777, accuracy: 100 },
  'Dubai': { latitude: 25.2048, longitude: 55.2708, accuracy: 100 }
}

/**
 * Device Capabilities Manager
 */
export class DeviceCapabilitiesManager {
  private device: MobileDevice
  private currentOrientation: DeviceOrientation = 'portrait'
  private currentNetworkProfile: string = 'No Throttling'
  private currentLocation: GeolocationCoordinates | null = null

  constructor(device: MobileDevice) {
    this.device = device
  }

  /**
   * Rotate device
   */
  async setOrientation(orientation: DeviceOrientation): Promise<void> {
    console.log(`📱 [Capabilities] Setting orientation: ${orientation}`)

    if (this.device.os === 'android') {
      try {
        // Use CDP Emulation.setDeviceMetricsOverride
        const connection = cdpConnectionManager.getConnection(this.device.id)

        if (!connection) {
          throw new Error('No CDP connection')
        }

        const { screenWidth, screenHeight } = this.device.capabilities

        // Swap dimensions for landscape
        const width = orientation === 'landscape' ? screenHeight : screenWidth
        const height = orientation === 'landscape' ? screenWidth : screenHeight

        await connection.client.Emulation.setDeviceMetricsOverride({
          width,
          height,
          deviceScaleFactor: this.device.capabilities.pixelRatio || 2,
          mobile: true,
          screenOrientation: {
            type: orientation === 'portrait' ? 'portraitPrimary' : 'landscapePrimary',
            angle: orientation === 'portrait' ? 0 : 90
          }
        })

        this.currentOrientation = orientation
        console.log(`📱 [Capabilities] Orientation set to: ${orientation}`)
      } catch (error: any) {
        console.error('📱 [Capabilities] Failed to set orientation:', error)
        throw error
      }
    } else {
      console.warn('📱 [Capabilities] iOS orientation change not supported')
      throw new Error('iOS orientation change requires native support')
    }
  }

  /**
   * Get current orientation
   */
  getCurrentOrientation(): DeviceOrientation {
    return this.currentOrientation
  }

  /**
   * Set network throttling
   */
  async setNetworkThrottling(profileName: string): Promise<void> {
    const profile = NETWORK_PROFILES[profileName]

    if (!profile) {
      throw new Error(`Unknown network profile: ${profileName}`)
    }

    console.log(`🌐 [Capabilities] Setting network throttling: ${profileName}`)

    if (this.device.os === 'android') {
      try {
        const connection = cdpConnectionManager.getConnection(this.device.id)

        if (!connection) {
          throw new Error('No CDP connection')
        }

        await connection.client.Network.emulateNetworkConditions({
          offline: profileName === 'Offline',
          downloadThroughput: profile.downloadThroughput,
          uploadThroughput: profile.uploadThroughput,
          latency: profile.latency
        })

        this.currentNetworkProfile = profileName
        console.log(`🌐 [Capabilities] Network throttling set to: ${profileName}`)
      } catch (error: any) {
        console.error('🌐 [Capabilities] Failed to set network throttling:', error)
        throw error
      }
    } else {
      console.warn('🌐 [Capabilities] iOS network throttling not supported')
      throw new Error('iOS network throttling requires native support')
    }
  }

  /**
   * Get current network profile
   */
  getCurrentNetworkProfile(): string {
    return this.currentNetworkProfile
  }

  /**
   * Set geolocation
   */
  async setGeolocation(location: GeolocationCoordinates): Promise<void> {
    console.log(`📍 [Capabilities] Setting geolocation: ${location.latitude}, ${location.longitude}`)

    if (this.device.os === 'android') {
      try {
        const connection = cdpConnectionManager.getConnection(this.device.id)

        if (!connection) {
          throw new Error('No CDP connection')
        }

        await connection.client.Emulation.setGeolocationOverride({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 100
        })

        this.currentLocation = location
        console.log(`📍 [Capabilities] Geolocation set`)
      } catch (error: any) {
        console.error('📍 [Capabilities] Failed to set geolocation:', error)
        throw error
      }
    } else {
      console.warn('📍 [Capabilities] iOS geolocation override not supported')
      throw new Error('iOS geolocation override requires native support')
    }
  }

  /**
   * Set geolocation by preset name
   */
  async setPresetLocation(locationName: string): Promise<void> {
    const location = PRESET_LOCATIONS[locationName]

    if (!location) {
      throw new Error(`Unknown preset location: ${locationName}`)
    }

    await this.setGeolocation(location)
  }

  /**
   * Clear geolocation override
   */
  async clearGeolocation(): Promise<void> {
    console.log(`📍 [Capabilities] Clearing geolocation override`)

    if (this.device.os === 'android') {
      try {
        const connection = cdpConnectionManager.getConnection(this.device.id)

        if (!connection) {
          throw new Error('No CDP connection')
        }

        await connection.client.Emulation.clearGeolocationOverride()

        this.currentLocation = null
        console.log(`📍 [Capabilities] Geolocation cleared`)
      } catch (error: any) {
        console.error('📍 [Capabilities] Failed to clear geolocation:', error)
        throw error
      }
    }
  }

  /**
   * Get current location
   */
  getCurrentLocation(): GeolocationCoordinates | null {
    return this.currentLocation
  }

  /**
   * Reset all overrides
   */
  async resetAll(): Promise<void> {
    console.log(`📱 [Capabilities] Resetting all overrides`)

    try {
      // Reset orientation to portrait
      if (this.currentOrientation !== 'portrait') {
        await this.setOrientation('portrait')
      }

      // Reset network throttling
      if (this.currentNetworkProfile !== 'No Throttling') {
        await this.setNetworkThrottling('No Throttling')
      }

      // Clear geolocation
      if (this.currentLocation) {
        await this.clearGeolocation()
      }

      console.log(`📱 [Capabilities] All overrides reset`)
    } catch (error: any) {
      console.error('📱 [Capabilities] Failed to reset overrides:', error)
      throw error
    }
  }

  /**
   * Get device info
   */
  getDevice(): MobileDevice {
    return this.device
  }
}

/**
 * Singleton manager for device capabilities
 */
class DeviceCapabilitiesRegistry {
  private managers: Map<string, DeviceCapabilitiesManager> = new Map()

  /**
   * Get or create manager for device
   */
  getManager(device: MobileDevice): DeviceCapabilitiesManager {
    let manager = this.managers.get(device.id)

    if (!manager) {
      manager = new DeviceCapabilitiesManager(device)
      this.managers.set(device.id, manager)
    }

    return manager
  }

  /**
   * Remove manager
   */
  removeManager(deviceId: string): void {
    this.managers.delete(deviceId)
  }

  /**
   * Clear all managers
   */
  clearAll(): void {
    this.managers.clear()
  }
}

// Export singleton instance
export const deviceCapabilitiesRegistry = new DeviceCapabilitiesRegistry()
