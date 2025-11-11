/**
 * Mobile Event Listener Service
 *
 * Captures real-time touch events and interactions from mobile devices
 * Supports both iOS (Appium) and Android (CDP) platforms
 */

import { MobileDevice, AndroidDevice, IOSDevice } from '../types/mobileDevice'
import { cdpConnectionManager } from '../utils/cdpConnection'
import { appiumConnectionManager } from '../utils/appiumConnection'
import { RawTouchEvent, RecordedEvent, ElementInfo } from '../store/recordingStore'
import { GestureAnalyzer, GestureAnalysis, formatGestureDescription } from '../utils/gestureAnalyzer'
import { getXPathForElement } from '../utils/xpath'
import { NativeAppRecorder, nativeAppRecorderManager } from './nativeAppRecorder'

/**
 * Event listener callback
 */
export type EventCallback = (event: RecordedEvent) => void

/**
 * Listener configuration
 */
export interface ListenerConfig {
  captureScreenshots?: boolean
  throttleDelay?: number
  includeSystemEvents?: boolean
  minimumGestureDuration?: number
}

/**
 * Mobile Event Listener Class
 */
export class MobileEventListener {
  private device: MobileDevice
  private isListening: boolean = false
  private eventCallback: EventCallback | null = null
  private gestureAnalyzer: GestureAnalyzer
  private config: ListenerConfig

  // Touch tracking
  private activeTouches: Map<number, RawTouchEvent[]> = new Map()
  private lastEventTime: number = 0
  private eventCounter: number = 0

  // Polling
  private pollingInterval: NodeJS.Timeout | null = null
  private readonly POLLING_RATE = 50 // ms

  // Native app recorder (for apps that don't support JS injection)
  private nativeRecorder: NativeAppRecorder | null = null
  private useNativeRecording: boolean = false

  constructor(device: MobileDevice, config: ListenerConfig = {}) {
    this.device = device
    this.gestureAnalyzer = new GestureAnalyzer()
    this.config = {
      captureScreenshots: false,
      throttleDelay: 100,
      includeSystemEvents: false,
      minimumGestureDuration: 50,
      ...config
    }

    console.log(`🎬 [EVENT LISTENER] Initialized for ${device.name}`)
  }

  /**
   * Start listening for events
   */
  async start(callback: EventCallback): Promise<void> {
    if (this.isListening) {
      console.warn('🎬 [EVENT LISTENER] Already listening')
      return
    }

    console.log('🎬 [EVENT LISTENER] Starting event listener')

    this.eventCallback = callback
    this.isListening = true

    try {
      // Check if we can use web-based recording (JS injection)
      console.log('🎬 [EVENT LISTENER] Checking context type...')
      const isWeb = await this.isWebContext()
      console.log(`🎬 [EVENT LISTENER] Context detection result: ${isWeb ? 'WEB' : 'NATIVE'}`)

      if (isWeb) {
        console.log('🎬 [EVENT LISTENER] Using web-based recording (JS injection)')
        this.useNativeRecording = false

        // Inject event capture script into the device
        await this.injectEventCaptureScript()

        // Start polling for events
        this.startPolling()
      } else {
        console.log('🎬 [EVENT LISTENER] Using native app recording (Appium page source)')
        this.useNativeRecording = true

        // Use native app recorder instead
        console.log('🎬 [EVENT LISTENER] Creating native recorder...')
        this.nativeRecorder = nativeAppRecorderManager.createRecorder(
          this.device,
          (event) => {
            console.log('🎬 [EVENT LISTENER] Event received from native recorder:', event.gestureType)
            if (this.eventCallback) {
              this.eventCallback(event)
            }
          }
        )

        console.log('🎬 [EVENT LISTENER] Starting native recorder...')
        await this.nativeRecorder.start()
        console.log('🎬 [EVENT LISTENER] Native recorder started successfully')
      }
    } catch (error) {
      console.error('🎬 [EVENT LISTENER] Error starting event listener:', error)
      this.isListening = false
      throw error
    }
  }

  /**
   * Stop listening for events
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      return
    }

    console.log('🎬 [EVENT LISTENER] Stopping event listener')

    this.isListening = false

    if (this.useNativeRecording && this.nativeRecorder) {
      // Stop native recorder
      await this.nativeRecorder.stop()
      await nativeAppRecorderManager.removeRecorder(this.device.id)
      this.nativeRecorder = null
    } else {
      // Stop web-based recording
      this.stopPolling()

      // Cleanup event capture script
      await this.cleanupEventCaptureScript()
    }

    this.eventCallback = null
    this.activeTouches.clear()
    this.gestureAnalyzer.clear()
  }

  /**
   * Check if device is in web context (can inject JS) or native context
   */
  private async isWebContext(): Promise<boolean> {
    try {
      if (this.device.os === 'android') {
        // For Android, CDP only works in web context
        console.log('🎬 [EVENT LISTENER] Android device - assuming web context')
        return true
      } else {
        // For iOS, check current context
        console.log('🎬 [EVENT LISTENER] iOS device - checking if document exists...')
        const result = await appiumConnectionManager.executeJavaScript(
          this.device.id,
          'return typeof document !== "undefined";'
        )
        console.log(`🎬 [EVENT LISTENER] Document check result: ${result}`)
        return result === true
      }
    } catch (error) {
      // If JS execution fails, we're likely in native context
      console.log('🎬 [EVENT LISTENER] JS execution failed (expected for native app) - using native recording')
      return false
    }
  }

  /**
   * Inject JavaScript to capture touch events
   */
  private async injectEventCaptureScript(): Promise<void> {
    const script = `
      (function() {
        // Remove existing listeners if any
        if (window.__mobileEventRecorder) {
          console.log('[Mobile Recorder] Removing existing recorder');
          window.__mobileEventRecorder.cleanup();
        }

        // Touch event queue
        window.__recordedTouchEvents = [];
        window.__lastRecordedEvent = null;

        // Track active touches
        const activeTouches = new Map();

        // Helper to get element info at point
        function getElementInfoAtPoint(x, y) {
          const element = document.elementFromPoint(x, y);
          if (!element || element === document.body || element === document.documentElement) {
            return null;
          }

          const getXPath = ${getXPathForElement.toString()};
          const xpath = getXPath(element);
          const rect = element.getBoundingClientRect();

          return {
            xpath: xpath,
            text: element.textContent?.trim().substring(0, 100) || '',
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            bounds: {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            },
            isClickable: element.onclick !== null || element.tagName === 'BUTTON' || element.tagName === 'A',
            isEditable: element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable
          };
        }

        // Touch start handler
        function handleTouchStart(e) {
          const timestamp = Date.now();

          for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const touchId = touch.identifier;

            const touchEvent = {
              id: 'touch-' + touchId + '-' + timestamp,
              timestamp: timestamp,
              type: 'touchStart',
              x: touch.clientX,
              y: touch.clientY,
              pressure: touch.force || 0,
              pointerCount: e.touches.length
            };

            activeTouches.set(touchId, [touchEvent]);
          }
        }

        // Touch move handler
        function handleTouchMove(e) {
          const timestamp = Date.now();

          for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const touchId = touch.identifier;

            const touchEvent = {
              id: 'touch-' + touchId + '-' + timestamp,
              timestamp: timestamp,
              type: 'touchMove',
              x: touch.clientX,
              y: touch.clientY,
              pressure: touch.force || 0,
              pointerCount: e.touches.length
            };

            const sequence = activeTouches.get(touchId) || [];
            sequence.push(touchEvent);
            activeTouches.set(touchId, sequence);
          }
        }

        // Touch end handler
        function handleTouchEnd(e) {
          const timestamp = Date.now();

          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const touchId = touch.identifier;

            const touchEvent = {
              id: 'touch-' + touchId + '-' + timestamp,
              timestamp: timestamp,
              type: 'touchEnd',
              x: touch.clientX,
              y: touch.clientY,
              pressure: touch.force || 0,
              pointerCount: e.touches.length
            };

            const sequence = activeTouches.get(touchId) || [];
            sequence.push(touchEvent);

            // Get element info at touch point
            const elementInfo = getElementInfoAtPoint(touch.clientX, touch.clientY);

            // Store completed touch sequence
            window.__recordedTouchEvents.push({
              sequence: sequence,
              elementInfo: elementInfo,
              timestamp: timestamp
            });

            activeTouches.delete(touchId);
          }
        }

        // Input event handler (for text input)
        function handleInput(e) {
          const element = e.target;
          if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable) {
            const getXPath = ${getXPathForElement.toString()};
            const xpath = getXPath(element);

            window.__recordedTouchEvents.push({
              type: 'input',
              value: element.value || element.textContent,
              elementInfo: {
                xpath: xpath,
                text: element.placeholder || '',
                tagName: element.tagName,
                isEditable: true
              },
              timestamp: Date.now()
            });
          }
        }

        // Attach listeners
        document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
        document.addEventListener('input', handleInput, { passive: true, capture: true });

        // Store cleanup function
        window.__mobileEventRecorder = {
          cleanup: function() {
            document.removeEventListener('touchstart', handleTouchStart, true);
            document.removeEventListener('touchmove', handleTouchMove, true);
            document.removeEventListener('touchend', handleTouchEnd, true);
            document.removeEventListener('input', handleInput, true);
            window.__recordedTouchEvents = [];
          }
        };

        console.log('[Mobile Recorder] Event recording enabled');
      })();
    `

    try {
      if (this.device.os === 'android') {
        await cdpConnectionManager.executeJavaScript(this.device.id, script)
      } else {
        await appiumConnectionManager.executeJavaScript(this.device.id, script)
      }

      console.log('🎬 [EVENT LISTENER] Event capture script injected')
    } catch (error) {
      console.error('🎬 [EVENT LISTENER] Failed to inject script:', error)
      throw error
    }
  }

  /**
   * Cleanup event capture script
   */
  private async cleanupEventCaptureScript(): Promise<void> {
    const script = `
      (function() {
        if (window.__mobileEventRecorder) {
          window.__mobileEventRecorder.cleanup();
          delete window.__mobileEventRecorder;
          delete window.__recordedTouchEvents;
        }
      })();
    `

    try {
      if (this.device.os === 'android') {
        await cdpConnectionManager.executeJavaScript(this.device.id, script)
      } else {
        await appiumConnectionManager.executeJavaScript(this.device.id, script)
      }

      console.log('🎬 [EVENT LISTENER] Event capture script cleaned up')
    } catch (error) {
      console.error('🎬 [EVENT LISTENER] Cleanup error:', error)
    }
  }

  /**
   * Start polling for captured events
   */
  private startPolling(): void {
    this.pollingInterval = setInterval(() => {
      this.pollEvents().catch(error => {
        console.error('🎬 [EVENT LISTENER] Polling error:', error)
      })
    }, this.POLLING_RATE)

    console.log('🎬 [EVENT LISTENER] Started polling')
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
      console.log('🎬 [EVENT LISTENER] Stopped polling')
    }
  }

  /**
   * Poll for new events
   */
  private async pollEvents(): Promise<void> {
    if (!this.isListening) {
      return
    }

    const script = `
      (function() {
        const events = window.__recordedTouchEvents || [];
        window.__recordedTouchEvents = [];
        return events;
      })();
    `

    try {
      let events: any[]

      if (this.device.os === 'android') {
        events = await cdpConnectionManager.executeJavaScript(this.device.id, script)
      } else {
        events = await appiumConnectionManager.executeJavaScript(this.device.id, script)
      }

      if (events && events.length > 0) {
        for (const event of events) {
          await this.processEvent(event)
        }
      }
    } catch (error) {
      // Silently ignore errors during polling
    }
  }

  /**
   * Process a captured event
   */
  private async processEvent(event: any): Promise<void> {
    try {
      // Handle input events
      if (event.type === 'input') {
        const recordedEvent: RecordedEvent = {
          id: `event-${++this.eventCounter}`,
          timestamp: event.timestamp,
          gestureType: 'type',
          coordinates: { x: 0, y: 0 },
          value: event.value,
          element: event.elementInfo,
          description: `Type "${event.value}" in ${event.elementInfo?.tagName || 'field'}`
        }

        this.eventCallback?.(recordedEvent)
        return
      }

      // Handle touch sequences
      if (event.sequence && event.sequence.length > 0) {
        // Analyze gesture
        const gesture = this.gestureAnalyzer.analyzeGesture(event.sequence)

        if (!gesture) {
          return
        }

        // Throttle events
        const now = Date.now()
        if (now - this.lastEventTime < this.config.throttleDelay!) {
          return
        }
        this.lastEventTime = now

        // Capture screenshot if enabled
        let screenshot: string | undefined
        if (this.config.captureScreenshots) {
          screenshot = await this.captureScreenshot()
        }

        // Create recorded event
        const recordedEvent: RecordedEvent = {
          id: `event-${++this.eventCounter}`,
          timestamp: event.timestamp,
          gestureType: gesture.type,
          coordinates: {
            x: gesture.startX,
            y: gesture.startY
          },
          swipeDirection: gesture.direction,
          swipeDistance: gesture.distance,
          duration: gesture.duration,
          element: event.elementInfo,
          description: formatGestureDescription(gesture),
          screenshot
        }

        // Emit event
        this.eventCallback?.(recordedEvent)
      }
    } catch (error) {
      console.error('🎬 [EVENT LISTENER] Error processing event:', error)
    }
  }

  /**
   * Capture screenshot
   */
  private async captureScreenshot(): Promise<string> {
    if (this.device.os === 'android') {
      return await cdpConnectionManager.takeScreenshot(this.device.id)
    } else {
      return await appiumConnectionManager.takeScreenshot(this.device.id)
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ListenerConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('🎬 [EVENT LISTENER] Configuration updated:', this.config)
  }

  /**
   * Get listener status
   */
  isActive(): boolean {
    return this.isListening
  }

  /**
   * Get device info
   */
  getDevice(): MobileDevice {
    return this.device
  }
}

/**
 * Event Listener Manager (Singleton)
 */
class MobileEventListenerManager {
  private listeners: Map<string, MobileEventListener> = new Map()

  /**
   * Create listener for device
   */
  createListener(
    device: MobileDevice,
    callback: EventCallback,
    config?: ListenerConfig
  ): MobileEventListener {
    // Stop existing listener if any
    const existing = this.listeners.get(device.id)
    if (existing) {
      existing.stop()
    }

    const listener = new MobileEventListener(device, config)
    this.listeners.set(device.id, listener)

    console.log(`🎬 [LISTENER MANAGER] Created listener for ${device.name}`)

    return listener
  }

  /**
   * Get listener for device
   */
  getListener(deviceId: string): MobileEventListener | undefined {
    return this.listeners.get(deviceId)
  }

  /**
   * Remove listener
   */
  async removeListener(deviceId: string): Promise<void> {
    const listener = this.listeners.get(deviceId)
    if (listener) {
      await listener.stop()
      this.listeners.delete(deviceId)
      console.log(`🎬 [LISTENER MANAGER] Removed listener for device ${deviceId}`)
    }
  }

  /**
   * Stop all listeners
   */
  async stopAll(): Promise<void> {
    console.log('🎬 [LISTENER MANAGER] Stopping all listeners')

    const promises = Array.from(this.listeners.values()).map(listener => listener.stop())
    await Promise.all(promises)

    this.listeners.clear()
  }

  /**
   * Get active listener count
   */
  getActiveCount(): number {
    return Array.from(this.listeners.values()).filter(l => l.isActive()).length
  }
}

// Export singleton instance
export const mobileEventListenerManager = new MobileEventListenerManager()
