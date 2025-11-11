import { Monitor, Smartphone } from 'lucide-react'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'

interface ModeToggleProps {
  disabled?: boolean
  className?: string
}

export const ModeToggle: React.FC<ModeToggleProps> = ({ disabled = false, className = '' }) => {
  const { currentMode, setMode, getCurrentDevice, getConnectedDevices } = useMobileDeviceStore()
  const currentDevice = getCurrentDevice()
  const connectedDevices = getConnectedDevices()

  const handleToggle = () => {
    if (disabled) return

    if (currentMode === 'web') {
      // Switching to mobile - allow even without devices
      // User will see device connection options
      setMode('mobile')
    } else {
      setMode('web')
    }
  }

  const isMobileDisabled = disabled

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Mode Label */}
      <span className="text-sm font-medium text-gray-700">
        {currentMode === 'web' ? 'Web' : 'Mobile'}
      </span>

      {/* Toggle Switch */}
      <div
        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
          currentMode === 'mobile'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
            : 'bg-gray-300'
        } ${isMobileDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={handleToggle}
        title={
          isMobileDisabled
            ? 'No mobile devices connected. Connect a device to enable mobile mode.'
            : currentMode === 'web'
            ? 'Switch to Mobile Mode'
            : 'Switch to Web Mode'
        }
      >
        {/* Slider */}
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md ${
            currentMode === 'mobile' ? 'translate-x-9' : 'translate-x-1'
          }`}
        />

        {/* Icons */}
        <Monitor
          size={14}
          className={`absolute left-2 transition-colors ${
            currentMode === 'web' ? 'text-gray-600' : 'text-white/60'
          }`}
        />
        <Smartphone
          size={14}
          className={`absolute right-2 transition-colors ${
            currentMode === 'mobile' ? 'text-white' : 'text-gray-400'
          }`}
        />
      </div>

      {/* Current Device Indicator (when in mobile mode) */}
      {currentMode === 'mobile' && currentDevice && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-blue-700">
            {currentDevice.name}
          </span>
        </div>
      )}

      {/* No Device Warning (when trying to use mobile mode without device) */}
      {currentMode === 'mobile' && !currentDevice && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          <span className="text-xs font-medium text-amber-700">
            No device selected
          </span>
        </div>
      )}
    </div>
  )
}
