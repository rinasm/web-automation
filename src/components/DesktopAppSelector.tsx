/**
 * Desktop Application Selector Component
 *
 * Allows users to select which desktop application to automate
 * Shows running applications and allows launching new ones
 */

import { useEffect, useState } from 'react'
import { RefreshCw, Play, X, Laptop } from 'lucide-react'
import { useDesktopStore } from '../store/desktopStore'

export function DesktopAppSelector() {
  const {
    runningApplications,
    selectedApplication,
    setSelectedApplication,
    refreshApplications,
    launchApplication,
    quitApplication,
    focusApplication,
  } = useDesktopStore()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [launchInput, setLaunchInput] = useState('')
  const [showLaunchInput, setShowLaunchInput] = useState(false)

  // Load applications on mount
  useEffect(() => {
    handleRefresh()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshApplications()
    setIsRefreshing(false)
  }

  const handleSelectApp = async (app: any) => {
    setSelectedApplication(app)
    // Focus the application when selected
    await focusApplication(app.pid)
  }

  const handleLaunchApp = async () => {
    if (!launchInput.trim()) return

    const success = await launchApplication(launchInput.trim())
    if (success) {
      setLaunchInput('')
      setShowLaunchInput(false)
      await handleRefresh()
    }
  }

  const handleQuitApp = async (pid: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to quit this application?')) {
      await quitApplication(pid)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Laptop size={20} className="text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Desktop Application
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          title="Refresh applications"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Selected Application */}
      {selectedApplication ? (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Selected Application</p>
              <p className="font-medium text-gray-900">
                {selectedApplication.name}
              </p>
              <p className="text-xs text-gray-500">PID: {selectedApplication.pid}</p>
            </div>
            <button
              onClick={() => setSelectedApplication(null)}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-purple-100 rounded-md transition-colors"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-center">
          <p className="text-sm text-gray-600">No application selected</p>
          <p className="text-xs text-gray-500 mt-1">
            Select an application from the list below
          </p>
        </div>
      )}

      {/* Running Applications List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Running Applications</h4>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {runningApplications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No applications found. Click refresh to reload.
            </p>
          ) : (
            runningApplications.map((app) => (
              <div
                key={app.pid}
                onClick={() => handleSelectApp(app)}
                className={`
                  flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors
                  ${
                    selectedApplication?.pid === app.pid
                      ? 'bg-purple-100 border border-purple-300'
                      : 'hover:bg-gray-100 border border-transparent'
                  }
                `}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{app.name}</p>
                  <p className="text-xs text-gray-500">
                    PID: {app.pid} • {app.windows.length} window(s)
                    {app.isFocused && (
                      <span className="ml-2 text-purple-600 font-medium">
                        • Focused
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={(e) => handleQuitApp(app.pid, e)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Quit application"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Launch Application */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        {!showLaunchInput ? (
          <button
            onClick={() => setShowLaunchInput(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm"
          >
            <Play size={16} />
            Launch Application
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={launchInput}
              onChange={(e) => setLaunchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLaunchApp()}
              placeholder="Enter app name or path (e.g., 'Safari', 'Microsoft Outlook')"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleLaunchApp}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm"
              >
                Launch
              </button>
              <button
                onClick={() => {
                  setShowLaunchInput(false)
                  setLaunchInput('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
