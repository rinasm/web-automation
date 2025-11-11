import { useState } from 'react'
import { X, Smartphone, Wifi, Info, CheckCircle, AlertCircle } from 'lucide-react'
import { deviceConnectionService } from '../services/deviceConnectionService'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import { ADBPairingInfo } from '../types/mobileDevice'

interface DeviceConnectionDialogProps {
  isOpen: boolean
  onClose: () => void
}

type ConnectionStep = 'platform' | 'instructions' | 'connect' | 'success'

export const DeviceConnectionDialog: React.FC<DeviceConnectionDialogProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<ConnectionStep>('platform')
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | null>(null)
  const [connectionMethod, setConnectionMethod] = useState<'auto' | 'manual'>('auto')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Manual connection form
  const [manualIp, setManualIp] = useState('')
  const [manualPort, setManualPort] = useState('5555')
  const [pairingCode, setPairingCode] = useState('')

  const { addDevice, setCurrentDevice, updateDeviceStatus } = useMobileDeviceStore()

  if (!isOpen) return null

  const handlePlatformSelect = (platform: 'android' | 'ios') => {
    setSelectedPlatform(platform)
    setStep('instructions')
  }

  const handleAutoScan = async () => {
    setStep('connect')
    setIsConnecting(true)
    setError(null)

    try {
      const devices = await deviceConnectionService.scanForDevices()

      if (devices.length === 0) {
        setError('No devices found. Please check your device and network connection.')
        return
      }

      // Add discovered devices
      devices.forEach(device => {
        addDevice(device)

        // Try to connect to the first matching platform device
        if (device.os === selectedPlatform && device.status !== 'connected') {
          connectToDevice(device.id)
        }
      })

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Failed to scan for devices')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleManualConnect = async () => {
    if (!manualIp || !manualPort) {
      setError('Please enter IP address and port')
      return
    }

    setStep('connect')
    setIsConnecting(true)
    setError(null)

    try {
      if (selectedPlatform === 'android' && pairingCode) {
        // Android with pairing code
        const pairingInfo: ADBPairingInfo = {
          ip: manualIp,
          port: parseInt(manualPort),
          pairingCode
        }
        const device = await deviceConnectionService.pairAndroidDevice(pairingInfo)
        addDevice(device)
        setCurrentDevice(device.id)
      } else {
        // Manual connection without pairing
        setError('Manual connection not fully implemented yet')
        return
      }

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Failed to connect to device')
    } finally {
      setIsConnecting(false)
    }
  }

  const connectToDevice = async (deviceId: string) => {
    try {
      updateDeviceStatus(deviceId, 'connecting')
      const device = useMobileDeviceStore.getState().devices.find(d => d.id === deviceId)
      if (device) {
        await deviceConnectionService.connectToDevice(device)
        updateDeviceStatus(deviceId, 'connected')
        setCurrentDevice(deviceId)
      }
    } catch (err) {
      updateDeviceStatus(deviceId, 'error')
    }
  }

  const handleClose = () => {
    setStep('platform')
    setSelectedPlatform(null)
    setConnectionMethod('auto')
    setError(null)
    setManualIp('')
    setManualPort('5555')
    setPairingCode('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <Smartphone size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connect Mobile Device</h2>
              <p className="text-sm text-gray-600">Follow the steps to connect your device</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: Platform Selection */}
          {step === 'platform' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Platform</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handlePlatformSelect('android')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                >
                  <div className="text-4xl mb-2">🤖</div>
                  <div className="font-semibold text-gray-900">Android</div>
                  <div className="text-sm text-gray-600 mt-1">Android 11+</div>
                </button>
                <button
                  onClick={() => handlePlatformSelect('ios')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                >
                  <div className="text-4xl mb-2">🍎</div>
                  <div className="font-semibold text-gray-900">iOS</div>
                  <div className="text-sm text-gray-600 mt-1">Limited support</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Instructions */}
          {step === 'instructions' && selectedPlatform && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedPlatform === 'android' ? 'Android' : 'iOS'} Setup Instructions
                </h3>

                {selectedPlatform === 'android' ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex gap-2">
                        <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <strong>Requirements:</strong> Android 11+ with Developer Options enabled
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          1
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Enable Developer Options</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Go to Settings → About Phone → Tap "Build Number" 7 times
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          2
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Enable Wireless Debugging</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Settings → Developer Options → Enable "Wireless Debugging"
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          3
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Connect to Same WiFi</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Ensure your device and computer are on the same WiFi network
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex gap-2">
                        <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <strong>Note:</strong> iOS support is limited. Web inspection via Safari only.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          1
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Enable Web Inspector</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Settings → Safari → Advanced → Enable "Web Inspector"
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          2
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Connect via USB First</div>
                          <div className="text-sm text-gray-600 mt-1">
                            iOS requires initial USB connection before wireless debugging
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Connection Method */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Connection Method</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConnectionMethod('auto')}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      connectionMethod === 'auto'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Wifi size={24} className="mx-auto mb-2 text-blue-500" />
                    <div className="font-medium text-sm">Auto Scan</div>
                    <div className="text-xs text-gray-600 mt-1">Recommended</div>
                  </button>
                  <button
                    onClick={() => setConnectionMethod('manual')}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      connectionMethod === 'manual'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Info size={24} className="mx-auto mb-2 text-gray-500" />
                    <div className="font-medium text-sm">Manual</div>
                    <div className="text-xs text-gray-600 mt-1">Enter IP & Port</div>
                  </button>
                </div>
              </div>

              {/* Manual Connection Form */}
              {connectionMethod === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device IP Address
                    </label>
                    <input
                      type="text"
                      value={manualIp}
                      onChange={(e) => setManualIp(e.target.value)}
                      placeholder="192.168.1.100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Port
                    </label>
                    <input
                      type="text"
                      value={manualPort}
                      onChange={(e) => setManualPort(e.target.value)}
                      placeholder="5555"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {selectedPlatform === 'android' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pairing Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={pairingCode}
                        onChange={(e) => setPairingCode(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Find in: Wireless Debugging → Pair device with pairing code
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('platform')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={connectionMethod === 'auto' ? handleAutoScan : handleManualConnect}
                  disabled={isConnecting}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Device'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Connecting */}
          {step === 'connect' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connecting...</h3>
              <p className="text-sm text-gray-600">
                Searching for devices on your network
              </p>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Device Connected!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                You can now start testing on your mobile device
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start Testing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
