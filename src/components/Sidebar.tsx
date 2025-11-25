import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, FileText, Settings, ClipboardList, Zap, TrendingUp, Sparkles, Radio } from 'lucide-react'
import { useStepStore } from '../store/stepStore'
import { useSettingsStore } from '../store/settingsStore'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { steps } = useStepStore()
  const { advancedMode } = useSettingsStore()
  const [stats, setStats] = useState({ totalSteps: 0, totalActions: 0 })

  useEffect(() => {
    const totalSteps = steps.length
    const totalActions = steps.reduce((sum, step) => sum + step.actions.length, 0)
    setStats({ totalSteps, totalActions })
  }, [steps])

  const allMenuItems = [
    {
      id: 'flow',
      label: 'Features',
      icon: Play,
      description: 'Create and manage test features',
      isAdvanced: false
    },
    {
      id: 'autoflow',
      label: 'Auto Flow',
      icon: Zap,
      description: 'Automatically extract flows',
      isAdvanced: true
    },
    {
      id: 'aiexplore',
      label: 'AI Explore',
      icon: Sparkles,
      description: 'Intelligent journey discovery',
      isNew: true,
      isAdvanced: true
    },
    {
      id: 'results',
      label: 'Results',
      icon: ClipboardList,
      description: 'View test execution results',
      isAdvanced: false
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      description: 'Generate test reports',
      isAdvanced: false
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Configure test settings',
      isAdvanced: false
    }
  ]

  // Filter menu items based on advanced mode
  const menuItems = allMenuItems.filter(item => !item.isAdvanced || advancedMode)

  return (
    <div
      className={`h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
        {isExpanded ? (
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-800">Test Automation</h2>
            <p className="text-xs text-gray-500 mt-0.5">Build & Execute</p>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Play size={16} className="text-white" />
            </div>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 ml-2"
        >
          {isExpanded ? (
            <ChevronLeft size={18} className="text-gray-600" />
          ) : (
            <ChevronRight size={18} className="text-gray-600" />
          )}
        </button>
      </div>

      {/* Quick Stats Card */}
      {isExpanded && (
        <div className="mx-3 mt-4 mb-4 p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={20} className="text-white" />
            <h3 className="text-white font-semibold text-sm">Quick Stats</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-indigo-100 text-xs">Total Steps</span>
              <span className="text-white font-bold text-lg">{stats.totalSteps}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-indigo-100 text-xs">Total Actions</span>
              <span className="text-white font-bold text-lg">{stats.totalActions}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-indigo-400/30 flex items-center gap-1">
            <TrendingUp size={14} className="text-green-300" />
            <span className="text-xs text-indigo-100">Ready to automate</span>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-2">
        {isExpanded && (
          <div className="px-4 mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Navigation
            </span>
          </div>
        )}
        <div className="space-y-1 px-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
                title={!isExpanded ? item.label : ''}
              >
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                  <Icon size={20} className={isActive ? 'text-indigo-600' : 'text-gray-600'} />
                </div>
                {isExpanded && (
                  <div className="flex items-center gap-2 flex-1">
                    <span className={`text-sm font-medium text-left ${isActive ? 'text-indigo-600' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                    {item.isNew && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-bold">
                        NEW
                      </span>
                    )}
                  </div>
                )}
                {isActive && isExpanded && (
                  <div className="w-1 h-6 bg-indigo-600 rounded-full animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer Info */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 animate-fadeIn">
          <div className="flex items-center gap-2 px-2 py-2 bg-gray-100 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-600">System Ready</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
