import { useState, useRef, useCallback, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, StopCircle, Circle } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useStepStore } from '../store/stepStore'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import { useSettingsStore } from '../store/settingsStore'
import { useRecordingStore } from '../store/recordingStore'
import { useAppConfigStore } from '../store/appConfigStore'
import WebView from '../components/WebView'
import MobileWebView from '../components/MobileWebView'
import StepPanel from '../components/StepPanel'
import { FeatureList } from '../components/FeatureList'
import { FeatureCreationDialog } from '../components/FeatureCreationDialog'
import AutoFlowPanel from '../components/AutoFlowPanel'
import AIExplorationPanel from '../components/AIExplorationPanel'
import DeviceCapabilitiesPanel from '../components/DeviceCapabilitiesPanel'
import Toast, { ToastType } from '../components/Toast'
import Sidebar from '../components/Sidebar'
import { ModeToggle } from '../components/ModeToggle'
import { MobileDeviceSelector } from '../components/MobileDeviceSelector'
import { DeviceConnectionDialog } from '../components/DeviceConnectionDialog'
import { ApiKeysSettings } from '../components/ApiKeysSettings'
import { FlowExtractor, MobileFlowExtractor } from '../utils/flowExtractor'
import { cdpConnectionManager } from '../utils/cdpConnection'
import { webkitConnectionManager } from '../utils/webkitConnection'
import { convertRecordingToDescription, type RecordedEvent } from '../utils/recordingToDescription'
import { replaceXPathWithIdentifiers } from '../utils/recordingConverter'

interface ToastState {
  message: string
  type: ToastType
  show: boolean
}

function ProjectView() {
  const { projects, currentProjectId, openProjectTabs, setCurrentProject, closeProjectTab, navigateTo, username, logout, updateProject } = useProjectStore()
  const { currentMode, getCurrentDevice } = useMobileDeviceStore()
  const { advancedMode, setAdvancedMode } = useSettingsStore()
  const recordingStore = useRecordingStore()
  const { setTargetApp } = useAppConfigStore()
  const [sidebarTab, setSidebarTab] = useState<string>('flow')
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', show: false })
  const [showDeviceDialog, setShowDeviceDialog] = useState(false)
  const [showCapabilities, setShowCapabilities] = useState(false)
  const [showApiKeysDialog, setShowApiKeysDialog] = useState(false)
  const [showFeatureDialog, setShowFeatureDialog] = useState(false)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const webviewRef = useRef<any>(null)
  const mobileWebviewRef = useRef<any>(null)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingPlatform, setRecordingPlatform] = useState<'web' | 'mobile'>('web')
  const [recordedEvents, setRecordedEvents] = useState<RecordedEvent[]>([])
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingCallback, setRecordingCallback] = useState<((description: string) => void) | null>(null)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)

  // SDK connection state
  const [sdkConnected, setSdkConnected] = useState(false)
  const [sdkDevice, setSdkDevice] = useState<any>(null)

  const currentProject = projects.find(p => p.id === currentProjectId)
  const currentDevice = getCurrentDevice()

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
    if (currentMode === 'mobile') {
      // Extract from mobile device
      if (!currentDevice) {
        throw new Error('No mobile device connected')
      }

      const connectionManager = currentDevice.os === 'android' ? cdpConnectionManager : webkitConnectionManager
      const extractor = new MobileFlowExtractor(currentDevice.id, connectionManager)
      const elements = await extractor.extractInteractableElements()
      console.log('Extracted mobile elements:', elements)
      return elements
    } else {
      // Extract from web
      const webview = webviewRef.current
      if (!webview) {
        throw new Error('Webview not available')
      }

      const extractor = new FlowExtractor(webview)
      const elements = await extractor.extractInteractableElements()
      console.log('Extracted elements:', elements)
      return elements
    }
  }

  const handleHighlightElement = async (selector: string, highlight: boolean) => {
    if (currentMode === 'mobile') {
      // Highlight on mobile device
      if (!currentDevice) {
        throw new Error('No mobile device connected')
      }

      const connectionManager = currentDevice.os === 'android' ? cdpConnectionManager : webkitConnectionManager
      const extractor = new MobileFlowExtractor(currentDevice.id, connectionManager)
      await extractor.highlightElement(selector, highlight)
    } else {
      // Highlight on web
      const webview = webviewRef.current
      if (!webview) {
        throw new Error('Webview not available')
      }

      const extractor = new FlowExtractor(webview)
      await extractor.highlightElement(selector, highlight)
    }
  }

  const handleConnectDevice = () => {
    setShowDeviceDialog(true)
  }

  const handleCapabilityChange = (capability: string, value: any) => {
    console.log(`📱 [ProjectView] Capability changed: ${capability} =`, value)
    showToast(`Device ${capability} updated`, 'success')
  }

  // Recording handlers
  const handleStartRecording = async (platform: 'web' | 'mobile', onComplete: (events: RecordedEvent[]) => void) => {
    // Hide the feature dialog while recording
    setShowFeatureDialog(false)

    setIsRecording(true)
    setRecordingPlatform(platform)
    setRecordedEvents([])
    setRecordingDuration(0)
    setRecordingCallback(() => onComplete)

    // Start recording in the recording store (for SDK events)
    if (platform === 'mobile') {
      const deviceName = currentDevice?.name || sdkDevice?.deviceName || 'Mobile Device'
      const deviceId = currentDevice?.id || sdkDevice?.bundleId || 'unknown'

      recordingStore.startRecording(deviceId, deviceName, 'ios')
      console.log('🎬 [ProjectView] Started recording store for mobile')

      // Send startRecording command to SDK if connected
      if (sdkConnected && sdkDevice) {
        console.log('📤 [ProjectView] Sending startRecording command to SDK:', sdkDevice.bundleId)
        try {
          const result = await window.electronAPI.sendSDKCommand(sdkDevice.bundleId, 'startRecording')
          if (result.success) {
            console.log('✅ [ProjectView] SDK startRecording command sent successfully')
          } else {
            console.warn('⚠️ [ProjectView] Failed to send SDK command:', result.error)
          }
        } catch (error) {
          console.error('❌ [ProjectView] Error sending SDK command:', error)
        }
      }
    }

    // Start duration timer
    const interval = setInterval(() => {
      setRecordingDuration(prev => prev + 1)
    }, 1000)

    // Store interval ID for cleanup
    ;(window as any).__recordingInterval = interval
  }

  const handleStopRecording = async () => {
    // Stop timer
    if ((window as any).__recordingInterval) {
      clearInterval((window as any).__recordingInterval)
      delete (window as any).__recordingInterval
    }

    setIsRecording(false)

    // Send stopRecording command to SDK if connected
    if (recordingPlatform === 'mobile' && sdkConnected && sdkDevice) {
      console.log('📤 [ProjectView] Sending stopRecording command to SDK:', sdkDevice.bundleId)
      try {
        const result = await window.electronAPI.sendSDKCommand(sdkDevice.bundleId, 'stopRecording')
        if (result.success) {
          console.log('✅ [ProjectView] SDK stopRecording command sent successfully')
        } else {
          console.warn('⚠️ [ProjectView] Failed to send SDK command:', result.error)
        }
      } catch (error) {
        console.error('❌ [ProjectView] Error sending SDK command:', error)
      }
    }

    // Stop recording in the recording store and get captured SDK events
    if (recordingPlatform === 'mobile') {
      const session = recordingStore.stopRecording()
      console.log('🎬 [ProjectView] Stopped recording store, captured events:', session?.events.length)

      // Merge SDK events with recorded events from old system
      if (session && session.events.length > 0) {
        // OPTIMIZATION: Replace XPath selectors with accessibilityIds from subsequent events
        // This fixes the timing issue where text fields aren't scanned yet when first tapped
        const optimizedEvents = replaceXPathWithIdentifiers(session.events)

        // Convert SDK events to old RecordedEvent format
        const sdkEvents: RecordedEvent[] = optimizedEvents.map(event => ({
          type: event.gestureType === 'tap' ? 'tap' :
                event.gestureType === 'swipe' ? 'swipe' :
                event.gestureType === 'type' ? 'type' :
                event.gestureType === 'scroll' ? 'scroll' :
                event.gestureType === 'longPress' ? 'tap' : 'tap',
          // Prefer accessibilityId (stable) over xpath (brittle SwiftUI internals)
          selector: event.element?.accessibilityId || event.element?.xpath || `coordinates:${event.coordinates.x},${event.coordinates.y}`,
          value: event.value || '',
          timestamp: event.timestamp,
          elementText: event.element?.text || ''
        }))

        console.log('📹 [STOP RECORDING] Converted SDK events:', sdkEvents.length, sdkEvents)

        // Use SDK events instead of old recorded events
        setRecordedEvents(sdkEvents)

        // Call callback with SDK events
        if (recordingCallback) {
          console.log('📹 [STOP RECORDING] Calling callback with SDK events')
          recordingCallback(sdkEvents)
        }

        showToast(`Recording completed! Captured ${sdkEvents.length} events`, 'success')
      } else {
        console.log('📹 [STOP RECORDING] No SDK events, using old events:', recordedEvents.length, recordedEvents)

        // Fall back to old recording system
        if (recordingCallback) {
          console.log('📹 [STOP RECORDING] Calling callback with old events')
          recordingCallback(recordedEvents)
        } else {
          console.warn('📹 [STOP RECORDING] No callback found!')
        }

        showToast('Recording completed!', 'success')
      }
    } else {
      // Web recording - use old system
      console.log('📹 [STOP RECORDING] Web recording, captured events:', recordedEvents.length, recordedEvents)

      if (recordingCallback) {
        console.log('📹 [STOP RECORDING] Calling callback with events')
        recordingCallback(recordedEvents)
      } else {
        console.warn('📹 [STOP RECORDING] No callback found!')
      }

      showToast('Recording completed!', 'success')
    }

    // Reset recording state
    setRecordedEvents([])
    setRecordingDuration(0)
    setRecordingCallback(null)

    // Re-open the feature dialog
    setShowFeatureDialog(true)
  }

  const handleCancelRecording = () => {
    // Stop timer
    if ((window as any).__recordingInterval) {
      clearInterval((window as any).__recordingInterval)
      delete (window as any).__recordingInterval
    }

    // Reset recording state
    setIsRecording(false)
    setRecordedEvents([])
    setRecordingDuration(0)
    setRecordingCallback(null)

    // Re-open the feature dialog (without filling in description)
    setShowFeatureDialog(true)
  }

  const handleRecordEvent = useCallback((event: RecordedEvent) => {
    console.log('📹 [RECORDING] Event captured:', event)
    setRecordedEvents(prev => [...prev, event])
  }, [])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Set up SDK event listeners on mount
  useEffect(() => {
    console.log('📱 [ProjectView] Setting up SDK event listeners')

    // Listen for SDK connections
    window.electronAPI.onSDKConnected((device) => {
      console.log('📱 [SDK] Device connected:', device)
      setSdkConnected(true)
      setSdkDevice(device)
      showToast(`iOS SDK connected: ${device.deviceName}`, 'success')
    })

    // Listen for SDK disconnections
    window.electronAPI.onSDKDisconnected((device) => {
      console.log('📱 [SDK] Device disconnected:', device)
      setSdkConnected(false)
      setSdkDevice(null)
      showToast('iOS SDK disconnected', 'info')
    })

    // Cleanup listeners on unmount
    return () => {
      console.log('📱 [ProjectView] Cleaning up SDK event listeners')
      window.electronAPI.removeSDKListeners()
    }
  }, []) // Empty deps - only run on mount/unmount

  // Sync project's mobile app bundle ID with appConfigStore
  useEffect(() => {
    if (currentProject && currentMode === 'mobile') {
      const device = getCurrentDevice()

      // Determine which bundle ID to use based on device OS
      let bundleId: string | null = null
      let appName: string | null = null

      if (device?.os === 'ios' && currentProject.mobileApps?.ios?.bundleId) {
        bundleId = currentProject.mobileApps.ios.bundleId
        appName = currentProject.mobileApps.ios.appName
      } else if (device?.os === 'android' && currentProject.mobileApps?.android?.packageName) {
        bundleId = currentProject.mobileApps.android.packageName
        appName = currentProject.mobileApps.android.appName
      }

      if (bundleId) {
        console.log(`📱 [ProjectView] Syncing bundle ID from project: ${bundleId}`)
        setTargetApp(bundleId, appName)
      }
    }
  }, [currentProject, currentMode, getCurrentDevice, setTargetApp])

  const renderMainContent = () => {
    switch (sidebarTab) {
      case 'flow':
        return (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Website/Mobile Preview */}
            <div className="flex-1 bg-gray-100 flex items-center justify-center">
              {!currentProject.webUrl && !currentProject.url ? (
                <div className="text-center p-8">
                  <p className="text-gray-500 text-lg mb-2">No web URL configured for this project</p>
                  <p className="text-gray-400 text-sm">Please configure a web URL in project settings</p>
                </div>
              ) : currentMode === 'mobile' && currentDevice ? (
                <MobileWebView
                  url={currentProject.webUrl || currentProject.url || ''}
                  device={currentDevice}
                  ref={mobileWebviewRef}
                  recordingMode={isRecording && recordingPlatform === 'mobile'}
                  onRecordEvent={handleRecordEvent}
                  onPageLoad={() => showToast('Mobile page loaded', 'success')}
                  onError={(error) => showToast(`Mobile error: ${error.message}`, 'error')}
                />
              ) : (
                <WebView
                  url={currentProject.webUrl || currentProject.url || ''}
                  ref={webviewRef}
                  recordingMode={isRecording && recordingPlatform === 'web'}
                  onRecordEvent={handleRecordEvent}
                />
              )}
            </div>

            {/* Recording Overlay */}
            {(isRecording || isGeneratingDescription) && (
              <div className="absolute inset-0 pointer-events-none z-50">
                {/* Recording/Generating Header Bar */}
                <div className={`${isGeneratingDescription ? 'bg-blue-600' : 'bg-red-600'} text-white px-6 py-4 flex items-center justify-between pointer-events-auto`}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Circle size={12} className={`fill-current ${isGeneratingDescription ? 'animate-spin' : 'animate-pulse'}`} />
                      <span className="font-semibold">
                        {isGeneratingDescription ? 'GENERATING DESCRIPTION' : 'RECORDING'}
                      </span>
                    </div>
                    {!isGeneratingDescription && (
                      <>
                        <span className="text-sm">
                          {recordingPlatform === 'web' ? '🌐 Web' : '📱 Mobile'} Platform
                        </span>
                        <span className="text-sm font-mono">
                          {formatDuration(recordingDuration)}
                        </span>
                      </>
                    )}
                    <span className="text-sm text-red-100">
                      {recordedEvents.length} events captured
                    </span>
                  </div>

                  {!isGeneratingDescription && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleStopRecording}
                        className="flex items-center gap-2 px-6 py-2 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                      >
                        <StopCircle size={20} />
                        Stop Recording
                      </button>
                      <button
                        onClick={handleCancelRecording}
                        className="text-white hover:text-gray-200 transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Recording Instructions Footer */}
                {!isGeneratingDescription && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 text-white px-6 py-3 text-sm pointer-events-auto">
                    <p>
                      <span className="font-semibold">Instructions:</span> Interact with the {recordingPlatform} application naturally.
                      Click elements, fill forms, navigate pages. When done, click "Stop Recording" to generate test steps.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Right: Feature Panel (400px fixed) */}
            <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-lg">
              <FeatureList
                projectId={currentProjectId!}
                onCreateFeature={() => setShowFeatureDialog(true)}
                onSelectFeature={setSelectedFeatureId}
                selectedFeatureId={selectedFeatureId}
                webviewRef={webviewRef}
              />
            </div>
          </div>
        )
      case 'autoflow':
        return (
          <div className="flex-1 flex overflow-hidden">
            {/* Website/Mobile Preview */}
            <div className="flex-1 bg-gray-100">
              {currentMode === 'mobile' && currentDevice ? (
                <MobileWebView
                  url={currentProject.webUrl || currentProject.url || ''}
                  device={currentDevice}
                  ref={mobileWebviewRef}
                  onPageLoad={() => showToast('Mobile page loaded', 'success')}
                  onError={(error) => showToast(`Mobile error: ${error.message}`, 'error')}
                />
              ) : (
                <WebView url={currentProject.webUrl || currentProject.url || ''} ref={webviewRef} />
              )}
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
      case 'aiexplore':
        return (
          <div className="flex-1 flex overflow-hidden">
            {/* Website/Mobile Preview */}
            <div className="flex-1 bg-gray-100">
              {currentMode === 'mobile' && currentDevice ? (
                <MobileWebView
                  url={currentProject.webUrl || currentProject.url || ''}
                  device={currentDevice}
                  ref={mobileWebviewRef}
                  onPageLoad={() => showToast('Mobile page loaded', 'success')}
                  onError={(error) => showToast(`Mobile error: ${error.message}`, 'error')}
                />
              ) : (
                <WebView url={currentProject.webUrl || currentProject.url || ''} ref={webviewRef} />
              )}
            </div>

            {/* Right: AI Exploration Panel (400px fixed) */}
            <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-lg">
              <AIExplorationPanel
                showToast={showToast}
                webviewRef={currentMode === 'mobile' ? mobileWebviewRef : webviewRef}
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
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
                <p className="text-gray-600">Configure your application settings</p>
              </div>

              {/* API Keys Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">API Keys</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage your API keys for Anthropic (Claude) and Groq services
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Anthropic:</span>
                        <span className={localStorage.getItem('anthropic_api_key') ? 'text-green-600' : 'text-gray-400'}>
                          {localStorage.getItem('anthropic_api_key') ? '✓ Set' : 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Groq:</span>
                        <span className={localStorage.getItem('groq_api_key') ? 'text-green-600' : 'text-gray-400'}>
                          {localStorage.getItem('groq_api_key') ? '✓ Set' : 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApiKeysDialog(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Configure Keys
                  </button>
                </div>
              </div>

              {/* User Preferences Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">User Preferences</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Customize your application experience
                    </p>

                    {/* Advanced Mode Toggle */}
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="advanced-mode-toggle"
                        checked={advancedMode}
                        onChange={(e) => setAdvancedMode(e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="advanced-mode-toggle"
                          className="block text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          Enable Advanced Mode
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Show advanced features like Auto Flow, AI Explore, and additional settings
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Configuration Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Platform Configuration</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Configure platform URLs for this project
                    </p>

                    <div className="space-y-4">
                      {/* Web URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Web URL
                        </label>
                        <input
                          type="text"
                          value={currentProject?.webUrl || currentProject?.url || ''}
                          onChange={(e) => {
                            if (currentProjectId) {
                              updateProject(currentProjectId, { webUrl: e.target.value })
                            }
                          }}
                          placeholder="e.g., https://example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Default URL for web testing and recording
                        </p>
                      </div>

                      {/* iOS Bundle ID */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          iOS Bundle ID
                        </label>
                        <input
                          type="text"
                          value={currentProject?.mobileApps?.ios?.bundleId || ''}
                          onChange={(e) => {
                            if (currentProjectId) {
                              updateProject(currentProjectId, {
                                mobileApps: {
                                  ...currentProject?.mobileApps,
                                  ios: {
                                    bundleId: e.target.value,
                                    appName: currentProject?.mobileApps?.ios?.appName || ''
                                  }
                                }
                              })
                            }
                          }}
                          placeholder="e.g., com.rinasmusthafa.DigitalBooking"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Bundle ID for iOS app testing
                        </p>
                      </div>

                      {/* Android Package Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Android Package Name
                        </label>
                        <input
                          type="text"
                          value={currentProject?.mobileApps?.android?.packageName || ''}
                          onChange={(e) => {
                            if (currentProjectId) {
                              updateProject(currentProjectId, {
                                mobileApps: {
                                  ...currentProject?.mobileApps,
                                  android: {
                                    packageName: e.target.value,
                                    appName: currentProject?.mobileApps?.android?.appName || ''
                                  }
                                }
                              })
                            }
                          }}
                          placeholder="e.g., com.example.myapp"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Package name for Android app testing
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* More settings cards can be added here */}
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
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="h-16 flex items-center px-6 justify-between">
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

          {/* Mobile Controls & User Info */}
          <div className="flex items-center gap-4">
            {/* Mobile Mode Toggle */}
            <ModeToggle
              className="mr-2"
            />

            {/* Mobile Device Selector */}
            {currentMode === 'mobile' && (
              <>
                <MobileDeviceSelector
                  onConnectDevice={handleConnectDevice}
                  className="mr-2"
                />

                {/* Device Capabilities Toggle */}
                {currentDevice && currentDevice.os === 'android' && (
                  <button
                    onClick={() => setShowCapabilities(!showCapabilities)}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Device Capabilities"
                  >
                    <span>Capabilities</span>
                    {showCapabilities ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </>
            )}

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

        {/* Device Capabilities Panel (Collapsible) */}
        {showCapabilities && currentMode === 'mobile' && currentDevice && currentDevice.os === 'android' && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <DeviceCapabilitiesPanel
              onCapabilityChange={handleCapabilityChange}
            />
          </div>
        )}
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

      {/* Device Connection Dialog */}
      {showDeviceDialog && (
        <DeviceConnectionDialog
          onClose={() => setShowDeviceDialog(false)}
          onSuccess={() => {
            setShowDeviceDialog(false)
            showToast('Device connected successfully!', 'success')
          }}
        />
      )}

      {/* API Keys Settings Dialog */}
      {showApiKeysDialog && (
        <ApiKeysSettings
          onClose={() => {
            setShowApiKeysDialog(false)
            showToast('API keys updated successfully', 'success')
          }}
        />
      )}

      {/* Feature Creation Dialog */}
      <FeatureCreationDialog
        isOpen={showFeatureDialog}
        onClose={() => setShowFeatureDialog(false)}
        onSuccess={(featureId) => {
          setShowFeatureDialog(false)
          setSelectedFeatureId(featureId)
          showToast('Feature created successfully!', 'success')
        }}
        projectId={currentProjectId!}
        onStartRecording={handleStartRecording}
      />
    </div>
  )
}

export default ProjectView
