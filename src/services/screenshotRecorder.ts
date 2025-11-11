/**
 * Screenshot-Based Recorder for Native iOS Apps
 *
 * This approach mimics Appium Inspector's recorder:
 * - Captures screenshots periodically
 * - User clicks on screenshot (not live device)
 * - Matches click coordinates to elements in page source
 * - Records actions with proper selectors
 *
 * This is the ONLY reliable way to record native iOS app interactions
 * due to iOS security restrictions that prevent real-time touch event monitoring.
 */

import { MobileDevice } from '../types/mobileDevice'
import { appiumConnectionManager } from '../utils/appiumConnection'
import { RecordedEvent, ElementInfo, GestureType } from '../store/recordingStore'
import { parseString } from 'xml2js'

export interface ScreenshotRecordingState {
  screenshot: string | null
  pageSource: string | null
  elements: ParsedElement[]
  lastUpdate: number
}

export interface ParsedElement {
  type: string
  name?: string
  label?: string
  value?: string
  accessibilityId?: string
  className?: string
  enabled: boolean
  visible: boolean
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  xpath?: string
}

export interface ClickEvent {
  x: number
  y: number
  actionType: 'tap' | 'longPress' | 'swipeStart' | 'swipeEnd'
  timestamp: number
}

export type ScreenshotRecordingCallback = (event: RecordedEvent) => void

/**
 * Screenshot-Based Recorder
 * Captures screenshots and matches user clicks to elements
 */
export class ScreenshotRecorder {
  private device: MobileDevice
  private isRecording: boolean = false
  private eventCallback: ScreenshotRecordingCallback | null = null

  // Event tracking
  private eventCounter: number = 0
  private pendingSwipe: ClickEvent | null = null

  constructor(device: MobileDevice, callback: ScreenshotRecordingCallback) {
    this.device = device
    this.eventCallback = callback
    console.log(`📸 [SCREENSHOT RECORDER] Initialized for ${device.name}`)
  }

  /**
   * Start screenshot-based recording
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      console.warn('📸 [SCREENSHOT RECORDER] Already recording')
      return
    }

    console.log('📸 [SCREENSHOT RECORDER] Starting live recording mode')
    this.isRecording = true
  }

  /**
   * Stop recording
   */
  async stop(): Promise<void> {
    if (!this.isRecording) {
      return
    }

    console.log('📸 [SCREENSHOT RECORDER] Stopping live recording mode')
    this.isRecording = false
  }

  /**
   * Match click to element and generate recorded event (on-demand)
   * This fetches page source only when called, making it suitable for live recording
   */
  async matchClickToElement(x: number, y: number, actionType: 'tap' | 'longPress' = 'tap'): Promise<RecordedEvent> {
    if (!this.isRecording) {
      throw new Error('Recorder is not active')
    }

    console.log(`📸 [SCREENSHOT RECORDER] Matching click at (${x}, ${y})`)
    console.log('📸 [SCREENSHOT RECORDER] Fetching page source...')

    // Fetch page source on-demand (1-3 seconds on iOS)
    const pageSource = await this.getPageSource()

    // Parse elements from page source
    console.log('📸 [SCREENSHOT RECORDER] Parsing elements...')
    const elements = await this.parsePageSource(pageSource)
    console.log(`📸 [SCREENSHOT RECORDER] Found ${elements.length} elements`)

    // Find element at click coordinates
    const element = this.findElementAtCoordinates(x, y, elements)

    if (!element) {
      // Log element bounds for debugging
      console.log('📸 [SCREENSHOT RECORDER] Available element bounds:')
      elements.slice(0, 5).forEach(el => {
        console.log(`  - ${el.type} "${el.label || el.value || 'no label'}": x=${el.bounds.x}, y=${el.bounds.y}, w=${el.bounds.width}, h=${el.bounds.height}`)
      })
      throw new Error(`No element found at coordinates (${x}, ${y}). Found ${elements.length} elements, but none contain this point.`)
    }

    console.log(`📸 [SCREENSHOT RECORDER] Matched element: ${element.type}`, element.label || element.name)

    // Generate recorded event
    const event: RecordedEvent = {
      id: `event-${++this.eventCounter}`,
      timestamp: Date.now(),
      gestureType: actionType,
      coordinates: { x, y },
      element: this.convertToElementInfo(element),
      description: `${actionType === 'tap' ? 'Tap' : 'Long press'} on ${element.label || element.value || element.type}`,
      duration: actionType === 'tap' ? 100 : 1000
    }

    console.log('📸 [SCREENSHOT RECORDER] Event matched:', event.description)

    // Trigger callback
    if (this.eventCallback) {
      this.eventCallback(event)
    }

    return event
  }

  /**
   * Check if recorder is active
   */
  isActive(): boolean {
    return this.isRecording
  }

  // ==================== Private Methods ====================

  /**
   * Capture screenshot from device
   */
  private async captureScreenshot(): Promise<string> {
    const connection = appiumConnectionManager.getConnection(this.device.id)
    if (!connection?.session) {
      throw new Error('No active Appium connection')
    }

    // Use appiumConnectionManager's takeScreenshot method
    const dataUrl = await appiumConnectionManager.takeScreenshot(this.device.id)

    // Extract base64 from data URL (remove "data:image/png;base64," prefix)
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    return base64
  }

  /**
   * Get page source (element hierarchy) from device
   */
  private async getPageSource(): Promise<string> {
    const connection = appiumConnectionManager.getConnection(this.device.id)
    if (!connection?.session) {
      throw new Error('No active Appium connection')
    }

    // Use appiumConnectionManager's getDOMSnapshot method
    const source = await appiumConnectionManager.getDOMSnapshot(this.device.id)
    return source
  }

  /**
   * Parse XML page source into element tree
   */
  private async parsePageSource(xml: string): Promise<ParsedElement[]> {
    return new Promise((resolve, reject) => {
      parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) {
          reject(err)
          return
        }

        const elements: ParsedElement[] = []
        const root = result?.AppiumAUT || result?.hierarchy

        if (root) {
          this.extractElements(root, elements, '')
        }

        resolve(elements)
      })
    })
  }

  /**
   * Recursively extract elements from XML tree
   */
  private extractElements(node: any, elements: ParsedElement[], xpathPrefix: string, depth: number = 0): void {
    if (!node || depth > 30) return

    if (typeof node !== 'object') return

    const attrs = node.$ || {}

    // Extract bounds
    let bounds = { x: 0, y: 0, width: 0, height: 0 }

    if (attrs.x && attrs.y && attrs.width && attrs.height) {
      bounds = {
        x: parseInt(attrs.x || '0'),
        y: parseInt(attrs.y || '0'),
        width: parseInt(attrs.width || '0'),
        height: parseInt(attrs.height || '0')
      }
    }

    const elementType = attrs.type || attrs.class || 'Unknown'
    const xpath = `${xpathPrefix}/${elementType}`

    const element: ParsedElement = {
      type: elementType,
      name: attrs.name || attrs['resource-id'] || undefined,
      label: attrs.label || attrs['content-desc'] || undefined,
      value: attrs.value || attrs.text || undefined,
      accessibilityId: attrs.name || attrs['resource-id'] || undefined,
      className: elementType,
      enabled: attrs.enabled !== 'false',
      visible: attrs.visible !== 'false',
      bounds,
      xpath
    }

    // Only add visible elements with valid bounds
    if (element.visible && bounds.width > 0 && bounds.height > 0) {
      elements.push(element)
    }

    // Process children recursively
    for (const key in node) {
      if (key !== '$' && key !== '_') {
        const children = Array.isArray(node[key]) ? node[key] : [node[key]]
        children.forEach(child => {
          this.extractElements(child, elements, xpath, depth + 1)
        })
      }
    }
  }

  /**
   * Find element at given coordinates
   */
  private findElementAtCoordinates(x: number, y: number, elements: ParsedElement[]): ParsedElement | null {
    // Find all elements that contain the point
    const candidates = elements.filter(el => {
      return (
        x >= el.bounds.x &&
        x <= el.bounds.x + el.bounds.width &&
        y >= el.bounds.y &&
        y <= el.bounds.y + el.bounds.height
      )
    })

    if (candidates.length === 0) {
      return null
    }

    // Return the smallest element (most specific)
    return candidates.reduce((smallest, current) => {
      const smallestArea = smallest.bounds.width * smallest.bounds.height
      const currentArea = current.bounds.width * current.bounds.height
      return currentArea < smallestArea ? current : smallest
    })
  }

  /**
   * Convert parsed element to ElementInfo format
   */
  private convertToElementInfo(element: ParsedElement): ElementInfo {
    return {
      accessibilityId: element.accessibilityId,
      className: element.className,
      text: element.value || element.label || '',
      xpath: element.xpath,
      bounds: element.bounds,
      isClickable: element.enabled,
      isEditable: element.type.toLowerCase().includes('textfield') || element.type.toLowerCase().includes('edittext')
    }
  }
}

/**
 * Screenshot Recorder Manager
 * Manages screenshot recorders for multiple devices
 */
class ScreenshotRecorderManager {
  private recorders: Map<string, ScreenshotRecorder> = new Map()

  /**
   * Create recorder for device
   */
  createRecorder(device: MobileDevice, callback: ScreenshotRecordingCallback): ScreenshotRecorder {
    // Stop existing recorder if any
    const existing = this.recorders.get(device.id)
    if (existing) {
      existing.stop()
    }

    const recorder = new ScreenshotRecorder(device, callback)
    this.recorders.set(device.id, recorder)

    console.log(`📸 [RECORDER MANAGER] Created screenshot recorder for ${device.name}`)

    return recorder
  }

  /**
   * Get recorder for device
   */
  getRecorder(deviceId: string): ScreenshotRecorder | undefined {
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
      console.log(`📸 [RECORDER MANAGER] Removed recorder for device ${deviceId}`)
    }
  }

  /**
   * Stop all recorders
   */
  async stopAll(): Promise<void> {
    console.log('📸 [RECORDER MANAGER] Stopping all recorders')

    const promises = Array.from(this.recorders.values()).map(recorder => recorder.stop())
    await Promise.all(promises)

    this.recorders.clear()
  }
}

// Export singleton instance
export const screenshotRecorderManager = new ScreenshotRecorderManager()
