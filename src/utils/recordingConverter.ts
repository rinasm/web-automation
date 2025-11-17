/**
 * Recording Converter
 *
 * Converts recorded events to test step format compatible with existing flow store
 */

import { RecordedEvent, RecordedFlow } from '../store/recordingStore'
import { Action } from '../store/flowStore'

/**
 * Get the best selector for an element
 * Prioritizes accessibilityId over xpath
 */
function getElementSelector(
  element?: {
    accessibilityId?: string
    xpath?: string
  },
  fallbackCoordinates?: string
): string {
  if (!element) {
    return fallbackCoordinates || ''
  }

  // ALWAYS prefer accessibilityId if available (much faster and more reliable!)
  if (element.accessibilityId && element.accessibilityId.trim() !== '') {
    return element.accessibilityId
  }

  // Fall back to xpath only if no accessibilityId
  if (element.xpath && element.xpath.trim() !== '') {
    return element.xpath
  }

  // Last resort: use coordinates
  return fallbackCoordinates || ''
}

/**
 * Convert recorded event to test step
 */
export function convertEventToStep(event: RecordedEvent, index: number): Action {
  const stepId = `step-${Date.now()}-${index}`

  // Base step structure
  const baseStep: Partial<Action> = {
    id: stepId,
    timestamp: event.timestamp
  }

  const coordinateFallback = `coordinates:${event.coordinates.x},${event.coordinates.y}`

  switch (event.gestureType) {
    case 'tap':
    case 'doubleTap':
      const tapSelector = getElementSelector(event.element, coordinateFallback)
      console.log(`🔄 [convertEventToStep] Tap event #${index}: selector="${tapSelector}"`)
      return {
        ...baseStep,
        type: 'click',
        selector: tapSelector,
        value: '',
        description: event.description || `Tap at (${event.coordinates.x}, ${event.coordinates.y})`
      } as Action

    case 'longPress':
      return {
        ...baseStep,
        type: 'click',
        selector: getElementSelector(event.element, coordinateFallback),
        value: 'longPress',
        description: event.description || `Long press at (${event.coordinates.x}, ${event.coordinates.y})`
      } as Action

    case 'type':
      const typeSelector = getElementSelector(event.element)
      const typeValue = event.value || ''
      console.log(`🔄 [convertEventToStep] Type event #${index}:`, {
        selector: typeSelector,
        value: typeValue,
        hasElement: !!event.element,
        hasId: !!event.element?.accessibilityId,
        hasXpath: !!event.element?.xpath,
        elementDetails: event.element ? {
          accessibilityId: event.element.accessibilityId,
          xpath: event.element.xpath,
          className: event.element.className
        } : null
      })
      return {
        ...baseStep,
        type: 'type',
        selector: typeSelector,
        value: typeValue,
        description: event.description || `Type "${typeValue}"`
      } as Action

    case 'swipe':
      return {
        ...baseStep,
        type: 'swipe',
        selector: '',
        value: '', // Keep value empty for swipe
        swipeDirection: event.swipeDirection || 'up',
        swipeDistance: event.swipeDistance,
        description:
          event.description ||
          `Swipe ${event.swipeDirection} (${Math.round(event.swipeDistance || 0)}px)`
      } as Action

    case 'scroll':
      return {
        ...baseStep,
        type: 'scroll',
        selector: getElementSelector(event.element),
        value: '', // Keep value empty for scroll
        swipeDirection: event.swipeDirection || 'down',
        swipeDistance: event.swipeDistance,
        description:
          event.description ||
          `Scroll ${event.swipeDirection} (${Math.round(event.swipeDistance || 0)}px)`
      } as Action

    default:
      // Default to click for unknown gestures
      return {
        ...baseStep,
        type: 'click',
        selector: getElementSelector(event.element, coordinateFallback),
        value: '',
        description: event.description || 'Unknown action'
      } as Action
  }
}

/**
 * Convert multiple recorded events to test steps
 */
export function convertEventsToSteps(events: RecordedEvent[]): Action[] {
  return events.map((event, index) => convertEventToStep(event, index))
}

/**
 * Convert recorded flow to flow format
 */
export interface ConvertedFlow {
  id: string
  name: string
  description?: string
  steps: Action[]
  createdAt: number
  updatedAt: number
  platform: 'ios' | 'android'
  deviceName: string
}

export function convertRecordedFlowToFlow(recordedFlow: RecordedFlow): ConvertedFlow {
  return {
    id: recordedFlow.id,
    name: recordedFlow.name,
    description: recordedFlow.description,
    steps: convertEventsToSteps(recordedFlow.events),
    createdAt: recordedFlow.createdAt,
    updatedAt: recordedFlow.updatedAt,
    platform: recordedFlow.platform,
    deviceName: recordedFlow.deviceName
  }
}

/**
 * Optimize recorded steps (remove redundant actions, merge similar steps)
 */
export function optimizeRecordedSteps(steps: Action[]): Action[] {
  if (steps.length === 0) return steps

  console.log(`🔄 [optimizeRecordedSteps] Input: ${steps.length} steps`)

  const optimized: Action[] = []
  let lastStep: Action | null = null

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    // Skip if identical to last step (debouncing)
    if (lastStep && areStepsSimilar(lastStep, step)) {
      console.log(`🔄 [optimizeRecordedSteps] Step ${i} (${step.type}) skipped - similar to last`)
      continue
    }

    // Merge consecutive type actions on same element
    if (
      lastStep &&
      lastStep.type === 'type' &&
      step.type === 'type' &&
      lastStep.selector === step.selector
    ) {
      console.log(`🔄 [optimizeRecordedSteps] Step ${i} (type "${step.value}") merged with previous type (selector: "${step.selector}")`)
      // Only update value if new value is non-empty (keep last non-empty value)
      // This prevents losing text when keyboard is dismissed (which sends empty value)
      if (step.value && step.value.trim() !== '') {
        lastStep.value = step.value
        console.log(`🔄 [optimizeRecordedSteps] Updated type value to: "${step.value}"`)
      } else {
        console.log(`🔄 [optimizeRecordedSteps] Skipped empty value, keeping: "${lastStep.value}"`)
      }
      continue
    }

    // Merge consecutive scroll actions in same direction
    if (
      lastStep &&
      lastStep.type === 'scroll' &&
      step.type === 'scroll' &&
      lastStep.value === step.value
    ) {
      console.log(`🔄 [optimizeRecordedSteps] Step ${i} (scroll) merged with previous scroll`)
      // Keep only the last scroll
      continue
    }

    console.log(`🔄 [optimizeRecordedSteps] Step ${i} kept: ${step.type} → ${step.selector || 'no selector'} (value: "${step.value}")`)
    optimized.push(step)
    lastStep = step
  }

  console.log(`🔄 [optimizeRecordedSteps] Output: ${optimized.length} steps (removed ${steps.length - optimized.length})`)
  return optimized
}

/**
 * Check if two steps are similar (for deduplication)
 */
function areStepsSimilar(step1: Action, step2: Action): boolean {
  if (step1.type !== step2.type) {
    return false
  }

  if (step1.selector !== step2.selector) {
    return false
  }

  // For clicks, consider similar if within 500ms and same location
  if (step1.type === 'click' && step2.type === 'click') {
    const timeDiff = Math.abs((step2.timestamp || 0) - (step1.timestamp || 0))
    return timeDiff < 500
  }

  return false
}

/**
 * Generate human-readable flow summary
 */
export function generateFlowSummary(events: RecordedEvent[]): string {
  if (events.length === 0) {
    return 'Empty flow'
  }

  const taps = events.filter(e => e.gestureType === 'tap').length
  const types = events.filter(e => e.gestureType === 'type').length
  const swipes = events.filter(e => e.gestureType === 'swipe').length
  const scrolls = events.filter(e => e.gestureType === 'scroll').length

  const parts: string[] = []

  if (taps > 0) parts.push(`${taps} tap${taps > 1 ? 's' : ''}`)
  if (types > 0) parts.push(`${types} input${types > 1 ? 's' : ''}`)
  if (swipes > 0) parts.push(`${swipes} swipe${swipes > 1 ? 's' : ''}`)
  if (scrolls > 0) parts.push(`${scrolls} scroll${scrolls > 1 ? 's' : ''}`)

  return parts.join(', ')
}

/**
 * Estimate flow execution time
 */
export function estimateExecutionTime(events: RecordedEvent[]): number {
  if (events.length === 0) return 0

  // Base time per action
  let totalTime = 0

  for (const event of events) {
    switch (event.gestureType) {
      case 'tap':
      case 'doubleTap':
        totalTime += 500 // 500ms per tap
        break

      case 'longPress':
        totalTime += 1000 // 1s for long press
        break

      case 'type':
        const charCount = event.value?.length || 0
        totalTime += 100 + charCount * 50 // 100ms base + 50ms per character
        break

      case 'swipe':
      case 'scroll':
        totalTime += 800 // 800ms for swipe/scroll
        break

      default:
        totalTime += 300
    }

    // Add wait time between actions
    totalTime += 300
  }

  return totalTime
}

/**
 * Validate recorded flow (check for issues)
 */
export interface FlowValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
}

export function validateRecordedFlow(events: RecordedEvent[]): FlowValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  if (events.length === 0) {
    errors.push('Flow has no events')
    return { isValid: false, warnings, errors }
  }

  // Check for missing selectors
  const eventsWithoutSelectors = events.filter(
    e =>
      (e.gestureType === 'tap' || e.gestureType === 'type') &&
      !e.element?.accessibilityId &&
      !e.element?.xpath &&
      !e.coordinates
  )

  if (eventsWithoutSelectors.length > 0) {
    warnings.push(
      `${eventsWithoutSelectors.length} event(s) have no selector and may use coordinate-based actions`
    )
  }

  // Check for very quick successive taps (possible double-taps)
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1]
    const curr = events[i]

    if (
      prev.gestureType === 'tap' &&
      curr.gestureType === 'tap' &&
      curr.timestamp - prev.timestamp < 100
    ) {
      warnings.push(`Events ${i} and ${i + 1} are very close in time (possible duplicate)`)
    }
  }

  // Check flow length
  if (events.length > 100) {
    warnings.push('Flow is very long (>100 events). Consider breaking into smaller flows.')
  }

  // Check for type events without values
  const typeEventsWithoutValue = events.filter(e => e.gestureType === 'type' && !e.value)

  if (typeEventsWithoutValue.length > 0) {
    warnings.push(`${typeEventsWithoutValue.length} type event(s) have no value`)
  }

  const isValid = errors.length === 0

  return { isValid, warnings, errors }
}

/**
 * Export flow as Appium test code (for iOS/Android)
 */
export function exportAsAppiumCode(recordedFlow: RecordedFlow): string {
  const steps = convertEventsToSteps(recordedFlow.events)
  const platform = recordedFlow.platform

  let code = `// Generated Appium test for ${recordedFlow.name}\n`
  code += `// Platform: ${platform.toUpperCase()}\n`
  code += `// Device: ${recordedFlow.deviceName}\n`
  code += `// Generated: ${new Date().toLocaleString()}\n\n`

  code += `const { remote } = require('webdriverio');\n\n`

  code += `async function ${toCamelCase(recordedFlow.name)}Test() {\n`
  code += `  const driver = await remote({\n`
  code += `    capabilities: {\n`
  code += `      platformName: '${platform === 'ios' ? 'iOS' : 'Android'}',\n`
  code += `      'appium:automationName': '${platform === 'ios' ? 'XCUITest' : 'UiAutomator2'}'\n`
  code += `    }\n`
  code += `  });\n\n`

  code += `  try {\n`

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    code += `    // Step ${i + 1}: ${step.description || step.type}\n`

    switch (step.type) {
      case 'click':
        if (step.selector.startsWith('coordinates:')) {
          const coords = step.selector.replace('coordinates:', '').split(',')
          code += `    await driver.touchAction({ action: 'tap', x: ${coords[0]}, y: ${coords[1]} });\n`
        } else {
          code += `    const element${i} = await driver.$('${escapeSingleQuotes(step.selector)}');\n`
          code += `    await element${i}.click();\n`
        }
        break

      case 'type':
        code += `    const element${i} = await driver.$('${escapeSingleQuotes(step.selector)}');\n`
        code += `    await element${i}.setValue('${escapeSingleQuotes(step.value)}');\n`
        break

      case 'swipe':
      case 'scroll':
        code += `    await driver.executeScript('mobile: swipe', { direction: '${step.value}' });\n`
        break

      case 'wait':
        code += `    await driver.pause(${step.value || 1000});\n`
        break
    }

    code += `\n`
  }

  code += `    console.log('Test completed successfully');\n`
  code += `  } catch (error) {\n`
  code += `    console.error('Test failed:', error);\n`
  code += `  } finally {\n`
  code += `    await driver.deleteSession();\n`
  code += `  }\n`
  code += `}\n\n`

  code += `${toCamelCase(recordedFlow.name)}Test();\n`

  return code
}

/**
 * Helper: Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, chr => chr.toLowerCase())
}

/**
 * Helper: Escape single quotes in string
 */
function escapeSingleQuotes(str: string): string {
  return str.replace(/'/g, "\\'")
}

/**
 * Get element center point from bounds or fallback to coordinates
 */
function getElementCenter(
  element?: { bounds?: { x: number; y: number; width: number; height: number } },
  coordinates?: { x: number; y: number }
): { x: number; y: number } | null {
  // If we have bounds, calculate center
  if (element?.bounds) {
    return {
      x: element.bounds.x + element.bounds.width / 2,
      y: element.bounds.y + element.bounds.height / 2
    }
  }

  // Fallback to tap coordinates
  if (coordinates) {
    return coordinates
  }

  return null
}

/**
 * Calculate distance between two points
 */
function calculateDistance(
  point1: { x: number; y: number } | null,
  point2: { x: number; y: number } | null
): number {
  if (!point1 || !point2) return Infinity

  const dx = point2.x - point1.x
  const dy = point2.y - point1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Replace XPath selectors with accessibilityIds from subsequent events with matching coordinates
 *
 * This is a smart post-processing step that fixes the timing issue where:
 * - Event 1 (tap): XPath (text field not scanned yet)
 * - Event 2 (type): XPath (before keyboard notification)
 * - Event 3 (type): accessibilityId (after keyboard scanned text fields)
 *
 * We use Event 3's identifier to fix Events 1 & 2!
 */
export function replaceXPathWithIdentifiers(events: RecordedEvent[]): RecordedEvent[] {
  const optimized = [...events]
  let fixedCount = 0

  for (let i = 0; i < optimized.length; i++) {
    const event = optimized[i]

    // Skip if already has identifier
    if (event.element?.accessibilityId) continue

    // Skip if no xpath (coordinates-only or no element)
    if (!event.element?.xpath) continue

    // Calculate center of this event's element
    const center = getElementCenter(event.element, event.coordinates)
    if (!center) continue

    console.log(
      `🔍 [XPath Fix] Event ${i} has xpath, looking for matching identifier... center: (${Math.round(center.x)}, ${Math.round(center.y)})`
    )

    // Look ahead 2-5 events for matching coordinates with identifier
    const lookAheadLimit = Math.min(i + 5, optimized.length)
    let foundMatch = false

    for (let j = i + 1; j < lookAheadLimit; j++) {
      const nextEvent = optimized[j]

      // Only consider events with accessibilityId
      if (!nextEvent.element?.accessibilityId) continue

      // Calculate center of next event's element
      const nextCenter = getElementCenter(nextEvent.element, nextEvent.coordinates)
      if (!nextCenter) continue

      // Check if centers match (within 10px tolerance)
      const distance = calculateDistance(center, nextCenter)

      console.log(
        `  👉 Comparing with Event ${j} (${nextEvent.element.accessibilityId}): distance = ${Math.round(distance)}px`
      )

      if (distance < 10) {
        // MATCH FOUND! Replace xpath with identifier
        console.log(
          `  ✅ [XPath Fix] Event ${i}: Replacing xpath with '${nextEvent.element.accessibilityId}' (distance: ${Math.round(distance)}px)`
        )

        event.element.accessibilityId = nextEvent.element.accessibilityId
        event.element.xpath = undefined // Remove xpath
        fixedCount++
        foundMatch = true
        break
      }
    }

    if (!foundMatch) {
      console.log(`  ⚠️ [XPath Fix] Event ${i}: No matching identifier found, keeping xpath`)
    }
  }

  if (fixedCount > 0) {
    console.log(`🎯 [XPath Fix] Fixed ${fixedCount} event(s) by replacing xpath with identifiers!`)
  }

  return optimized
}
