/**
 * Platform Toggle Component
 *
 * Toggle between Web and Mobile platforms for a project
 * Clean, simple UI with clear visual feedback
 */

import { Monitor, Smartphone } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { PlatformType } from '../types/feature'

interface PlatformToggleProps {
  projectId: string
}

export function PlatformToggle({ projectId }: PlatformToggleProps) {
  const { projects, setPlatform } = useProjectStore()

  const project = projects.find((p: any) => p.id === projectId)
  const currentPlatform: PlatformType = project?.currentPlatform || 'web'

  const handleToggle = (platform: PlatformType) => {
    if (platform !== currentPlatform) {
      setPlatform(projectId, platform)
    }
  }

  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1">
      {/* Web Button */}
      <button
        onClick={() => handleToggle('web')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md transition-all font-medium text-sm
          ${currentPlatform === 'web'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900'
          }
        `}
      >
        <Monitor size={18} />
        <span>Web</span>
      </button>

      {/* Mobile Button */}
      <button
        onClick={() => handleToggle('mobile')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md transition-all font-medium text-sm
          ${currentPlatform === 'mobile'
            ? 'bg-green-600 text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900'
          }
        `}
      >
        <Smartphone size={18} />
        <span>Mobile</span>
      </button>
    </div>
  )
}
