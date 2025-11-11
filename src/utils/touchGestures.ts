/**
 * Touch Gestures Utility
 *
 * Provides touch gesture primitives for mobile device automation.
 * Supports tap, swipe, long press, pinch, and other mobile gestures.
 */

import { CDPConnectionManager } from './cdpConnection'
import { WebKitConnectionManager } from './webkitConnection'

/**
 * Swipe direction
 */
export type SwipeDirection = 'up' | 'down' | 'left' | 'right'

/**
 * Pinch gesture type
 */
export type PinchType = 'zoom-in' | 'zoom-out'

/**
 * Touch event types
 */
export type TouchEventType =
  | 'touchStart'
  | 'touchMove'
  | 'touchEnd'
  | 'touchCancel'

/**
 * Touch point
 */
export interface TouchPoint {
  x: number
  y: number
  radiusX?: number
  radiusY?: number
  force?: number
}

/**
 * Perform a tap gesture
 */
export async function performTap(
  deviceId: string,
  x: number,
  y: number,
  connectionManager: CDPConnectionManager | WebKitConnectionManager,
  duration: number = 50
): Promise<void> {
  console.log(`👆 [TouchGestures] Tap at (${x}, ${y})`)

  await dispatchTouchEvent(deviceId, 'touchStart', [{ x, y }], connectionManager)
  await delay(duration)
  await dispatchTouchEvent(deviceId, 'touchEnd', [{ x, y }], connectionManager)
}

/**
 * Perform a double tap gesture
 */
export async function performDoubleTap(
  deviceId: string,
  x: number,
  y: number,
  connectionManager: CDPConnectionManager | WebKitConnectionManager,
  tapDelay: number = 100
): Promise<void> {
  console.log(`👆👆 [TouchGestures] Double tap at (${x}, ${y})`)

  await performTap(deviceId, x, y, connectionManager)
  await delay(tapDelay)
  await performTap(deviceId, x, y, connectionManager)
}

/**
 * Perform a long press gesture
 */
export async function performLongPress(
  deviceId: string,
  x: number,
  y: number,
  connectionManager: CDPConnectionManager | WebKitConnectionManager,
  duration: number = 1000
): Promise<void> {
  console.log(`👆⏱️ [TouchGestures] Long press at (${x}, ${y}) for ${duration}ms`)

  await dispatchTouchEvent(deviceId, 'touchStart', [{ x, y }], connectionManager)
  await delay(duration)
  await dispatchTouchEvent(deviceId, 'touchEnd', [{ x, y }], connectionManager)
}

/**
 * Perform a swipe gesture
 */
export async function performSwipe(
  deviceId: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  duration: number = 500,
  connectionManager: CDPConnectionManager | WebKitConnectionManager
): Promise<void> {
  console.log(`👉 [TouchGestures] Swipe from (${startX}, ${startY}) to (${endX}, ${endY})`)

  const steps = Math.max(Math.floor(duration / 16), 10) // 60fps

  await dispatchTouchEvent(deviceId, 'touchStart', [{ x: startX, y: startY }], connectionManager)

  for (let i = 1; i < steps; i++) {
    const progress = i / steps
    const x = startX + (endX - startX) * progress
    const y = startY + (endY - startY) * progress

    await dispatchTouchEvent(deviceId, 'touchMove', [{ x, y }], connectionManager)
    await delay(16) // ~60fps
  }

  await dispatchTouchEvent(deviceId, 'touchEnd', [{ x: endX, y: endY }], connectionManager)
}

/**
 * Perform a swipe in a direction
 */
export async function performSwipeDirection(
  deviceId: string,
  direction: SwipeDirection,
  screenWidth: number,
  screenHeight: number,
  connectionManager: CDPConnectionManager | WebKitConnectionManager,
  distance: number = 0.6 // 60% of screen
): Promise<void> {
  let startX: number, startY: number, endX: number, endY: number

  const centerX = screenWidth / 2
  const centerY = screenHeight / 2

  switch (direction) {
    case 'up':
      startX = centerX
      startY = screenHeight * (1 - distance / 2)
      endX = centerX
      endY = screenHeight * distance / 2
      break

    case 'down':
      startX = centerX
      startY = screenHeight * distance / 2
      endX = centerX
      endY = screenHeight * (1 - distance / 2)
      break

    case 'left':
      startX = screenWidth * (1 - distance / 2)
      startY = centerY
      endX = screenWidth * distance / 2
      endY = centerY
      break

    case 'right':
      startX = screenWidth * distance / 2
      startY = centerY
      endX = screenWidth * (1 - distance / 2)
      endY = centerY
      break
  }

  await performSwipe(deviceId, startX, startY, endX, endY, 500, connectionManager)
}

/**
 * Perform a pinch gesture
 */
export async function performPinch(
  deviceId: string,
  centerX: number,
  centerY: number,
  type: PinchType,
  connectionManager: CDPConnectionManager | WebKitConnectionManager,
  scale: number = 2.0,
  duration: number = 500
): Promise<void> {
  console.log(`🤏 [TouchGestures] Pinch ${type} at (${centerX}, ${centerY}), scale: ${scale}`)

  const startDistance = type === 'zoom-out' ? 200 : 50
  const endDistance = type === 'zoom-out' ? 50 : 200

  const steps = Math.max(Math.floor(duration / 16), 10)

  // Calculate initial touch points
  const finger1StartX = centerX - startDistance / 2
  const finger1StartY = centerY
  const finger2StartX = centerX + startDistance / 2
  const finger2StartY = centerY

  const finger1EndX = centerX - endDistance / 2
  const finger1EndY = centerY
  const finger2EndX = centerX + endDistance / 2
  const finger2EndY = centerY

  // Start touches
  await dispatchTouchEvent(
    deviceId,
    'touchStart',
    [
      { x: finger1StartX, y: finger1StartY },
      { x: finger2StartX, y: finger2StartY }
    ],
    connectionManager
  )

  // Perform pinch
  for (let i = 1; i < steps; i++) {
    const progress = i / steps

    const finger1X = finger1StartX + (finger1EndX - finger1StartX) * progress
    const finger1Y = finger1StartY + (finger1EndY - finger1StartY) * progress
    const finger2X = finger2StartX + (finger2EndX - finger2StartX) * progress
    const finger2Y = finger2StartY + (finger2EndY - finger2StartY) * progress

    await dispatchTouchEvent(
      deviceId,
      'touchMove',
      [
        { x: finger1X, y: finger1Y },
        { x: finger2X, y: finger2Y }
      ],
      connectionManager
    )

    await delay(16)
  }

  // End touches
  await dispatchTouchEvent(
    deviceId,
    'touchEnd',
    [
      { x: finger1EndX, y: finger1EndY },
      { x: finger2EndX, y: finger2EndY }
    ],
    connectionManager
  )
}

/**
 * Perform a drag gesture
 */
export async function performDrag(
  deviceId: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  connectionManager: CDPConnectionManager | WebKitConnectionManager,
  duration: number = 1000
): Promise<void> {
  console.log(`🤚 [TouchGestures] Drag from (${startX}, ${startY}) to (${endX}, ${endY})`)

  // Drag is similar to swipe but slower
  await performSwipe(deviceId, startX, startY, endX, endY, duration, connectionManager)
}

/**
 * Perform a scroll gesture
 */
export async function performScroll(
  deviceId: string,
  direction: 'up' | 'down',
  screenWidth: number,
  screenHeight: number,
  connectionManager: CDPConnectionManager | WebKitConnectionManager,
  scrollAmount: number = 0.6
): Promise<void> {
  console.log(`📜 [TouchGestures] Scroll ${direction}`)

  const centerX = screenWidth / 2
  const startY = direction === 'down' ? screenHeight * 0.8 : screenHeight * 0.2
  const endY = direction === 'down' ? screenHeight * 0.2 : screenHeight * 0.8

  await performSwipe(deviceId, centerX, startY, centerX, endY, 500, connectionManager)
}

/**
 * Dispatch touch event via CDP or WebKit
 */
async function dispatchTouchEvent(
  deviceId: string,
  type: TouchEventType,
  touchPoints: TouchPoint[],
  connectionManager: CDPConnectionManager | WebKitConnectionManager
): Promise<void> {
  if (connectionManager instanceof CDPConnectionManager) {
    // Use CDP Input.dispatchTouchEvent
    await dispatchCDPTouchEvent(deviceId, type, touchPoints, connectionManager)
  } else {
    // Use WebKit touch simulation (limited)
    await dispatchWebKitTouchEvent(deviceId, type, touchPoints, connectionManager)
  }
}

/**
 * Dispatch touch event via CDP (Android)
 */
async function dispatchCDPTouchEvent(
  deviceId: string,
  type: TouchEventType,
  touchPoints: TouchPoint[],
  connectionManager: CDPConnectionManager
): Promise<void> {
  const connection = connectionManager.getConnection(deviceId)

  if (!connection) {
    throw new Error(`No CDP connection for device: ${deviceId}`)
  }

  // Map touch event type to CDP type
  const cdpType = mapTouchEventTypeToCDP(type)

  // Prepare touch points
  const touchPointsPayload = touchPoints.map((point, index) => ({
    x: Math.round(point.x),
    y: Math.round(point.y),
    radiusX: point.radiusX || 1,
    radiusY: point.radiusY || 1,
    force: point.force || 1,
    id: index
  }))

  try {
    await connection.client.Input.dispatchTouchEvent({
      type: cdpType,
      touchPoints: touchPointsPayload,
      modifiers: 0
    })
  } catch (error: any) {
    console.error(`📱 [TouchGestures] CDP touch event error:`, error)
    throw error
  }
}

/**
 * Dispatch touch event via WebKit (iOS - limited support)
 */
async function dispatchWebKitTouchEvent(
  deviceId: string,
  type: TouchEventType,
  touchPoints: TouchPoint[],
  connectionManager: WebKitConnectionManager
): Promise<void> {
  // WebKit has limited touch event support
  // Fallback to click events for basic taps

  if (type === 'touchStart' && touchPoints.length === 1) {
    const point = touchPoints[0]

    // Simulate click via JavaScript
    await connectionManager.executeJavaScript(
      deviceId,
      `
      (function() {
        const element = document.elementFromPoint(${point.x}, ${point.y});
        if (element) {
          element.click();
        }
      })()
      `
    )
  }

  // Multi-touch and complex gestures not supported on iOS
  if (touchPoints.length > 1) {
    console.warn('⚠️ [TouchGestures] Multi-touch not fully supported on iOS')
  }
}

/**
 * Map touch event type to CDP type
 */
function mapTouchEventTypeToCDP(type: TouchEventType): string {
  switch (type) {
    case 'touchStart':
      return 'touchStart'
    case 'touchMove':
      return 'touchMove'
    case 'touchEnd':
      return 'touchEnd'
    case 'touchCancel':
      return 'touchCancel'
  }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/**
 * Calculate angle between two points (in degrees)
 */
export function calculateAngle(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const radians = Math.atan2(y2 - y1, x2 - x1)
  return radians * (180 / Math.PI)
}

/**
 * Detect swipe direction from coordinates
 */
export function detectSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): SwipeDirection | null {
  const dx = endX - startX
  const dy = endY - startY

  const threshold = 30

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    return null // Not enough movement
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal swipe
    return dx > 0 ? 'right' : 'left'
  } else {
    // Vertical swipe
    return dy > 0 ? 'down' : 'up'
  }
}

/**
 * Generate bezier curve points for smooth gestures
 */
export function generateBezierPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  steps: number = 20
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []

  // Control points for cubic bezier (creates natural curve)
  const cp1x = startX + (endX - startX) * 0.25
  const cp1y = startY + (endY - startY) * 0.1
  const cp2x = startX + (endX - startX) * 0.75
  const cp2y = startY + (endY - startY) * 0.9

  for (let i = 0; i <= steps; i++) {
    const t = i / steps

    // Cubic bezier formula
    const x =
      Math.pow(1 - t, 3) * startX +
      3 * Math.pow(1 - t, 2) * t * cp1x +
      3 * (1 - t) * Math.pow(t, 2) * cp2x +
      Math.pow(t, 3) * endX

    const y =
      Math.pow(1 - t, 3) * startY +
      3 * Math.pow(1 - t, 2) * t * cp1y +
      3 * (1 - t) * Math.pow(t, 2) * cp2y +
      Math.pow(t, 3) * endY

    points.push({ x, y })
  }

  return points
}

/**
 * Perform a bezier swipe (more natural than linear)
 */
export async function performBezierSwipe(
  deviceId: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  connectionManager: CDPConnectionManager | WebKitConnectionManager,
  duration: number = 500
): Promise<void> {
  console.log(`👉🎨 [TouchGestures] Bezier swipe from (${startX}, ${startY}) to (${endX}, ${endY})`)

  const steps = Math.max(Math.floor(duration / 16), 10)
  const points = generateBezierPoints(startX, startY, endX, endY, steps)

  await dispatchTouchEvent(deviceId, 'touchStart', [points[0]], connectionManager)

  for (let i = 1; i < points.length - 1; i++) {
    await dispatchTouchEvent(deviceId, 'touchMove', [points[i]], connectionManager)
    await delay(16)
  }

  await dispatchTouchEvent(deviceId, 'touchEnd', [points[points.length - 1]], connectionManager)
}

/**
 * Perform a fling gesture (fast swipe)
 */
export async function performFling(
  deviceId: string,
  direction: SwipeDirection,
  screenWidth: number,
  screenHeight: number,
  connectionManager: CDPConnectionManager | WebKitConnectionManager
): Promise<void> {
  console.log(`🚀 [TouchGestures] Fling ${direction}`)

  // Fling is a fast swipe (shorter duration)
  await performSwipeDirection(
    deviceId,
    direction,
    screenWidth,
    screenHeight,
    connectionManager,
    0.8 // 80% of screen distance
  )
}

/**
 * Perform a multi-finger tap
 */
export async function performMultiFingerTap(
  deviceId: string,
  points: Array<{ x: number; y: number }>,
  connectionManager: CDPConnectionManager | WebKitConnectionManager,
  duration: number = 50
): Promise<void> {
  console.log(`👆✋ [TouchGestures] Multi-finger tap with ${points.length} fingers`)

  await dispatchTouchEvent(deviceId, 'touchStart', points, connectionManager)
  await delay(duration)
  await dispatchTouchEvent(deviceId, 'touchEnd', points, connectionManager)
}
