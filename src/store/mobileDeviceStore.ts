import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MobileDevice, DeviceConnection, ConnectionStatus } from '../types/mobileDevice'

export type AppMode = 'web' | 'mobile'

interface MobileDeviceState {
  // Mode
  currentMode: AppMode

  // Devices
  devices: MobileDevice[]
  currentDeviceId: string | null
  connections: Map<string, DeviceConnection>

  // Discovery
  isScanning: boolean
  lastScanTime: number | null

  // Actions
  setMode: (mode: AppMode) => void
  addDevice: (device: MobileDevice) => void
  removeDevice: (deviceId: string) => void
  updateDevice: (deviceId: string, updates: Partial<MobileDevice>) => void
  setCurrentDevice: (deviceId: string | null) => void
  updateDeviceStatus: (deviceId: string, status: ConnectionStatus) => void

  // Connection management
  setDeviceConnection: (deviceId: string, connection: DeviceConnection) => void
  removeDeviceConnection: (deviceId: string) => void
  getDeviceConnection: (deviceId: string) => DeviceConnection | undefined

  // Discovery
  setScanning: (scanning: boolean) => void
  setLastScanTime: (time: number) => void
  clearAllDevices: () => void

  // Helpers
  getCurrentDevice: () => MobileDevice | undefined
  getConnectedDevices: () => MobileDevice[]

  // Initialization
  resetAllDeviceStatuses: () => void
  removeOldIPBasedDevices: () => void
}

export const useMobileDeviceStore = create<MobileDeviceState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentMode: 'web',
      devices: [],
      currentDeviceId: null,
      connections: new Map(),
      isScanning: false,
      lastScanTime: null,

      // Mode management
      setMode: (mode: AppMode) => {
        console.log(`📱 [MOBILE STORE] Setting mode to: ${mode}`)
        set({ currentMode: mode })
      },

      // Device management
      addDevice: (device: MobileDevice) => {
        console.log(`📱 [MOBILE STORE] Adding device: ${device.name} (ID: ${device.id})`)
        console.log(`📱 [MOBILE STORE] Current device count: ${get().devices.length}`)
        set((state) => ({
          devices: [...state.devices.filter(d => d.id !== device.id), device]
        }))
        console.log(`📱 [MOBILE STORE] New device count: ${get().devices.length}`)
        console.log(`📱 [MOBILE STORE] All device IDs:`, get().devices.map(d => d.id))
      },

      removeDevice: (deviceId: string) => {
        console.log(`📱 [MOBILE STORE] Removing device:`, deviceId)
        set((state) => ({
          devices: state.devices.filter(d => d.id !== deviceId),
          currentDeviceId: state.currentDeviceId === deviceId ? null : state.currentDeviceId
        }))

        // Remove connection as well
        const connections = new Map(get().connections)
        connections.delete(deviceId)
        set({ connections })
      },

      updateDevice: (deviceId: string, updates: Partial<MobileDevice>) => {
        console.log(`📱 [MOBILE STORE] Updating device ${deviceId}:`, updates)
        set((state) => ({
          devices: state.devices.map(d =>
            d.id === deviceId ? { ...d, ...updates } : d
          )
        }))
      },

      setCurrentDevice: (deviceId: string | null) => {
        console.log(`📱 [MOBILE STORE] Setting current device:`, deviceId)
        set({ currentDeviceId: deviceId })

        // If setting a device and mode is web, switch to mobile
        if (deviceId && get().currentMode === 'web') {
          get().setMode('mobile')
        }
      },

      updateDeviceStatus: (deviceId: string, status: ConnectionStatus) => {
        console.log(`📱 [MOBILE STORE] Updating device ${deviceId} status:`, status)
        get().updateDevice(deviceId, { status })
      },

      // Connection management
      setDeviceConnection: (deviceId: string, connection: DeviceConnection) => {
        console.log(`📱 [MOBILE STORE] Setting connection for device:`, deviceId)
        const connections = new Map(get().connections)
        connections.set(deviceId, connection)
        set({ connections })
      },

      removeDeviceConnection: (deviceId: string) => {
        console.log(`📱 [MOBILE STORE] Removing connection for device:`, deviceId)
        const connections = new Map(get().connections)
        connections.delete(deviceId)
        set({ connections })
      },

      getDeviceConnection: (deviceId: string) => {
        return get().connections.get(deviceId)
      },

      // Discovery
      setScanning: (scanning: boolean) => {
        console.log(`📱 [MOBILE STORE] Setting scanning:`, scanning)
        set({ isScanning: scanning })
      },

      setLastScanTime: (time: number) => {
        set({ lastScanTime: time })
      },

      clearAllDevices: () => {
        console.log(`📱 [MOBILE STORE] Clearing all devices`)
        set({
          devices: [],
          currentDeviceId: null,
          connections: new Map()
        })
      },

      // Helpers
      getCurrentDevice: () => {
        const state = get()
        return state.devices.find(d => d.id === state.currentDeviceId)
      },

      getConnectedDevices: () => {
        return get().devices.filter(d => d.status === 'connected')
      },

      // Initialization
      resetAllDeviceStatuses: () => {
        console.log('🔄 [MOBILE STORE] Resetting all device statuses to disconnected (app startup)')
        set((state) => ({
          devices: state.devices.map(d => ({
            ...d,
            status: 'disconnected'
          }))
        }))
      },

      // Migration: Remove old IP-based device IDs (cleanup from old format)
      removeOldIPBasedDevices: () => {
        const state = get()
        console.log('🧹 [MOBILE STORE] Running migration to remove old IP-based device IDs')
        console.log(`📊 [MOBILE STORE] Current devices before migration:`, state.devices.map(d => `${d.id} (${d.name})`))

        // Old format: ios-wifi-192-168-50-99 (IP-based)
        // New format: ios-wifi-iphone (hostname-based)
        const oldIPBasedPattern = /^ios-wifi-\d+-\d+-\d+-\d+$/
        const cleanedDevices = state.devices.filter(d => {
          const isOldFormat = oldIPBasedPattern.test(d.id)
          if (isOldFormat) {
            console.log(`   🗑️ Removing old IP-based device: ${d.id} (${d.name})`)
            return false
          }
          return true
        })

        const removedCount = state.devices.length - cleanedDevices.length
        if (removedCount > 0) {
          console.log(`✅ [MOBILE STORE] Removed ${removedCount} old IP-based device(s)`)
          set({
            devices: cleanedDevices,
            currentDeviceId: oldIPBasedPattern.test(state.currentDeviceId || '') ? null : state.currentDeviceId
          })
        } else {
          console.log(`✅ [MOBILE STORE] No old IP-based devices found, migration skipped`)
        }

        console.log(`📊 [MOBILE STORE] Devices after migration:`, get().devices.map(d => `${d.id} (${d.name})`))
      }
    }),
    {
      name: 'mobile-device-storage',
      partialize: (state) => ({
        // Only persist mode and device list (not connections or scanning state)
        currentMode: state.currentMode,
        devices: state.devices,
        currentDeviceId: state.currentDeviceId
      })
    }
  )
)
