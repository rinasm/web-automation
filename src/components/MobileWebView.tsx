import { useEffect, useState, useCallback, forwardRef, useImperativeHandle, useRef } from 'react'
import { Loader, Wifi, AlertCircle, Smartphone, RefreshCw, Target, Network } from 'lucide-react'
import { MobileDevice, AndroidDevice, IOSDevice } from '../types/mobileDevice'
import { cdpConnectionManager } from '../utils/cdpConnection'
import { appiumConnectionManager } from '../utils/appiumConnection'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import { useNetworkStore } from '../store/networkStore'
import { useAppConfigStore } from '../store/appConfigStore'
import { startNetworkMonitoring, stopNetworkMonitoring } from '../services/networkListener'
import { MobileFlowExtractor } from '../utils/flowExtractor'
import { getXPathForElement } from '../utils/xpath'
import { mobileEventListenerManager } from '../services/mobileEventListener'
import type { RecordedEvent as NewRecordedEvent } from '../store/recordingStore'
import { screenshotRecorderManager } from '../services/screenshotRecorder'
import { useRecordingStore } from '../store/recordingStore'
import { Action, useStepStore } from '../store/stepStore'
import { mobileActionExecutorManager } from '../utils/mobileActionExecutor'

interface RecordedEvent {
  type: 'click' | 'type' | 'navigate' | 'scroll' | 'tap' | 'swipe'
  selector?: string
  value?: string
  url?: string
  timestamp: number
  elementText?: string
}

interface MobileWebViewProps {
  url?: string
  device?: MobileDevice
  onPageLoad?: () => void
  onError?: (error: Error) => void
  onElementSelected?: (selector: string, elementInfo: any) => void
  recordingMode?: boolean
  onRecordEvent?: (event: RecordedEvent) => void
}

export interface MobileWebViewRef {
  navigate: (url: string) => Promise<void>
  executeJavaScript: (code: string) => Promise<any>
  takeScreenshot: () => Promise<string>
  refresh: () => Promise<void>
  startSelectorCapture: () => void
  stopSelectorCapture: () => void
}

const MobileWebView = forwardRef<MobileWebViewRef, MobileWebViewProps>(
  ({ url, device, onPageLoad, onError, onElementSelected, recordingMode, onRecordEvent }, ref) => {
    const [isLoading, setIsLoading] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentUrl, setCurrentUrl] = useState(url)
    const [screenshot, setScreenshot] = useState<string | null>(null)
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
    const [isCapturingSelector, setIsCapturingSelector] = useState(false)
    const [flowExtractor, setFlowExtractor] = useState<MobileFlowExtractor | null>(null)
    const [isScreenshotRecording, setIsScreenshotRecording] = useState(false)
    const [isMatchingElement, setIsMatchingElement] = useState(false)
    const imageRef = useRef<HTMLImageElement>(null)

    // Performance: Screenshot caching and throttling
    const [screenshotCache, setScreenshotCache] = useState<Map<string, { data: string; timestamp: number }>>(new Map())
    const [lastScreenshotTime, setLastScreenshotTime] = useState(0)
    const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false) // Prevent concurrent requests
    const SCREENSHOT_THROTTLE_MS = 20 // Limit screenshots to once per 20ms (40+ FPS for USB)

    // SDK mode state
    const [sdkConnected, setSdkConnected] = useState(false)
    const [sdkDevice, setSdkDevice] = useState<any>(null)
    const [recordingMode_SDK, setRecordingMode_SDK] = useState('appium') // 'appium' or 'sdk'
    const [isRefreshingSDK, setIsRefreshingSDK] = useState(false)

    const { getDeviceConnection, setDeviceConnection } = useMobileDeviceStore()
    const { targetAppBundleId, targetAppName } = useAppConfigStore()
    const { addSDKEvent } = useRecordingStore()
    const { isPanelVisible, setPanelVisible } = useNetworkStore()

    /**
     * Initialize connection to device
     */
    const initializeConnection = useCallback(async () => {
      console.log('📱 [MobileWebView] Initializing connection to:', device.name)
      setIsConnecting(true)
      setError(null)
      setConnectionStatus('connecting')

      try {
        if (device.os === 'android') {
          // Connect via CDP
          const connection = await cdpConnectionManager.connect(device as AndroidDevice)
          setDeviceConnection(device.id, connection as any)
          setConnectionStatus('connected')
          console.log('📱 [MobileWebView] CDP connection established')

          // Initialize flow extractor
          const extractor = new MobileFlowExtractor(device.id, cdpConnectionManager)
          setFlowExtractor(extractor)
        } else {
          // Connect via Appium (full featured)
          console.log('📱 [MobileWebView] Starting Appium server for iOS...')

          // Start Appium server first
          const serverResult = await (window as any).electronAPI.invoke('mobile:appium-start-server')

          if (!serverResult.success) {
            throw new Error(`Failed to start Appium server: ${serverResult.error}`)
          }

          console.log('📱 [MobileWebView] Appium server started:', serverResult.status)

          // Wait a bit for server to be fully ready
          await new Promise(resolve => setTimeout(resolve, 2000))

          // Now connect to device - pass bundle ID if configured
          if (targetAppBundleId) {
            console.log('📱 [MobileWebView] Launching native app:', targetAppName)
          }
          const connection = await appiumConnectionManager.connect(device as IOSDevice, targetAppBundleId || undefined)
          setDeviceConnection(device.id, connection as any)
          setConnectionStatus('connected')
          console.log('📱 [MobileWebView] Appium connection established')

          // Initialize flow extractor
          const extractor = new MobileFlowExtractor(device.id, appiumConnectionManager)
          setFlowExtractor(extractor)
        }
      } catch (err: any) {
        console.error('📱 [MobileWebView] Connection error:', err)
        setError(err.message)
        setConnectionStatus('disconnected')
        onError?.(err)
      } finally {
        setIsConnecting(false)
      }
    }, [device, setDeviceConnection, onError, targetAppBundleId, targetAppName])

    /**
     * Navigate to URL
     */
    const navigate = useCallback(async (targetUrl: string) => {
      if (connectionStatus !== 'connected') {
        throw new Error('Device not connected')
      }

      console.log('📱 [MobileWebView] Navigating to:', targetUrl)
      setIsLoading(true)
      setError(null)

      try {
        if (device.os === 'android') {
          await cdpConnectionManager.navigate(device.id, targetUrl)
        } else {
          await appiumConnectionManager.navigate(device.id, targetUrl)
        }

        setCurrentUrl(targetUrl)
        await captureScreenshot()
        onPageLoad?.()
      } catch (err: any) {
        console.error('📱 [MobileWebView] Navigation error:', err)
        setError(err.message)
        onError?.(err)
      } finally {
        setIsLoading(false)
      }
    }, [device, connectionStatus, onPageLoad, onError])

    /**
     * Execute JavaScript
     */
    const executeJavaScript = useCallback(async (code: string): Promise<any> => {
      if (connectionStatus !== 'connected') {
        throw new Error('Device not connected')
      }

      if (device.os === 'android') {
        return await cdpConnectionManager.executeJavaScript(device.id, code)
      } else {
        return await appiumConnectionManager.executeJavaScript(device.id, code)
      }
    }, [device, connectionStatus])

    /**
     * Execute test actions (for simulation/playback)
     */
    const executeActions = useCallback(async (actions: Action[]): Promise<void> => {
      if (connectionStatus !== 'connected') {
        throw new Error('Device not connected')
      }

      console.log(`📱 [MobileWebView] Executing ${actions.length} actions on ${device.name}`)

      try {
        // Use manager which routes iOS to SDK execution, Android to Appium
        const results = await mobileActionExecutorManager.executeActions(device, actions)

        // Check for failures
        const failedActions = results.filter(r => !r.success)
        if (failedActions.length > 0) {
          // Log warning but don't throw - allow execution to continue
          console.warn(`⚠️ [MobileWebView] ${failedActions.length}/${actions.length} actions failed, but continuing`)
          failedActions.forEach(fa => {
            console.warn(`⚠️ [MobileWebView] Failed action: ${fa.type} - ${fa.error}`)
          })
        } else {
          console.log(`📱 [MobileWebView] Successfully executed all ${actions.length} actions`)
        }
      } catch (error) {
        // Log error but don't throw - allow simulation to continue
        console.warn('⚠️ [MobileWebView] Action execution error (continuing):', error)
      }
    }, [device, connectionStatus])

    /**
     * Take screenshot
     */
    const takeScreenshot = useCallback(async (): Promise<string> => {
      if (connectionStatus !== 'connected') {
        throw new Error('Device not connected')
      }

      if (device.os === 'android') {
        return await cdpConnectionManager.takeScreenshot(device.id)
      } else {
        return await appiumConnectionManager.takeScreenshot(device.id)
      }
    }, [device, connectionStatus])

    /**
     * Capture and display screenshot (with throttling and caching)
     */
    const captureScreenshot = useCallback(async (forceRefresh = false) => {
      try {
        // Skip if already capturing a screenshot (prevent queue overflow)
        if (isCapturingScreenshot) {
          return
        }

        const now = Date.now()
        const cacheKey = `${device.id}:${currentUrl}`

        // Check cache first (unless forced refresh)
        if (!forceRefresh) {
          const cached = screenshotCache.get(cacheKey)
          if (cached && (now - cached.timestamp) < 50) { // 50ms cache (40 FPS for USB)
            setScreenshot(cached.data)
            return
          }
        }

        // Throttle screenshot requests
        if (!forceRefresh && (now - lastScreenshotTime) < SCREENSHOT_THROTTLE_MS) {
          return
        }

        // Mark as capturing
        setIsCapturingScreenshot(true)

        // Capture new screenshot
        const screenshotData = await takeScreenshot()
        setScreenshot(screenshotData)
        setLastScreenshotTime(now)

        // Update cache
        setScreenshotCache(prev => {
          const newCache = new Map(prev)
          newCache.set(cacheKey, { data: screenshotData, timestamp: now })
          // Limit cache size to 10 entries
          if (newCache.size > 10) {
            const firstKey = newCache.keys().next().value
            newCache.delete(firstKey)
          }
          return newCache
        })
      } catch (err: any) {
        // Silently ignore transient errors (expected during fast polling)
        const ignoredErrors = ['QUEUE_OVERFLOW', 'SESSION_NOT_EXIST']
        if (!ignoredErrors.includes(err.message)) {
          console.error('📱 [MobileWebView] Screenshot error:', err)
        }
      } finally {
        // Always clear the capturing flag
        setIsCapturingScreenshot(false)
      }
    }, [takeScreenshot, device.id, currentUrl, screenshotCache, lastScreenshotTime, SCREENSHOT_THROTTLE_MS, isCapturingScreenshot])

    /**
     * Refresh page
     */
    const refresh = useCallback(async () => {
      await navigate(currentUrl)
    }, [navigate, currentUrl])

    /**
     * Refresh SDK network detection
     * Forces server to re-detect network interfaces and republish Bonjour service
     */
    const refreshSDKNetwork = useCallback(async () => {
      console.log('🔄 [MobileWebView] Refreshing SDK network detection...')
      setIsRefreshingSDK(true)

      try {
        // Request backend to refresh network detection and republish Bonjour service
        const result = await (window as any).electronAPI.refreshSDKNetwork()
        console.log('✅ [MobileWebView] Network refresh requested:', result)

        // Give the SDK device time to reconnect (check every 500ms for up to 5 seconds)
        let retries = 10
        while (retries > 0 && !sdkConnected) {
          await new Promise(resolve => setTimeout(resolve, 500))
          retries--
        }

        if (sdkConnected) {
          console.log('✅ [MobileWebView] SDK device reconnected successfully')
        } else {
          console.warn('⚠️ [MobileWebView] SDK device did not reconnect. Make sure:')
          console.warn('   1. MyTodoApp is running on your iPhone')
          console.warn('   2. iPhone and Mac are on the same WiFi network')
          console.warn('   3. Network permissions are granted')
        }
      } catch (error) {
        console.error('❌ [MobileWebView] Failed to refresh network:', error)
      } finally {
        setIsRefreshingSDK(false)
      }
    }, [sdkConnected])

    /**
     * Toggle network monitoring
     */
    const toggleNetworkMonitoring = useCallback(async () => {
      const newVisibility = !isPanelVisible
      setPanelVisible(newVisibility)

      if (sdkDevice && newVisibility) {
        // Send startNetworkMonitoring command to SDK (same pattern as recording)
        console.log('📤 [MobileWebView] Sending startNetworkMonitoring command to SDK:', sdkDevice.bundleId)
        try {
          const result = await window.electronAPI.sendSDKCommand(sdkDevice.bundleId, 'startNetworkMonitoring')
          if (result.success) {
            console.log('✅ [MobileWebView] Network monitoring started successfully')
          } else {
            console.warn('⚠️ [MobileWebView] Failed to start network monitoring:', result.error)
          }
        } catch (error) {
          console.error('❌ [MobileWebView] Error starting network monitoring:', error)
        }
      } else if (sdkDevice && !newVisibility) {
        // Send stopNetworkMonitoring command to SDK
        console.log('📤 [MobileWebView] Sending stopNetworkMonitoring command to SDK:', sdkDevice.bundleId)
        try {
          const result = await window.electronAPI.sendSDKCommand(sdkDevice.bundleId, 'stopNetworkMonitoring')
          if (result.success) {
            console.log('✅ [MobileWebView] Network monitoring stopped successfully')
          } else {
            console.warn('⚠️ [MobileWebView] Failed to stop network monitoring:', result.error)
          }
        } catch (error) {
          console.error('❌ [MobileWebView] Error stopping network monitoring:', error)
        }
      }
    }, [isPanelVisible, setPanelVisible, sdkDevice])

    /**
     * Start selector capture mode
     */
    const startSelectorCapture = useCallback(() => {
      if (connectionStatus !== 'connected') {
        console.warn('📱 [MobileWebView] Cannot start selector capture: not connected')
        return
      }

      console.log('📱 [MobileWebView] Starting selector capture mode')
      setIsCapturingSelector(true)

      // Inject click listener via CDP/WebKit
      const script = `
        (function() {
          // Remove any existing listener
          if (window.__mobileViewClickHandler) {
            document.removeEventListener('click', window.__mobileViewClickHandler, true);
          }

          // Create highlight style
          const style = document.createElement('style');
          style.id = '__mobile_selector_capture_style__';
          style.textContent = \`
            .__mobile_selector_capture_hover__ {
              outline: 4px solid #10B981 !important;
              outline-offset: 2px !important;
              background-color: rgba(16, 185, 129, 0.1) !important;
              cursor: crosshair !important;
            }
          \`;
          document.head.appendChild(style);

          // Add mouseover/touchstart highlight
          let currentHighlight = null;

          const highlightHandler = (e) => {
            if (currentHighlight) {
              currentHighlight.classList.remove('__mobile_selector_capture_hover__');
            }
            if (e.target && e.target !== document.body && e.target !== document.documentElement) {
              e.target.classList.add('__mobile_selector_capture_hover__');
              currentHighlight = e.target;
            }
          };

          document.addEventListener('mouseover', highlightHandler, true);
          document.addEventListener('touchstart', highlightHandler, true);

          // Store for cleanup
          window.__mobileViewHighlightHandler = highlightHandler;

          // Add click handler
          const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const getXPath = ${getXPathForElement.toString()};
            const selector = getXPath(e.target);
            const rect = e.target.getBoundingClientRect();

            // Send selector back
            window.__capturedSelector = {
              selector,
              text: e.target.textContent?.trim().substring(0, 100) || e.target.tagName,
              tagName: e.target.tagName,
              position: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
            };

            return false;
          };

          document.addEventListener('click', clickHandler, true);
          window.__mobileViewClickHandler = clickHandler;

          console.log('[Mobile Selector Capture] Enabled');
        })();
      `

      if (device.os === 'android') {
        cdpConnectionManager.executeJavaScript(device.id, script).catch(console.error)
      } else {
        appiumConnectionManager.executeJavaScript(device.id, script).catch(console.error)
      }
    }, [device, connectionStatus])

    /**
     * Stop selector capture mode
     */
    const stopSelectorCapture = useCallback(() => {
      if (!isCapturingSelector) {
        return
      }

      console.log('📱 [MobileWebView] Stopping selector capture mode')
      setIsCapturingSelector(false)

      // Remove listeners
      const script = `
        (function() {
          if (window.__mobileViewClickHandler) {
            document.removeEventListener('click', window.__mobileViewClickHandler, true);
            delete window.__mobileViewClickHandler;
          }

          if (window.__mobileViewHighlightHandler) {
            document.removeEventListener('mouseover', window.__mobileViewHighlightHandler, true);
            document.removeEventListener('touchstart', window.__mobileViewHighlightHandler, true);
            delete window.__mobileViewHighlightHandler;
          }

          // Remove highlight style
          const style = document.getElementById('__mobile_selector_capture_style__');
          if (style) {
            style.remove();
          }

          // Remove any highlights
          document.querySelectorAll('.__mobile_selector_capture_hover__').forEach(el => {
            el.classList.remove('__mobile_selector_capture_hover__');
          });

          console.log('[Mobile Selector Capture] Disabled');
        })();
      `

      if (device.os === 'android') {
        cdpConnectionManager.executeJavaScript(device.id, script).catch(console.error)
      } else {
        appiumConnectionManager.executeJavaScript(device.id, script).catch(console.error)
      }
    }, [device, isCapturingSelector])

    /**
     * Check for captured selector periodically
     */
    useEffect(() => {
      if (!isCapturingSelector || connectionStatus !== 'connected') {
        return
      }

      const checkInterval = setInterval(async () => {
        try {
          const script = `
            (function() {
              const captured = window.__capturedSelector;
              if (captured) {
                delete window.__capturedSelector;
                return captured;
              }
              return null;
            })();
          `

          let result
          if (device.os === 'android') {
            result = await cdpConnectionManager.executeJavaScript(device.id, script)
          } else {
            result = await appiumConnectionManager.executeJavaScript(device.id, script)
          }

          if (result) {
            console.log('📱 [MobileWebView] Element selected:', result)
            stopSelectorCapture()
            onElementSelected?.(result.selector, result)
          }
        } catch (error) {
          console.error('📱 [MobileWebView] Error checking captured selector:', error)
        }
      }, 200)

      return () => clearInterval(checkInterval)
    }, [isCapturingSelector, connectionStatus, device, stopSelectorCapture, onElementSelected])

    /**
     * Set up SDK WebSocket event listeners
     */
    useEffect(() => {
      console.log('📱 [MobileWebView] Setting up SDK event listeners')

      // Listen for SDK connections
      window.electronAPI.onSDKConnected((device) => {
        console.log('📱 [SDK] Device connected:', device)
        setSdkConnected(true)
        setSdkDevice(device)
      })

      // Listen for SDK disconnections
      window.electronAPI.onSDKDisconnected((device) => {
        console.log('📱 [SDK] Device disconnected:', device)
        setSdkConnected(false)
        setSdkDevice(null)
      })

      // Listen for SDK events
      window.electronAPI.onSDKEvent(async (data) => {
        console.log('📱 [SDK] Event received:', data.event)

        // Forward SDK events to recording store if recording
        if (recordingMode) {
          let enrichedEvent = { ...data.event }

          // DEBUG: Log element object structure
          console.log('🔍 [DEBUG] Element object:', enrichedEvent.element)
          console.log('🔍 [DEBUG] Element keys:', enrichedEvent.element ? Object.keys(enrichedEvent.element) : 'null')
          console.log('🔍 [DEBUG] viewHierarchyDebugDescription exists?', !!enrichedEvent.element?.viewHierarchyDebugDescription)
          console.log('🔍 [DEBUG] viewHierarchyDebugDescription length:', enrichedEvent.element?.viewHierarchyDebugDescription?.length)

          // INSTANT ELEMENT LOOKUP using iOS debugDescription API (NO WDA!)
          if (enrichedEvent.element?.viewHierarchyDebugDescription && enrichedEvent.coordinates) {
            const { x, y } = enrichedEvent.coordinates
            const debugDesc = enrichedEvent.element.viewHierarchyDebugDescription

            console.log(`🚀 [iOS Parser] Using debugDescription for instant lookup (${debugDesc.length} chars)`)

            try {
              const result = await window.electronAPI.invoke('mobile:parse-debug-description', {
                debugDescription: debugDesc,
                x,
                y
              })

              if (result.success && result.accessibilityId) {
                console.log(`✅ [iOS Parser] Found accessibility ID: ${result.accessibilityId} in ${result.elapsed}ms`)

                enrichedEvent.element.accessibilityIdentifier = result.accessibilityId
                enrichedEvent.element.iosDebugEnriched = true
              } else {
                console.log(`⚠️  [iOS Parser] No accessibility ID found at (${x}, ${y})`)
              }
            } catch (error: any) {
              console.error('❌ [iOS Parser] Error:', error.message)
            }
          } else if (enrichedEvent.coordinates) {
            // FALLBACK: iOS debugDescription not available, use WDA
            console.log('⚠️  [Fallback] iOS debugDescription not available, falling back to WDA')

            const connection = appiumConnectionManager.getConnection(device.id)
            if (connection?.session) {
              const sessionId = connection.session.sessionId
              const { x, y } = enrichedEvent.coordinates

              try {
                const result = await window.electronAPI.invoke('mobile:wda-find-element-at-coordinates', {
                  sessionId,
                  x,
                  y
                })

                if (result.success && result.elementInfo?.accessibilityId) {
                  console.log(`✅ [WDA Fallback] Found accessibility ID: ${result.elementInfo.accessibilityId}`)

                  if (!enrichedEvent.element) {
                    enrichedEvent.element = {}
                  }
                  enrichedEvent.element.accessibilityIdentifier = result.elementInfo.accessibilityId
                  enrichedEvent.element.wdaEnriched = true
                }
              } catch (error: any) {
                console.error('❌ [WDA Fallback] Error:', error.message)
              }
            }
          }

          addSDKEvent(enrichedEvent)
        }
      })

      // Cleanup listeners on unmount
      return () => {
        window.electronAPI.removeSDKListeners()
      }
    }, [recordingMode, addSDKEvent])

    /**
     * Expose methods via ref
     */
    useImperativeHandle(ref, () => ({
      navigate,
      executeJavaScript,
      takeScreenshot,
      refresh,
      startSelectorCapture,
      stopSelectorCapture
    }))

    /**
     * Set up execute callback for simulation service
     */
    useEffect(() => {
      const { setExecuteStepCallback } = useStepStore.getState()

      // Register our executeActions method as the callback
      setExecuteStepCallback(executeActions)

      console.log('📱 [MobileWebView] Registered executeActions callback for simulation')

      // Cleanup: remove callback when component unmounts
      return () => {
        setExecuteStepCallback(null)
        console.log('📱 [MobileWebView] Removed executeActions callback')
      }
    }, [executeActions])

    /**
     * Initialize connection on mount
     */
    useEffect(() => {
      initializeConnection()

      return () => {
        // Cleanup: disconnect on unmount
        if (device.os === 'android') {
          cdpConnectionManager.disconnect(device.id).catch(() => {})
        } else {
          appiumConnectionManager.disconnect(device.id).catch(() => {})
        }
      }
    }, [device.id])

    /**
     * Navigate to initial URL when connected
     */
    useEffect(() => {
      if (connectionStatus === 'connected' && url !== currentUrl) {
        navigate(url)
      }
    }, [connectionStatus, url])

    /**
     * Auto-refresh screenshot (ultra high-speed polling for USB connections)
     * Pauses when matching elements to avoid conflicts
     */
    useEffect(() => {
      if (connectionStatus === 'connected' && !isLoading && !isMatchingElement) {
        const interval = setInterval(() => {
          captureScreenshot()
        }, 25) // 25ms polling = 40 FPS (ultra-smooth real-time mirroring for USB)

        return () => clearInterval(interval)
      }
    }, [connectionStatus, isLoading, isMatchingElement, captureScreenshot])

    /**
     * Handle recording mode - start/stop event listener
     * NOTE: Old approach - SDK approach is preferred when available
     */
    useEffect(() => {
      // Skip if SDK is connected (prefer SDK over old approach)
      if (sdkConnected) {
        console.log('🎬 [MobileWebView] Skipping old recording - SDK is active')
        return
      }

      if (!device || connectionStatus !== 'connected' || !recordingMode) {
        return
      }

      console.log('🎬 [MobileWebView] Starting OLD recording mode for device (no SDK):', device.name)

      let listenerActive = false

      // Start recording
      const startRecordingListener = async () => {
        try {
          // Create event listener with callback
          const listener = mobileEventListenerManager.createListener(
            device,
            (event: NewRecordedEvent) => {
              console.log('🎬 [MobileWebView] Event captured:', event.gestureType, event.coordinates)

              // Convert new event format to old format expected by ProjectView
              const convertedEvent: RecordedEvent = {
                type: event.gestureType === 'tap' ? 'tap' :
                      event.gestureType === 'swipe' ? 'swipe' :
                      event.gestureType === 'type' ? 'type' :
                      event.gestureType === 'scroll' ? 'scroll' :
                      event.gestureType === 'longPress' ? 'tap' : 'tap',
                selector: event.element?.xpath || `coordinates:${event.coordinates.x},${event.coordinates.y}`,
                value: event.value || '',
                timestamp: event.timestamp,
                elementText: event.element?.text || ''
              }

              // Pass to callback
              if (onRecordEvent) {
                onRecordEvent(convertedEvent)
              }
            },
            {
              captureScreenshots: false,
              throttleDelay: 100,
              includeSystemEvents: false
            }
          )

          // Start listening (pass same callback)
          await listener.start((event: NewRecordedEvent) => {
            const convertedEvent: RecordedEvent = {
              type: event.gestureType === 'tap' ? 'tap' :
                    event.gestureType === 'swipe' ? 'swipe' :
                    event.gestureType === 'type' ? 'type' :
                    event.gestureType === 'scroll' ? 'scroll' :
                    event.gestureType === 'longPress' ? 'tap' : 'tap',
              selector: event.element?.xpath || `coordinates:${event.coordinates.x},${event.coordinates.y}`,
              value: event.value || '',
              timestamp: event.timestamp,
              elementText: event.element?.text || ''
            }

            if (onRecordEvent) {
              onRecordEvent(convertedEvent)
            }
          })

          listenerActive = true
          console.log('🎬 [MobileWebView] Recording listener started successfully')
        } catch (err) {
          console.error('🎬 [MobileWebView] Failed to start recording listener:', err)
          if (onError) {
            onError(err as Error)
          }
        }
      }

      startRecordingListener()

      // Cleanup: stop recording when component unmounts or recording mode changes
      return () => {
        if (listenerActive && device) {
          console.log('🎬 [MobileWebView] Stopping recording listener on cleanup')
          mobileEventListenerManager.removeListener(device.id).catch(console.error)
        }
      }
    }, [device, connectionStatus, recordingMode])  // Removed onRecordEvent and onError from deps to prevent loop

    /**
     * Handle click on screenshot for live recording
     */
    const handleScreenshotClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imageRef.current || !recordingMode || !device) return

      // Get click coordinates relative to image
      const rect = imageRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Convert click position to device LOGICAL coordinates
      // iOS screenshots are at a different scale than logical resolution
      // Page source uses logical resolution, so we need to convert screenshot coords -> logical coords
      const logicalScaleX = device.capabilities.screenWidth / rect.width
      const logicalScaleY = device.capabilities.screenHeight / rect.height
      const deviceX = Math.round(x * logicalScaleX)
      const deviceY = Math.round(y * logicalScaleY)

      console.log(`📱 [MobileWebView] Click at logical coordinates (${deviceX}, ${deviceY})`)
      console.log(`📱 [MobileWebView] Device logical resolution: ${device.capabilities.screenWidth}x${device.capabilities.screenHeight}`)
      console.log(`📱 [MobileWebView] Image display size: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`)
      console.log(`📱 [MobileWebView] Screenshot pixel size: ${imageRef.current.naturalWidth}x${imageRef.current.naturalHeight}`)
      console.log(`📱 [MobileWebView] Using logical scale: ${logicalScaleX.toFixed(2)}x, ${logicalScaleY.toFixed(2)}y`)

      try {
        setIsMatchingElement(true)

        // Get or create screenshot recorder
        const recorder = screenshotRecorderManager.getRecorder(device.id) ||
          screenshotRecorderManager.createRecorder(device, (event) => {
            console.log('📸 [MobileWebView] Event recorded:', event)
            // Convert to legacy format
            if (onRecordEvent) {
              const legacyEvent: RecordedEvent = {
                type: event.gestureType as any,
                selector: event.element?.xpath || event.element?.accessibilityId || '',
                value: event.value,
                timestamp: event.timestamp,
                elementText: event.element?.text
              }
              onRecordEvent(legacyEvent)
            }
          })

        // Ensure recorder is started
        if (!recorder.isActive()) {
          await recorder.start()
        }

        // Match click to element on-demand
        await recorder.matchClickToElement(deviceX, deviceY, 'tap')

      } catch (error: any) {
        console.error('📱 [MobileWebView] Error matching element:', error)
        // Show error to user (you can add a toast notification here)
        alert(`Failed to find element: ${error.message}`)
      } finally {
        setIsMatchingElement(false)
      }
    }, [recordingMode, device, onRecordEvent])

    return (
      <div className="w-full h-full bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-gray-700">
          <Smartphone size={18} className="text-blue-400" />
          <div className="flex-1">
            <div className="text-sm font-medium text-white">{device.name}</div>
            <div className="text-xs text-gray-400">
              {device.os === 'android' ? 'Android' : 'iOS'} {device.osVersion}
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connectionStatus === 'connecting' && (
              <>
                <Loader size={14} className="text-yellow-400 animate-spin" />
                <span className="text-xs text-yellow-400">Connecting...</span>
              </>
            )}
            {connectionStatus === 'connected' && (
              <>
                <Wifi size={14} className="text-green-400" />
                <span className="text-xs text-green-400">Connected</span>
              </>
            )}
            {connectionStatus === 'disconnected' && (
              <>
                <AlertCircle size={14} className="text-red-400" />
                <span className="text-xs text-red-400">Disconnected</span>
              </>
            )}
          </div>

          {/* SDK Connection Status */}
          {device?.os === 'ios' && (
            <>
              {sdkConnected && sdkDevice ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-600 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-xs text-white font-medium">SDK Connected</span>
                    <div className="text-xs text-purple-200">{sdkDevice.deviceName || 'iOS Device'}</div>
                  </div>

                  {/* Track Network Toggle */}
                  <button
                    onClick={toggleNetworkMonitoring}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full font-medium transition-colors ${
                      isPanelVisible
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                    title="Toggle network monitoring panel"
                  >
                    <Network size={14} />
                    <span className="text-xs">Track Network</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={refreshSDKNetwork}
                  disabled={isRefreshingSDK}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
                    isRefreshingSDK
                      ? 'bg-yellow-600 cursor-wait'
                      : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                  }`}
                  title={isRefreshingSDK ? 'Refreshing network detection...' : 'Click to refresh network detection'}
                >
                  <div className={`w-2 h-2 bg-white rounded-full ${isRefreshingSDK ? 'animate-pulse' : ''}`}></div>
                  <span className="text-xs text-white font-medium">
                    {isRefreshingSDK ? 'Refreshing...' : 'SDK Not Connected'}
                  </span>
                  <div className="text-xs text-white opacity-75">
                    {isRefreshingSDK ? 'please wait' : 'click to refresh'}
                  </div>
                </button>
              )}
            </>
          )}

          {/* Selector Capture Toggle */}
          {connectionStatus === 'connected' && (
            <button
              onClick={() => isCapturingSelector ? stopSelectorCapture() : startSelectorCapture()}
              className={`p-2 rounded transition-colors ${
                isCapturingSelector
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'hover:bg-gray-700 text-gray-400'
              }`}
              title={isCapturingSelector ? 'Stop Capturing' : 'Capture Element'}
            >
              <Target size={16} />
            </button>
          )}

          {/* Refresh Button */}
          {connectionStatus === 'connected' && (
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={`text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Selector Capture Banner */}
        {isCapturingSelector && (
          <div className="bg-green-600 px-4 py-2 border-b border-green-700">
            <div className="flex items-center justify-center gap-2 text-white text-sm font-medium">
              <Target size={16} className="animate-pulse" />
              <span>Tap any element on the device to capture its selector</span>
              <button
                onClick={stopSelectorCapture}
                className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* URL Bar */}
        {connectionStatus === 'connected' && !isCapturingSelector && (
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
            <div className="flex items-center gap-2 bg-gray-900 rounded px-3 py-1.5">
              <div className="text-xs text-gray-500 flex-shrink-0">URL:</div>
              <div className="text-xs text-white truncate flex-1">{currentUrl}</div>
              {isLoading && (
                <Loader size={12} className="text-blue-400 animate-spin flex-shrink-0" />
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          {/* Connecting State */}
          {isConnecting && (
            <div className="text-center">
              <Loader size={48} className="text-blue-400 animate-spin mx-auto mb-4" />
              <div className="text-white text-lg font-medium mb-2">Connecting to device...</div>
              <div className="text-gray-400 text-sm">
                {device.os === 'android' ? 'Establishing CDP connection' : 'Connecting via Appium'}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isConnecting && (
            <div className="text-center px-8">
              <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
              <div className="text-white text-lg font-medium mb-2">Connection Error</div>
              <div className="text-gray-400 text-sm mb-4">{error}</div>
              <button
                onClick={initializeConnection}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Connected - Show Screenshot (Live 40 FPS) */}
          {connectionStatus === 'connected' && !error && (
            <div className="w-full h-full flex items-center justify-center p-4">
              {screenshot ? (
                <div className="relative max-w-full max-h-full">
                  {/* Device Frame */}
                  <div className="bg-gray-800 rounded-3xl p-4 shadow-2xl">
                    <div className="bg-black rounded-2xl overflow-hidden relative">
                      <img
                        ref={imageRef}
                        src={screenshot}
                        alt="Device screen"
                        className="w-full h-full object-contain"
                        style={{
                          maxWidth: device.capabilities.screenWidth * 0.5 + 'px',
                          maxHeight: device.capabilities.screenHeight * 0.5 + 'px'
                        }}
                      />

                      {/* Click overlay for recording mode */}
                      {recordingMode && (
                        <div
                          className="absolute inset-0 cursor-crosshair"
                          onClick={handleScreenshotClick}
                          style={{
                            background: isMatchingElement ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                          }}
                        >
                          {isMatchingElement && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                <Loader size={16} className="animate-spin" />
                                <span className="text-sm font-medium">Finding element...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Loading Overlay */}
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-3xl">
                      <Loader size={48} className="text-white animate-spin" />
                    </div>
                  )}

                  {/* Recording Indicator */}
                  {recordingMode && !isMatchingElement && (
                    <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      RECORDING
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <Loader size={48} className="text-blue-400 animate-spin mx-auto mb-4" />
                  <div className="text-white text-lg">Loading page...</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {connectionStatus === 'connected' && (
          <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div>
                Screen: {device.capabilities.screenWidth} x {device.capabilities.screenHeight}
              </div>
              <div>
                {device.os === 'android' ? 'Chrome DevTools Protocol' : 'Appium + XCUITest'}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

MobileWebView.displayName = 'MobileWebView'

export default MobileWebView
