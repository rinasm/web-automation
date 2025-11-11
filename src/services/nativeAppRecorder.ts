/**
 * Native App Recorder
 *
 * Records user interactions on native iOS/Android apps using Appium's element hierarchy
 * Works without JavaScript injection by polling page source and detecting changes
 */

import { MobileDevice, IOSDevice } from '../types/mobileDevice'
import { appiumConnectionManager } from '../utils/appiumConnection'
import { RecordedEvent, ElementInfo, GestureType } from '../store/recordingStore'
import { parseString } from 'xml2js'

export type NativeEventCallback = (event: RecordedEvent) => void

interface NativeElement {
  type: string
  name?: string
  label?: string
  value?: string
  enabled: boolean
  visible: boolean
  x: number
  y: number
  width: number
  height: number
  children: NativeElement[]
}

interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

/**
 * Native App Recorder Class
 *
 * Monitors native app UI hierarchy and user interactions
 */
export class NativeAppRecorder {
  private device: MobileDevice
  private isRecording: boolean = false
  private eventCallback: NativeEventCallback | null = null

  // State tracking
  private lastPageSource: string = ''
  private lastElements: NativeElement[] = []
  private touchHistory: TouchPoint[] = []

  // Polling
  private pollingInterval: NodeJS.Timeout | null = null
  private readonly POLL_RATE = 200 // Poll every 200ms (5 times per second)

  // Event detection
  private lastEventTime: number = 0
  private eventCounter: number = 0

  constructor(device: MobileDevice, callback: NativeEventCallback) {
    this.device = device
    this.eventCallback = callback
    console.log(`🎬 [NATIVE RECORDER] Initialized for ${device.name}`)
  }

  /**
   * Start recording
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      console.warn('🎬 [NATIVE RECORDER] Already recording')
      return
    }

    console.log('🎬 [NATIVE RECORDER] Starting native app recording')
    this.isRecording = true

    // Get initial page source
    await this.updatePageSource()

    // Start polling for changes
    this.startPolling()
  }

  /**
   * Stop recording
   */
  async stop(): Promise<void> {
    if (!this.isRecording) {
      return
    }

    console.log('🎬 [NATIVE RECORDER] Stopping native app recording')
    this.isRecording = false

    this.stopPolling()
    this.touchHistory = []
  }

  /**
   * Start polling page source for changes
   */
  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.updatePageSource()
      } catch (error) {
        console.error('🎬 [NATIVE RECORDER] Polling error:', error)
      }
    }, this.POLL_RATE)

    console.log(`🎬 [NATIVE RECORDER] Polling started (every ${this.POLL_RATE}ms)`)
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  /**
   * Update page source and detect changes
   */
  private async updatePageSource(): Promise<void> {
    if (!this.isRecording) return

    try {
      // Get current page source (XML hierarchy)
      const pageSource = await this.getPageSource()

      if (!pageSource) {
        console.warn('🎬 [NATIVE RECORDER] No page source received')
        return
      }

      if (pageSource === this.lastPageSource) {
        // No changes - this is normal during idle time
        return
      }

      console.log('🎬 [NATIVE RECORDER] Page source changed - parsing elements...')

      // Parse elements from page source
      const elements = await this.parsePageSource(pageSource)
      console.log(`🎬 [NATIVE RECORDER] Found ${elements.length} interactive elements`)

      // Detect interactions by comparing with previous state
      if (this.lastElements.length > 0) {
        await this.detectInteractions(this.lastElements, elements)
      } else {
        console.log('🎬 [NATIVE RECORDER] First page source captured - baseline set')
      }

      // Update state
      this.lastPageSource = pageSource
      this.lastElements = elements

    } catch (error) {
      // Silently ignore errors (expected during transitions)
      console.debug('🎬 [NATIVE RECORDER] Error during page source update (normal during transitions):', error)
    }
  }

  /**
   * Get page source from Appium
   */
  private async getPageSource(): Promise<string> {
    const connection = appiumConnectionManager.getConnection(this.device.id)
    if (!connection?.driver) {
      throw new Error('No active driver')
    }

    return await connection.driver.getPageSource()
  }

  /**
   * Parse XML page source into element tree
   */
  private async parsePageSource(xml: string): Promise<NativeElement[]> {
    return new Promise((resolve, reject) => {
      parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) {
          reject(err)
          return
        }

        const elements: NativeElement[] = []

        // Extract elements from XML (iOS uses XCUIElementType*, Android uses android.widget.*)
        const root = result?.AppiumAUT || result?.hierarchy

        if (root) {
          this.extractElements(root, elements)
        }

        resolve(elements)
      })
    })
  }

  /**
   * Extract elements recursively from XML tree
   */
  private extractElements(node: any, elements: NativeElement[], depth: number = 0): void {
    if (!node || depth > 20) return // Prevent infinite recursion

    // Skip non-element nodes
    if (typeof node !== 'object') return

    // Extract element properties
    const attrs = node.$ || {}

    const element: NativeElement = {
      type: attrs.type || attrs.class || 'Unknown',
      name: attrs.name || attrs['resource-id'] || undefined,
      label: attrs.label || attrs['content-desc'] || undefined,
      value: attrs.value || attrs.text || undefined,
      enabled: attrs.enabled === 'true',
      visible: attrs.visible === 'true',
      x: parseInt(attrs.x || '0'),
      y: parseInt(attrs.y || '0'),
      width: parseInt(attrs.width || '0'),
      height: parseInt(attrs.height || '0'),
      children: []
    }

    // Only add interactive elements
    if (this.isInteractiveElement(element)) {
      elements.push(element)
    }

    // Process children
    const children = node.XCUIElementTypeOther || node['android.widget.'] || node._ || []

    if (Array.isArray(children)) {
      for (const child of children) {
        this.extractElements(child, elements, depth + 1)
      }
    } else if (typeof children === 'object') {
      this.extractElements(children, elements, depth + 1)
    }
  }

  /**
   * Check if element is interactive (clickable, focusable, etc.)
   */
  private isInteractiveElement(element: NativeElement): boolean {
    if (!element.visible || !element.enabled) {
      return false
    }

    // Check element type
    const interactiveTypes = [
      'Button', 'TextField', 'SecureTextField', 'SearchField',
      'Switch', 'Slider', 'Picker', 'Cell', 'Link',
      'android.widget.Button', 'android.widget.EditText',
      'android.widget.CheckBox', 'android.widget.RadioButton'
    ]

    return interactiveTypes.some(type => element.type.includes(type))
  }

  /**
   * Detect interactions by comparing element states
   */
  private async detectInteractions(
    previousElements: NativeElement[],
    currentElements: NativeElement[]
  ): Promise<void> {
    // Simple heuristic: detect newly appeared/focused elements
    // This indicates a tap/click action

    for (const currentEl of currentElements) {
      // Check if this element was not present before or changed state
      const previousEl = previousElements.find(
        el => el.name === currentEl.name && el.type === currentEl.type
      )

      // Detect new focus (text field)
      if (!previousEl && currentEl.type.includes('TextField')) {
        await this.recordTapEvent(currentEl, 'tap on text field')
        continue
      }

      // Detect value changes (button pressed, switch toggled, etc.)
      if (previousEl && previousEl.value !== currentEl.value) {
        if (currentEl.type.includes('TextField')) {
          // Text input
          await this.recordTypeEvent(currentEl, currentEl.value || '')
        } else {
          // Button/switch click
          await this.recordTapEvent(currentEl, 'interact with element')
        }
      }
    }

    // Detect disappeared elements (might indicate navigation)
    const disappearedElements = previousElements.filter(
      prevEl => !currentElements.find(
        currEl => currEl.name === prevEl.name && currEl.type === prevEl.type
      )
    )

    if (disappearedElements.length > 3) {
      // Significant UI change - likely navigation
      console.log('🎬 [NATIVE RECORDER] Detected navigation/screen change')
    }
  }

  /**
   * Record tap event
   */
  private async recordTapEvent(element: NativeElement, description: string): Promise<void> {
    const now = Date.now()

    // Throttle events
    if (now - this.lastEventTime < 500) {
      return
    }
    this.lastEventTime = now

    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2

    const event: RecordedEvent = {
      id: `event-${++this.eventCounter}`,
      timestamp: now,
      gestureType: 'tap',
      coordinates: { x: centerX, y: centerY },
      element: this.convertToElementInfo(element),
      description: description || `Tap on ${element.label || element.type}`,
      duration: 100
    }

    console.log('🎬 [NATIVE RECORDER] Tap detected:', description)

    if (this.eventCallback) {
      this.eventCallback(event)
    }
  }

  /**
   * Record type event
   */
  private async recordTypeEvent(element: NativeElement, value: string): Promise<void> {
    const now = Date.now()

    const event: RecordedEvent = {
      id: `event-${++this.eventCounter}`,
      timestamp: now,
      gestureType: 'type',
      coordinates: { x: element.x + element.width / 2, y: element.y + element.height / 2 },
      element: this.convertToElementInfo(element),
      value: value,
      description: `Type "${value}" in ${element.label || 'text field'}`,
      duration: value.length * 50
    }

    console.log('🎬 [NATIVE RECORDER] Type detected:', value)

    if (this.eventCallback) {
      this.eventCallback(event)
    }

    this.lastEventTime = now
  }

  /**
   * Convert native element to ElementInfo format
   */
  private convertToElementInfo(element: NativeElement): ElementInfo {
    return {
      accessibilityId: element.name,
      className: element.type,
      text: element.value || element.label || '',
      bounds: {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      },
      isClickable: true,
      isEditable: element.type.includes('TextField')
    }
  }

  /**
   * Check if recorder is active
   */
  isActive(): boolean {
    return this.isRecording
  }
}

/**
 * Native App Recorder Manager
 */
class NativeAppRecorderManager {
  private recorders: Map<string, NativeAppRecorder> = new Map()

  /**
   * Create recorder for device
   */
  createRecorder(device: MobileDevice, callback: NativeEventCallback): NativeAppRecorder {
    // Stop existing recorder if any
    const existing = this.recorders.get(device.id)
    if (existing) {
      existing.stop()
    }

    const recorder = new NativeAppRecorder(device, callback)
    this.recorders.set(device.id, recorder)

    console.log(`🎬 [RECORDER MANAGER] Created native recorder for ${device.name}`)

    return recorder
  }

  /**
   * Get recorder for device
   */
  getRecorder(deviceId: string): NativeAppRecorder | undefined {
    return this.recorders.get(deviceId)
  }

  /**
   * Remove recorder
   */
  async removeRecorder(deviceId: string): Promise<void> {
    const recorder = this.recorders.get(deviceId)
    if (recorder) {
      await recorder.stop()
      this.recorders.delete(deviceId)
      console.log(`🎬 [RECORDER MANAGER] Removed recorder for device ${deviceId}`)
    }
  }

  /**
   * Stop all recorders
   */
  async stopAll(): Promise<void> {
    console.log('🎬 [RECORDER MANAGER] Stopping all recorders')

    const promises = Array.from(this.recorders.values()).map(recorder => recorder.stop())
    await Promise.all(promises)

    this.recorders.clear()
  }
}

// Export singleton instance
export const nativeAppRecorderManager = new NativeAppRecorderManager()
