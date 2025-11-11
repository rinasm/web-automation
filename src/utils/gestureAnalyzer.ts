/**
 * Gesture Analyzer
 *
 * Analyzes raw touch events to detect gesture types (tap, swipe, long-press, etc.)
 */

import { RawTouchEvent, GestureType, SwipeDirection } from '../store/recordingStore'

/**
 * Touch sequence representing a complete gesture
 */
export interface TouchSequence {
  events: RawTouchEvent[]
  startTime: number
  endTime: number
  duration: number
}

/**
 * Analyzed gesture result
 */
export interface GestureAnalysis {
  type: GestureType
  startX: number
  startY: number
  endX: number
  endY: number
  duration: number
  distance?: number
  velocity?: number
  direction?: SwipeDirection
  pointerCount?: number
}

/**
 * Gesture detection thresholds
 */
const THRESHOLDS = {
  TAP_MAX_DURATION: 200, // ms
  TAP_MAX_MOVEMENT: 10, // pixels
  LONG_PRESS_MIN_DURATION: 500, // ms
  LONG_PRESS_MAX_MOVEMENT: 15, // pixels
  DOUBLE_TAP_MAX_INTERVAL: 300, // ms
  DOUBLE_TAP_MAX_DISTANCE: 50, // pixels
  SWIPE_MIN_DISTANCE: 50, // pixels
  SWIPE_MIN_VELOCITY: 0.3, // pixels per ms
  SCROLL_MIN_DISTANCE: 30, // pixels
  PINCH_MIN_POINTER_COUNT: 2
}

/**
 * Gesture Analyzer Class
 */
export class GestureAnalyzer {
  private touchSequences: Map<number, RawTouchEvent[]> = new Map()
  private lastTapTime: number = 0
  private lastTapPosition: { x: number; y: number } | null = null

  /**
   * Add a touch event to the analyzer
   */
  addTouchEvent(event: RawTouchEvent): void {
    const pointerId = event.pointerCount || 1

    if (event.type === 'touchStart') {
      this.touchSequences.set(pointerId, [event])
    } else {
      const sequence = this.touchSequences.get(pointerId) || []
      sequence.push(event)
      this.touchSequences.set(pointerId, sequence)
    }
  }

  /**
   * Analyze completed touch sequence
   */
  analyzeGesture(events: RawTouchEvent[]): GestureAnalysis | null {
    if (events.length === 0) {
      return null
    }

    const startEvent = events[0]
    const endEvent = events[events.length - 1]
    const duration = endEvent.timestamp - startEvent.timestamp

    const startX = startEvent.x
    const startY = startEvent.y
    const endX = endEvent.x
    const endY = endEvent.y

    const distance = this.calculateDistance(startX, startY, endX, endY)
    const velocity = duration > 0 ? distance / duration : 0

    // Detect pinch (multi-touch)
    if (startEvent.pointerCount && startEvent.pointerCount >= THRESHOLDS.PINCH_MIN_POINTER_COUNT) {
      return {
        type: 'pinch',
        startX,
        startY,
        endX,
        endY,
        duration,
        distance,
        pointerCount: startEvent.pointerCount
      }
    }

    // Detect long press
    if (
      duration >= THRESHOLDS.LONG_PRESS_MIN_DURATION &&
      distance <= THRESHOLDS.LONG_PRESS_MAX_MOVEMENT
    ) {
      return {
        type: 'longPress',
        startX,
        startY,
        endX,
        endY,
        duration
      }
    }

    // Detect swipe
    if (
      distance >= THRESHOLDS.SWIPE_MIN_DISTANCE &&
      velocity >= THRESHOLDS.SWIPE_MIN_VELOCITY
    ) {
      const direction = this.detectSwipeDirection(startX, startY, endX, endY)

      return {
        type: 'swipe',
        startX,
        startY,
        endX,
        endY,
        duration,
        distance,
        velocity,
        direction
      }
    }

    // Detect scroll (slower vertical movement)
    if (distance >= THRESHOLDS.SCROLL_MIN_DISTANCE) {
      const isVertical = Math.abs(endY - startY) > Math.abs(endX - startX)

      if (isVertical) {
        return {
          type: 'scroll',
          startX,
          startY,
          endX,
          endY,
          duration,
          distance,
          direction: endY > startY ? 'down' : 'up'
        }
      }
    }

    // Detect double tap
    if (
      duration <= THRESHOLDS.TAP_MAX_DURATION &&
      distance <= THRESHOLDS.TAP_MAX_MOVEMENT
    ) {
      const now = endEvent.timestamp

      if (
        this.lastTapTime > 0 &&
        now - this.lastTapTime <= THRESHOLDS.DOUBLE_TAP_MAX_INTERVAL &&
        this.lastTapPosition &&
        this.calculateDistance(
          startX,
          startY,
          this.lastTapPosition.x,
          this.lastTapPosition.y
        ) <= THRESHOLDS.DOUBLE_TAP_MAX_DISTANCE
      ) {
        // This is a double tap
        this.lastTapTime = 0 // Reset
        this.lastTapPosition = null

        return {
          type: 'doubleTap',
          startX,
          startY,
          endX,
          endY,
          duration
        }
      }

      // Store for potential double tap
      this.lastTapTime = now
      this.lastTapPosition = { x: startX, y: startY }

      return {
        type: 'tap',
        startX,
        startY,
        endX,
        endY,
        duration
      }
    }

    // Default to tap if no other gesture detected
    return {
      type: 'tap',
      startX,
      startY,
      endX,
      endY,
      duration
    }
  }

  /**
   * Complete a touch sequence and return analyzed gesture
   */
  completeSequence(pointerId: number = 1): GestureAnalysis | null {
    const events = this.touchSequences.get(pointerId)

    if (!events || events.length === 0) {
      return null
    }

    const analysis = this.analyzeGesture(events)
    this.touchSequences.delete(pointerId)

    return analysis
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Detect swipe direction
   */
  private detectSwipeDirection(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): SwipeDirection {
    const dx = endX - startX
    const dy = endY - startY

    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx > absDy) {
      // Horizontal swipe
      return dx > 0 ? 'right' : 'left'
    } else {
      // Vertical swipe
      return dy > 0 ? 'down' : 'up'
    }
  }

  /**
   * Clear all stored sequences
   */
  clear(): void {
    this.touchSequences.clear()
    this.lastTapTime = 0
    this.lastTapPosition = null
  }

  /**
   * Get current sequence count
   */
  getSequenceCount(): number {
    return this.touchSequences.size
  }
}

/**
 * Singleton instance
 */
export const gestureAnalyzer = new GestureAnalyzer()

/**
 * Helper function to analyze a complete touch sequence
 */
export function analyzeGestureFromEvents(events: RawTouchEvent[]): GestureAnalysis | null {
  const analyzer = new GestureAnalyzer()
  return analyzer.analyzeGesture(events)
}

/**
 * Helper to detect if gesture is a navigation gesture
 */
export function isNavigationGesture(gesture: GestureAnalysis): boolean {
  return (
    gesture.type === 'swipe' &&
    (gesture.direction === 'left' || gesture.direction === 'right') &&
    (gesture.startX < 50 || gesture.startX > 300) // Edge swipe
  )
}

/**
 * Helper to detect if gesture is likely a scroll
 */
export function isScrollGesture(gesture: GestureAnalysis): boolean {
  return gesture.type === 'scroll' || (gesture.type === 'swipe' && gesture.velocity! < 1.0)
}

/**
 * Format gesture for display
 */
export function formatGestureDescription(gesture: GestureAnalysis): string {
  switch (gesture.type) {
    case 'tap':
      return `Tap at (${Math.round(gesture.startX)}, ${Math.round(gesture.startY)})`

    case 'longPress':
      return `Long press at (${Math.round(gesture.startX)}, ${Math.round(gesture.startY)}) for ${gesture.duration}ms`

    case 'doubleTap':
      return `Double tap at (${Math.round(gesture.startX)}, ${Math.round(gesture.startY)})`

    case 'swipe':
      return `Swipe ${gesture.direction} from (${Math.round(gesture.startX)}, ${Math.round(gesture.startY)}) - ${Math.round(gesture.distance!)}px`

    case 'scroll':
      return `Scroll ${gesture.direction} - ${Math.round(gesture.distance!)}px`

    case 'pinch':
      return `Pinch with ${gesture.pointerCount} fingers`

    default:
      return 'Unknown gesture'
  }
}
