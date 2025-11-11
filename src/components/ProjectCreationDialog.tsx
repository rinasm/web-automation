/**
 * Project Creation Dialog
 *
 * Multi-platform project creation with clean UX
 * Supports Web URL and Mobile app configuration
 */

import { useState } from 'react'
import { X } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useSettingsStore } from '../store/settingsStore'
import { MobileAppsConfig, PlatformType } from '../types/feature'

interface ProjectCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (projectId: string) => void
}

export function ProjectCreationDialog({ isOpen, onClose, onSuccess }: ProjectCreationDialogProps) {
  const { createProject } = useProjectStore()
  const { advancedMode } = useSettingsStore()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [initialPlatform, setInitialPlatform] = useState<PlatformType>('web')

  // Web configuration
  const [webUrl, setWebUrl] = useState('')

  // Mobile configuration
  const [configureMobile, setConfigureMobile] = useState(false)
  const [iosBundleId, setIosBundleId] = useState('')
  const [iosAppName, setIosAppName] = useState('')
  const [androidPackageName, setAndroidPackageName] = useState('')
  const [androidAppName, setAndroidAppName] = useState('')

  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!title.trim()) {
      setError('Project title is required')
      return
    }

    if (initialPlatform === 'web' && !webUrl.trim()) {
      setError('Web URL is required for Web platform')
      return
    }

    if (initialPlatform === 'mobile' && !configureMobile) {
      setError('Please configure at least one mobile app (iOS or Android)')
      return
    }

    if (initialPlatform === 'mobile' && configureMobile) {
      if (!iosBundleId.trim() && !androidPackageName.trim()) {
        setError('Please configure at least one mobile platform (iOS or Android)')
        return
      }
    }

    // Build mobile apps config
    let mobileApps: MobileAppsConfig | undefined

    if (configureMobile) {
      mobileApps = {}

      if (iosBundleId.trim()) {
        mobileApps.ios = {
          bundleId: iosBundleId.trim(),
          appName: iosAppName.trim() || iosBundleId.trim()
        }
      }

      if (androidPackageName.trim()) {
        mobileApps.android = {
          packageName: androidPackageName.trim(),
          appName: androidAppName.trim() || androidPackageName.trim()
        }
      }
    }

    // Create project
    const projectId = createProject(
      title.trim(),
      description.trim(),
      webUrl.trim() || undefined,
      mobileApps,
      initialPlatform
    )

    // Reset form
    setTitle('')
    setDescription('')
    setWebUrl('')
    setConfigureMobile(false)
    setIosBundleId('')
    setIosAppName('')
    setAndroidPackageName('')
    setAndroidAppName('')
    setInitialPlatform('web')

    onSuccess(projectId)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Create New Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome App"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description - Only in Advanced Mode */}
          {advancedMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Initial Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Platform *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="web"
                  checked={initialPlatform === 'web'}
                  onChange={() => setInitialPlatform('web')}
                  className="w-4 h-4 text-blue-600"
                />
                <span>Web</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="mobile"
                  checked={initialPlatform === 'mobile'}
                  onChange={() => {
                    setInitialPlatform('mobile')
                    setConfigureMobile(true)
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span>Mobile</span>
              </label>
            </div>
          </div>

          {/* Web URL */}
          {initialPlatform === 'web' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Web URL *
              </label>
              <input
                type="url"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={initialPlatform === 'web'}
              />
            </div>
          )}

          {/* Mobile Configuration Toggle */}
          {initialPlatform === 'web' && (
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configureMobile}
                  onChange={(e) => setConfigureMobile(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Also configure mobile apps (optional)
                </span>
              </label>
            </div>
          )}

          {/* Mobile Apps Configuration */}
          {(configureMobile || initialPlatform === 'mobile') && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">Mobile Apps Configuration</h3>

              {/* iOS Configuration */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">iOS App</h4>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Bundle ID {initialPlatform === 'mobile' ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    value={iosBundleId}
                    onChange={(e) => setIosBundleId(e.target.value)}
                    placeholder="com.company.app"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    App Name (optional)
                  </label>
                  <input
                    type="text"
                    value={iosAppName}
                    onChange={(e) => setIosAppName(e.target.value)}
                    placeholder="My App"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Android Configuration */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Android App</h4>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Package Name {initialPlatform === 'mobile' ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    value={androidPackageName}
                    onChange={(e) => setAndroidPackageName(e.target.value)}
                    placeholder="com.company.app"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    App Name (optional)
                  </label>
                  <input
                    type="text"
                    value={androidAppName}
                    onChange={(e) => setAndroidAppName(e.target.value)}
                    placeholder="My App"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
