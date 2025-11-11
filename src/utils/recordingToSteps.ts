/**
 * Recording to Steps Utility
 *
 * Converts recorded user interactions directly to test steps WITH selectors
 */

import { RecordedEvent } from './recordingToDescription'
import { GeneratedStep } from '../services/stepGenerationService'

/**
 * Remove redundant type events - keep only the last non-empty one for each selector before any non-type event
 */
function removeRedundantTypeEvents(events: RecordedEvent[]): RecordedEvent[] {
  console.log('🔧 [removeRedundantTypeEvents] Input:', events.length, 'events')

  const result: RecordedEvent[] = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // If this is a type event, check if there's another type event after it with the same selector
    if (event.type === 'type') {
      let hasLaterNonEmptyTypeEvent = false

      for (let j = i + 1; j < events.length; j++) {
        const laterEvent = events[j]

        // CRITICAL FIX: Stop checking if we encounter ANY non-type event
        // This prevents looking past button taps, which separates logical typing sequences
        if (laterEvent.type !== 'type') {
          console.log(`🔧 [removeRedundantTypeEvents] Event ${i} (type "${event.value}"): Found non-type event at ${j}, stopping search`)
          break
        }

        // If we find another type event on the same selector with non-empty value, this one is redundant
        if (laterEvent.type === 'type' &&
            laterEvent.selector === event.selector &&
            laterEvent.value &&
            laterEvent.value.trim() !== '') {
          console.log(`🔧 [removeRedundantTypeEvents] Event ${i} (type "${event.value}"): Found later non-empty type event at ${j} (value: "${laterEvent.value}"), skipping`)
          hasLaterNonEmptyTypeEvent = true
          break
        }
      }

      // Only keep this type event if there's no later non-empty one for the same selector
      // OR if this event has an empty value and should be filtered out anyway
      if (!hasLaterNonEmptyTypeEvent) {
        // ADDITIONAL FIX: Filter out type events with empty values
        if (!event.value || event.value.trim() === '') {
          console.log(`🔧 [removeRedundantTypeEvents] Event ${i}: Filtering out type event with empty value`)
        }
        // ADDITIONAL FIX: Filter out type events that are known placeholders
        // Common placeholder patterns to filter
        else if (event.value && (
          event.value.includes('placeholder') ||
          event.value.includes('Enter ') ||
          event.value.includes('Type ') ||
          event.value === 'Enter todo title'
        )) {
          console.log(`🔧 [removeRedundantTypeEvents] Event ${i}: Filtering out placeholder text: "${event.value}"`)
        } else {
          console.log(`🔧 [removeRedundantTypeEvents] Event ${i} (type "${event.value}"): Keeping (no later non-empty type)`)
          result.push(event)
        }
      }
    } else {
      // Keep all non-type events
      console.log(`🔧 [removeRedundantTypeEvents] Event ${i} (${event.type}): Keeping (non-type event)`)
      result.push(event)
    }
  }

  console.log('🔧 [removeRedundantTypeEvents] Output:', result.length, 'events (removed', events.length - result.length, ')')
  return result
}

/**
 * Synthesize tap events before type events when needed
 * This handles cases where tapping a text field immediately starts typing without a separate tap event
 */
function synthesizeMissingTapEvents(events: RecordedEvent[]): RecordedEvent[] {
  const result: RecordedEvent[] = []
  const tappedSelectors = new Set<string>()

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // Track taps
    if (event.type === 'tap' || event.type === 'click') {
      result.push(event)
      if (event.selector) {
        tappedSelectors.add(event.selector)
      }
    }
    // If this is a type event and we haven't tapped this selector yet, synthesize a tap
    else if (event.type === 'type' && event.selector && !tappedSelectors.has(event.selector)) {
      console.log(`🔧 [synthesizeMissingTapEvents] Event ${i}: Synthesizing tap before type on "${event.selector}"`)

      // Synthesize a tap event
      const syntheticTap: RecordedEvent = {
        type: 'tap',
        selector: event.selector,
        value: '',
        elementText: event.elementText,
        url: event.url
      }
      result.push(syntheticTap)
      tappedSelectors.add(event.selector)

      // Then add the type event
      result.push(event)
    }
    // Other events (swipe, etc.)
    else {
      result.push(event)
    }
  }

  console.log(`🔧 [synthesizeMissingTapEvents] Synthesized ${result.length - events.length} tap events`)
  return result
}

/**
 * Convert recorded events directly to steps (preserving selectors!)
 */
export function convertRecordingToSteps(events: RecordedEvent[]): GeneratedStep[] {
  if (events.length === 0) {
    return []
  }

  // Remove redundant type events - keep only the last one for each selector
  const cleanedEvents = removeRedundantTypeEvents(events)

  // Synthesize missing tap events before type events
  const eventsWithTaps = synthesizeMissingTapEvents(cleanedEvents)

  const steps: GeneratedStep[] = []
  let currentStep: GeneratedStep | null = null
  let stepCounter = 0

  for (const event of eventsWithTaps) {
    // Create action from event
    const action = {
      id: crypto.randomUUID(),
      type: event.type as any,
      selector: event.selector || '',
      value: event.value || '',
      isPassword: event.selector?.toLowerCase().includes('password') || false
    }

    // Group actions into logical steps (e.g., multiple actions on same page = one step)
    if (event.type === 'navigate' || !currentStep) {
      // Start new step
      if (currentStep) {
        steps.push(currentStep)
      }

      currentStep = {
        name: event.type === 'navigate'
          ? `Navigate to ${event.url || 'page'}`
          : `Step ${stepCounter + 1}`,
        actions: [action],
        order: stepCounter
      }
      stepCounter++
    } else {
      // Add to current step
      currentStep.actions.push(action)
    }
  }

  // Add last step
  if (currentStep) {
    steps.push(currentStep)
  }

  // Generate better names for steps based on actions
  return steps.map((step, index) => ({
    ...step,
    name: generateStepName(step.actions, index)
  }))
}

/**
 * Generate a readable step name from actions
 */
function generateStepName(actions: any[], index: number): string {
  if (actions.length === 0) {
    return `Step ${index + 1}`
  }

  // If first action is navigate, use that
  const navigateAction = actions.find(a => a.type === 'navigate')
  if (navigateAction) {
    return `Navigate to page`
  }

  // Otherwise, describe based on action types
  const clickActions = actions.filter(a => a.type === 'click' || a.type === 'tap')
  const typeActions = actions.filter(a => a.type === 'type')

  if (typeActions.length > 0 && clickActions.length > 0) {
    return `Fill form and submit`
  } else if (typeActions.length > 0) {
    return `Enter information`
  } else if (clickActions.length > 0) {
    return `Click elements`
  } else {
    return `Step ${index + 1}`
  }
}
