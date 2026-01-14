import { useState, useEffect } from 'react'
import { Wifi, RefreshCw, ChevronDown, AlertCircle, CheckCircle, Network } from 'lucide-react'

interface NetworkInterface {
  interface: string
  address: string
  type: 'hotspot' | 'wifi' | 'ethernet' | 'vpn' | 'virtual' | 'other'
}

interface NetworkInfo {
  port: number
  ip: string
  allIPs: NetworkInterface[]
}

export const NetworkInfoDisplay: React.FC = () => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedInterface, setSelectedInterface] = useState<string | null>(null)

  // Listen for network updates from server
  useEffect(() => {
    if (!window.electronAPI) return

    const handleServerStarted = (data: any) => {
      console.log('🌐 [NetworkInfo] Received network info:', data)
      setNetworkInfo(data)
      if (!selectedInterface && data.ip) {
        // Find the interface for the primary IP
        const primaryInterface = data.allIPs?.find((iface: NetworkInterface) => iface.address === data.ip)
        if (primaryInterface) {
          setSelectedInterface(primaryInterface.interface)
        }
      }
    }

    window.electronAPI.onSDKEvent('server-started', handleServerStarted)

    // Request current network info on mount
    window.electronAPI.refreshSDKNetwork()

    return () => {
      // Cleanup if needed
    }
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await window.electronAPI.refreshSDKNetwork()
      // Network info will be updated via the event listener
    } catch (error) {
      console.error('Failed to refresh network:', error)
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  const handleSelectInterface = async (iface: NetworkInterface) => {
    setSelectedInterface(iface.interface)
    setIsOpen(false)

    // TODO: Implement manual interface selection on the server
    // This would require a new IPC handler to override the automatic detection
    console.log('🌐 [NetworkInfo] Selected interface:', iface.interface, iface.address)
  }

  const getTypeEmoji = (type: string) => {
    const emojiMap: Record<string, string> = {
      'hotspot': '📱',
      'wifi': '📶',
      'ethernet': '🔌',
      'vpn': '🔒',
      'virtual': '💻',
      'other': '🌐'
    }
    return emojiMap[type] || '🌐'
  }

  const getTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      'hotspot': 'iPhone Hotspot',
      'wifi': 'WiFi',
      'ethernet': 'Ethernet',
      'vpn': 'VPN (Filtered)',
      'virtual': 'Virtual (Filtered)',
      'other': 'Other'
    }
    return labelMap[type] || type
  }

  if (!networkInfo) {
    return (
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw size={14} className="animate-spin" />
          <span>Loading network info...</span>
        </div>
      </div>
    )
  }

  const physicalInterfaces = networkInfo.allIPs?.filter(iface =>
    iface.type !== 'vpn' && iface.type !== 'virtual'
  ) || []

  const vpnInterfaces = networkInfo.allIPs?.filter(iface =>
    iface.type === 'vpn' || iface.type === 'virtual'
  ) || []

  const currentInterface = networkInfo.allIPs?.find(iface => iface.address === networkInfo.ip)

  return (
    <div className="relative">
      {/* Network Info Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 hover:from-blue-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <Network size={16} className="text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">
                  Server Address
                </span>
                <CheckCircle size={14} className="text-green-500" />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {currentInterface && (
                  <>
                    <span>{getTypeEmoji(currentInterface.type)}</span>
                    <span className="font-mono">ws://{networkInfo.ip}:{networkInfo.port}</span>
                    <span className="text-gray-400">({currentInterface.interface})</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRefresh()
              }}
              disabled={isRefreshing}
              className="p-1.5 hover:bg-white/50 rounded transition-colors disabled:opacity-50"
              title="Refresh network detection"
            >
              <RefreshCw size={14} className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <ChevronDown
              size={16}
              className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Content */}
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl z-40 max-h-96 overflow-y-auto">
            {/* Physical Interfaces */}
            <div className="p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Available Networks
              </div>
              {physicalInterfaces.length === 0 ? (
                <div className="py-6 text-center">
                  <AlertCircle size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No physical network interfaces found</p>
                  <p className="text-xs text-gray-400 mt-1">Check WiFi or Ethernet connection</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {physicalInterfaces.map(iface => (
                    <button
                      key={iface.interface}
                      onClick={() => handleSelectInterface(iface)}
                      className={`w-full px-3 py-2 rounded-lg text-left transition-colors ${
                        iface.address === networkInfo.ip
                          ? 'bg-blue-100 border border-blue-300'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getTypeEmoji(iface.type)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {iface.interface}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getTypeLabel(iface.type)}
                            </span>
                            {iface.address === networkInfo.ip && (
                              <CheckCircle size={12} className="text-blue-600" />
                            )}
                          </div>
                          <div className="text-xs font-mono text-gray-600">
                            {iface.address}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* VPN Interfaces (if any) */}
            {vpnInterfaces.length > 0 && (
              <div className="px-4 pb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Filtered Interfaces (Not Used)
                </div>
                <div className="space-y-1">
                  {vpnInterfaces.map(iface => (
                    <div
                      key={iface.interface}
                      className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getTypeEmoji(iface.type)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {iface.interface}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getTypeLabel(iface.type)}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-gray-500">
                            {iface.address}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800">
                      <strong>VPN detected:</strong> Devices connect via physical network (WiFi/Ethernet),
                      not VPN tunnel. This ensures local network communication works correctly.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Connection Info */}
            <div className="px-4 pb-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs font-semibold text-blue-900 mb-1">
                  For iOS Devices:
                </div>
                <div className="text-xs text-blue-800">
                  Devices can auto-discover this server via Bonjour, or connect manually to:{' '}
                  <code className="font-mono bg-white px-1 py-0.5 rounded">
                    ws://{networkInfo.ip}:{networkInfo.port}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
