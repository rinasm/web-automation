import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useStepStore } from '../store/stepStore'
import WebView from '../components/WebView'
import StepPanel from '../components/StepPanel'
import AutoFlowPanel from '../components/AutoFlowPanel'
import Toast, { ToastType } from '../components/Toast'
import Sidebar from '../components/Sidebar'
import { FlowExtractor } from '../utils/flowExtractor'

interface ToastState {
  message: string
  type: ToastType
  show: boolean
}

function ProjectView() {
  const { projects, currentProjectId, openProjectTabs, setCurrentProject, closeProjectTab, navigateTo, username, logout } = useProjectStore()
  const [sidebarTab, setSidebarTab] = useState<string>('flow')
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', show: false })
  const webviewRef = useRef<any>(null)

  const currentProject = projects.find(p => p.id === currentProjectId)

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, show: true })
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }))
  }

  if (!currentProject) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-gray-500">No project selected</div>
      </div>
    )
  }

  const handleExtractFlow = async () => {
    const webview = webviewRef.current
    if (!webview) {
      throw new Error('Webview not available')
    }

    const extractor = new FlowExtractor(webview)
    const elements = await extractor.extractInteractableElements()
    console.log('Extracted elements:', elements)
    return elements
  }

  const handleHighlightElement = async (selector: string, highlight: boolean) => {
    const webview = webviewRef.current
    if (!webview) {
      throw new Error('Webview not available')
    }

    const extractor = new FlowExtractor(webview)
    await extractor.highlightElement(selector, highlight)
  }

  const renderMainContent = () => {
    switch (sidebarTab) {
      case 'flow':
        return (
          <div className="flex-1 flex overflow-hidden">
            {/* Website Preview */}
            <div className="flex-1 bg-gray-100">
              <WebView url={currentProject.url} ref={webviewRef} />
            </div>

            {/* Right: Step Panel (400px fixed) */}
            <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-lg">
              <StepPanel showToast={showToast} />
            </div>
          </div>
        )
      case 'autoflow':
        return (
          <div className="flex-1 flex overflow-hidden">
            {/* Website Preview */}
            <div className="flex-1 bg-gray-100">
              <WebView url={currentProject.url} ref={webviewRef} />
            </div>

            {/* Right: Auto Flow Panel (400px fixed) */}
            <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-lg">
              <AutoFlowPanel
                showToast={showToast}
                onExtractFlow={handleExtractFlow}
                onHighlightElement={handleHighlightElement}
              />
            </div>
          </div>
        )
      case 'results':
        return (
          <div className="flex-1 flex items-center justify-center p-8 text-gray-600">
            <div className="text-center">
              <p className="mb-4 text-lg font-medium">Results</p>
              <p className="text-sm text-gray-500">View test execution results</p>
              <p className="text-xs text-gray-400 mt-2">Coming soon...</p>
            </div>
          </div>
        )
      case 'reports':
        return (
          <div className="flex-1 flex items-center justify-center p-8 text-gray-600">
            <div className="text-center">
              <p className="mb-4 text-lg font-medium">Reports</p>
              <p className="text-sm text-gray-500">Generate and view test reports</p>
              <p className="text-xs text-gray-400 mt-2">Coming soon...</p>
            </div>
          </div>
        )
      case 'settings':
        return (
          <div className="flex-1 flex items-center justify-center p-8 text-gray-600">
            <div className="text-center">
              <p className="mb-4 text-lg font-medium">Settings</p>
              <p className="text-sm text-gray-500">Configure test settings and preferences</p>
              <p className="text-xs text-gray-400 mt-2">Coming soon...</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-screen h-screen bg-white flex flex-col">
      {/* Top Navigation Bar */}
      <div className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-6">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.5"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900">SnapTest</span>
          </div>

          {/* HOME Tab */}
          <button
            onClick={() => navigateTo('dashboard')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            HOME
          </button>

          {/* Open Project Tabs */}
          {openProjectTabs.map((projectId) => {
            const project = projects.find(p => p.id === projectId)
            if (!project) return null

            const isActive = currentProjectId === projectId

            return (
              <div
                key={projectId}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <button
                  onClick={() => setCurrentProject(projectId)}
                  className="text-sm"
                >
                  {project.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeProjectTab(projectId)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} className="text-gray-500 hover:text-gray-700" />
                </button>
              </div>
            )
          })}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">{username}</span>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-semibold">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <button
            onClick={logout}
            className="ml-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeTab={sidebarTab} onTabChange={setSidebarTab} />

        {/* Main Content */}
        {renderMainContent()}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  )
}

export default ProjectView
