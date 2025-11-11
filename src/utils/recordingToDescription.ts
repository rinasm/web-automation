/**
 * Recording to Description Utility
 *
 * Converts recorded user interactions to natural language description
 */

import { claudeService } from '../services/claudeService'

export interface RecordedEvent {
  type: 'click' | 'type' | 'navigate' | 'scroll' | 'tap' | 'swipe'
  selector?: string
  value?: string
  url?: string
  timestamp: number
  elementText?: string
}

/**
 * Generate natural language description from recorded events
 */
export function generateDescriptionFromRecording(events: RecordedEvent[]): string {
  if (events.length === 0) {
    return ''
  }

  const descriptions: string[] = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const elementInfo = event.elementText ? `"${event.elementText}"` : event.selector || 'element'

    switch (event.type) {
      case 'navigate':
        descriptions.push(`Navigate to ${event.url}`)
        break

      case 'click':
      case 'tap':
        descriptions.push(`Click ${elementInfo}`)
        break

      case 'type':
        if (event.value) {
          // Check if it's a password field (hide value)
          const isPassword = event.selector?.includes('password') || event.selector?.includes('pwd')
          const displayValue = isPassword ? '********' : `"${event.value}"`
          descriptions.push(`Enter ${displayValue} into ${elementInfo}`)
        } else {
          descriptions.push(`Type into ${elementInfo}`)
        }
        break

      case 'scroll':
        descriptions.push(`Scroll page`)
        break

      case 'swipe':
        descriptions.push(`Swipe on ${elementInfo}`)
        break

      default:
        descriptions.push(`Interact with ${elementInfo}`)
    }
  }

  // Join with commas and add period at end
  return descriptions.join(', ') + '.'
}

/**
 * Generate a proper feature description using AI
 */
export async function generateProperDescription(events: RecordedEvent[]): Promise<string> {
  if (events.length === 0) {
    return ''
  }

  // Build a list of actions for the AI to analyze
  const actionsList = events.map((event, index) => {
    const elementInfo = event.elementText || event.selector || 'element'
    let action = ''

    switch (event.type) {
      case 'navigate':
        action = `Navigate to ${event.url}`
        break
      case 'click':
      case 'tap':
        action = `Click on ${elementInfo}`
        break
      case 'type':
        const isPassword = event.selector?.includes('password') || event.selector?.includes('pwd')
        const value = isPassword ? '[password]' : event.value ? `"${event.value}"` : ''
        action = `Type ${value} into ${elementInfo}`
        break
      case 'scroll':
        action = 'Scroll the page'
        break
      case 'swipe':
        action = `Swipe on ${elementInfo}`
        break
      default:
        action = `Interact with ${elementInfo}`
    }

    return `${index + 1}. ${action}`
  }).join('\n')

  const prompt = `Given these user actions recorded from a test scenario:

${actionsList}

Generate a concise, professional feature description (1-2 sentences) that describes what the user is trying to accomplish. Focus on the business goal, not the technical steps.

Examples:
- Actions: "Click login button, Enter email, Enter password, Click submit" → "User logs into the application with email and password"
- Actions: "Click add to cart, Enter quantity, Click checkout" → "User adds a product to cart and proceeds to checkout"
- Actions: "Click search, Type query, Click search button, Click first result" → "User searches for content and views the search results"

Respond with ONLY the description, no extra text.`

  try {
    const response = await claudeService.sendMessage([
      { role: 'user', content: prompt }
    ])
    return response.content.trim()
  } catch (error) {
    console.error('Failed to generate AI description:', error)
    // Fallback to simple concatenation
    return generateDescriptionFromRecording(events)
  }
}

/**
 * Get a human-readable selector description
 */
export function getSelectorDescription(selector: string): string {
  // Extract meaningful parts from selector
  // Example: #email-input → "email input"
  // Example: button[type="submit"] → "submit button"

  if (selector.startsWith('#')) {
    const id = selector.slice(1).replace(/-/g, ' ').replace(/_/g, ' ')
    return id
  }

  if (selector.startsWith('.')) {
    const className = selector.slice(1).replace(/-/g, ' ').replace(/_/g, ' ')
    return className
  }

  // For XPath or complex selectors, just return as is
  return selector
}

/**
 * Remove duplicate consecutive events
 * Example: Click #btn, Click #btn, Click #btn → Click #btn (once)
 */
export function removeDuplicates(events: RecordedEvent[]): RecordedEvent[] {
  if (events.length === 0) return []

  const deduplicated: RecordedEvent[] = []
  let lastEvent: RecordedEvent | null = null

  for (const event of events) {
    // Skip if exact duplicate of last event (same type + selector)
    if (lastEvent &&
        lastEvent.type === event.type &&
        lastEvent.selector === event.selector &&
        lastEvent.type !== 'type') { // Don't skip typing events
      continue
    }

    deduplicated.push(event)
    lastEvent = event
  }

  return deduplicated
}

/**
 * Group consecutive similar events
 * Example: Type 'h', Type 'e', Type 'l', Type 'l', Type 'o' → Type 'hello'
 */
export function groupSimilarEvents(events: RecordedEvent[]): RecordedEvent[] {
  if (events.length === 0) return []

  const grouped: RecordedEvent[] = []
  let currentGroup: RecordedEvent | null = null

  for (const event of events) {
    if (!currentGroup) {
      currentGroup = { ...event }
      continue
    }

    // If same type and same selector, group them
    if (
      event.type === 'type' &&
      currentGroup.type === 'type' &&
      event.selector === currentGroup.selector
    ) {
      // Use the latest value (don't combine)
      currentGroup.value = event.value
      currentGroup.timestamp = event.timestamp
    } else {
      // Different event, save current group and start new one
      grouped.push(currentGroup)
      currentGroup = { ...event }
    }
  }

  // Don't forget the last group
  if (currentGroup) {
    grouped.push(currentGroup)
  }

  return grouped
}

/**
 * Main function to convert recording to description with grouping
 * Returns a Promise for AI-generated description
 */
export async function convertRecordingToDescription(events: RecordedEvent[]): Promise<string> {
  // First remove duplicates
  const deduplicated = removeDuplicates(events)

  // Then group similar events (especially typing)
  const groupedEvents = groupSimilarEvents(deduplicated)

  // Generate proper AI description
  return await generateProperDescription(groupedEvents)
}

/**
 * Synchronous version for backward compatibility
 */
export function convertRecordingToDescriptionSync(events: RecordedEvent[]): string {
  // First remove duplicates
  const deduplicated = removeDuplicates(events)

  // Then group similar events (especially typing)
  const groupedEvents = groupSimilarEvents(deduplicated)

  // Generate simple description
  return generateDescriptionFromRecording(groupedEvents)
}
