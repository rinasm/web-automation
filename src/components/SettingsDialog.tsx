/**
 * Settings Dialog Component
 *
 * Application settings including Advanced Mode toggle
 * Clean, simple interface for configuration
 */

import { X, Settings as SettingsIcon } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const {
    advancedMode,
    toggleAdvancedMode,
    mobileAppUrl,
    webUrl,
    setMobileAppUrl,
    setWebUrl,
    resetSettings
  } = useSettingsStore()

  if (!isOpen) return null

  const handleReset = () => {
    if (confirm('Reset all settings to default?')) {
      resetSettings()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <SettingsIcon size={24} className="text-gray-700" />
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Settings Content */}
        <div className="p-6 space-y-6">
          {/* Advanced Mode Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">User Interface</h3>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900">Advanced Mode</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      advancedMode
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {advancedMode ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Show advanced features and verbose options. When disabled, only essential features are visible for a cleaner interface.
                  </p>

                  {/* Toggle Switch */}
                  <button
                    onClick={toggleAdvancedMode}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${advancedMode ? 'bg-blue-600' : 'bg-gray-300'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${advancedMode ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>
              </div>

              {/* Advanced Mode Info */}
              {advancedMode && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Advanced mode is enabled. You'll see additional options for:
                  </p>
                  <ul className="mt-2 text-xs text-gray-600 space-y-1 ml-4">
                    <li>• Detailed step configuration</li>
                    <li>• Code generation settings</li>
                    <li>• Mobile device capabilities</li>
                    <li>• Advanced debugging options</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Platform Configuration Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Platform Configuration</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Mobile App URL */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Mobile App URL
                </label>
                <input
                  type="text"
                  value={mobileAppUrl}
                  onChange={(e) => setMobileAppUrl(e.target.value)}
                  placeholder="e.g., com.rinasmusthafa.DigitalBooking"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-600">
                  Bundle ID or package name for mobile app testing
                </p>
              </div>

              {/* Web URL */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Web URL
                </label>
                <input
                  type="text"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="e.g., https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-600">
                  Default URL for web testing and recording
                </p>
              </div>
            </div>
          </div>

          {/* Reset Section */}
          <div className="pt-4 border-t">
            <button
              onClick={handleReset}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Reset All Settings to Default
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
