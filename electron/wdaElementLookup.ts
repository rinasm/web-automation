/**
 * WebDriverAgent Element Lookup Service
 *
 * Queries WebDriverAgent to find element information at given coordinates.
 * This solves the iOS SDK limitation where hitTest returns UIKit wrapper views
 * without accessibility identifiers.
 *
 * How it works:
 * 1. SDK sends tap coordinates (e.g., 276, 513)
 * 2. Desktop queries WDA: "What element is at these coordinates?"
 * 3. WDA returns XML hierarchy with bounds and accessibility IDs
 * 4. Parse XML to find element at coordinates
 * 5. Return accessibility identifier for accurate selectors
 */

import { parseStringPromise } from 'xml2js'

export interface WDAElementInfo {
  accessibilityId?: string
  label?: string
  elementType?: string
  bounds?: { x: number; y: number; width: number; height: number }
  value?: string
}

// Interactive element types (prefer these)
const INTERACTIVE_TYPES = [
  'XCUIElementTypeButton',
  'XCUIElementTypeTextField',
  'XCUIElementTypeSecureTextField',
  'XCUIElementTypeSwitch',
  'XCUIElementTypeSlider',
  'XCUIElementTypeSegmentedControl',
  'XCUIElementTypeLink',
  'XCUIElementTypeSearchField'
]

// Container types (avoid these if possible)
const CONTAINER_TYPES = [
  'XCUIElementTypeOther',
  'XCUIElementTypeView',
  'XCUIElementTypeScrollView',
  'XCUIElementTypeCollectionView',
  'XCUIElementTypeTableView',
  'XCUIElementTypeCell',
  'XCUIElementTypeWindow',
  'XCUIElementTypeApplication'
]

/**
 * Calculate element priority score
 * Higher score = better match
 */
function calculateElementScore(element: any): number {
  let score = 0

  // Prefer interactive types
  if (INTERACTIVE_TYPES.includes(element.type)) {
    score += 100
  }

  // Penalize container types
  if (CONTAINER_TYPES.includes(element.type)) {
    score -= 50
  }

  // Prefer elements with accessibility IDs
  if (element.name || element.identifier) {
    score += 50
  }

  // Prefer smaller elements (more specific)
  const area = element.bounds.width * element.bounds.height
  if (area < 10000) score += 30 // Small elements (< 100x100)
  else if (area < 50000) score += 10 // Medium elements

  // Prefer deeper elements (more specific)
  score += element.depth * 5

  return score
}

/**
 * Find element at given coordinates using WebDriverAgent
 *
 * @param sessionId - Active Appium/WDA session ID
 * @param x - X coordinate from touch event
 * @param y - Y coordinate from touch event
 * @returns Element info with accessibility identifier if found
 */
export async function findElementAtCoordinates(
  sessionId: string,
  x: number,
  y: number
): Promise<WDAElementInfo | null> {
  const startTime = Date.now()
  console.log(`🔍 [WDA Lookup] Finding element at coordinates (${x}, ${y})`)

  try {
    // Get page source XML from WebDriverAgent
    const fetchStart = Date.now()
    const pageSource = await getPageSource(sessionId)
    const fetchTime = Date.now() - fetchStart
    console.log(`⏱️  [WDA Lookup] Page source fetched in ${fetchTime}ms`)

    if (!pageSource) {
      console.warn('⚠️ [WDA Lookup] No page source returned')
      return null
    }

    // Parse XML to find element at coordinates
    const parseStart = Date.now()
    const elementInfo = await parseXMLForElement(pageSource, x, y)
    const parseTime = Date.now() - parseStart
    console.log(`⏱️  [WDA Lookup] XML parsed in ${parseTime}ms`)

    const totalTime = Date.now() - startTime

    if (elementInfo?.accessibilityId) {
      console.log(`✅ [WDA Lookup] Found element: ${elementInfo.accessibilityId} (type: ${elementInfo.elementType}) in ${totalTime}ms`)
      return elementInfo
    } else {
      console.log(`❌ [WDA Lookup] No element with accessibility ID found at (${x}, ${y}) (took ${totalTime}ms)`)
      return null
    }

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [WDA Lookup] Error finding element after ${totalTime}ms:`, error.message)
    return null
  }
}

/**
 * Get page source XML from WebDriverAgent
 */
async function getPageSource(sessionId: string): Promise<string | null> {
  try {
    const fetch = require('node-fetch')
    const appiumUrl = 'http://127.0.0.1:4723'

    console.log(`📡 [WDA Lookup] Fetching page source for session ${sessionId}`)

    const response = await fetch(`${appiumUrl}/session/${sessionId}/source`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ [WDA Lookup] Failed to get page source:', data)
      return null
    }

    return data.value

  } catch (error: any) {
    console.error('❌ [WDA Lookup] Page source fetch error:', error.message)
    return null
  }
}

/**
 * Parse XML hierarchy to find element at given coordinates
 *
 * XML structure from WDA:
 * <XCUIElementTypeApplication>
 *   <XCUIElementTypeButton name="loginButton" x="100" y="200" width="120" height="44"/>
 *   <XCUIElementTypeTextField name="emailField" x="50" y="300" width="300" height="40"/>
 * </XCUIElementTypeApplication>
 */
async function parseXMLForElement(
  xml: string,
  targetX: number,
  targetY: number
): Promise<WDAElementInfo | null> {
  try {
    // Parse XML to JavaScript object
    const result = await parseStringPromise(xml, {
      explicitArray: false,
      mergeAttrs: true
    })

    console.log(`📄 [WDA Lookup] Parsing XML hierarchy...`)

    // Find element by recursively traversing the tree
    const element = findElementInTree(result, targetX, targetY)

    if (!element) {
      console.log(`❌ [WDA Lookup] No element found at (${targetX}, ${targetY})`)
      return null
    }

    // Extract element info
    const elementInfo: WDAElementInfo = {
      accessibilityId: element.name || element.identifier || undefined,
      label: element.label || undefined,
      elementType: element.type || undefined,
      value: element.value || undefined,
      bounds: element.bounds
    }

    return elementInfo

  } catch (error: any) {
    console.error('❌ [WDA Lookup] XML parsing error:', error.message)
    return null
  }
}

/**
 * Recursively traverse XML tree to find element at coordinates
 *
 * WebDriverAgent XML attributes:
 * - name: accessibility identifier
 * - label: accessibility label
 * - x, y, width, height: element bounds
 * - type: element type (XCUIElementTypeButton, etc.)
 */
function findElementInTree(
  node: any,
  targetX: number,
  targetY: number,
  depth: number = 0
): any | null {
  if (!node) return null

  // Extract bounds from node
  const x = parseFloat(node.x)
  const y = parseFloat(node.y)
  const width = parseFloat(node.width)
  const height = parseFloat(node.height)

  // Check if coordinates are within bounds
  const isWithinBounds =
    !isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height) &&
    targetX >= x && targetX <= (x + width) &&
    targetY >= y && targetY <= (y + height)

  let bestMatch: any = null
  let bestScore = -Infinity

  // If this node matches and has an accessibility identifier, it's a candidate
  if (isWithinBounds && (node.name || node.identifier)) {
    const candidate = {
      name: node.name || node.identifier,
      label: node.label,
      type: node.type,
      value: node.value,
      bounds: { x, y, width, height },
      depth
    }

    const score = calculateElementScore(candidate)

    const isInteractive = INTERACTIVE_TYPES.includes(node.type)
    const isContainer = CONTAINER_TYPES.includes(node.type)
    const area = width * height

    console.log(`🎯 [WDA Lookup] Candidate depth ${depth}: ${candidate.name} (type: ${node.type}, area: ${area.toFixed(0)}, score: ${score}) ${isInteractive ? '⭐ INTERACTIVE' : isContainer ? '📦 CONTAINER' : ''}`)

    bestMatch = candidate
    bestScore = score
  }

  // Recursively search children
  // Children can be in various properties depending on XML structure
  const childKeys = Object.keys(node).filter(key =>
    typeof node[key] === 'object' &&
    key !== 'bounds' &&
    !['x', 'y', 'width', 'height', 'name', 'label', 'type', 'value', 'identifier'].includes(key)
  )

  for (const key of childKeys) {
    const children = Array.isArray(node[key]) ? node[key] : [node[key]]

    for (const child of children) {
      const childMatch = findElementInTree(child, targetX, targetY, depth + 1)

      // Prefer higher scoring elements (interactive > containers, smaller > larger, deeper > shallower)
      if (childMatch) {
        const childScore = calculateElementScore(childMatch)

        if (childScore > bestScore) {
          console.log(`   ⬆️  Better match found: ${childMatch.name} (score: ${childScore} > ${bestScore})`)
          bestMatch = childMatch
          bestScore = childScore
        }
      }
    }
  }

  return bestMatch
}
