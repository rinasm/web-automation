/**
 * SDK Hierarchy Element Lookup Service
 *
 * Parses view hierarchy sent by iOS SDK to find best matching element.
 * This is INSTANT (no network delay) compared to WDA queries (56+ seconds).
 *
 * How it works:
 * 1. SDK sends full ancestor chain when user taps element
 * 2. Desktop filters ancestors that contain tap coordinates
 * 3. Apply scoring: Interactive elements > Containers, Smaller > Larger
 * 4. Return best scoring element with accessibility ID
 */

export interface HierarchyElement {
  className: string
  accessibilityIdentifier?: string
  bounds: { x: number; y: number; width: number; height: number }
  isInteractive: boolean
}

export interface SDKElementInfo {
  accessibilityId?: string
  className?: string
  elementType?: string
  bounds?: { x: number; y: number; width: number; height: number }
}

// Interactive element class names (prefer these)
const INTERACTIVE_PATTERNS = [
  'Button',
  'TextField',
  'SecureTextField',
  'Switch',
  'Slider',
  'SegmentedControl',
  'Link',
  'SearchField',
  'Stepper'
]

// Container class names (avoid these if possible)
const CONTAINER_PATTERNS = [
  'Other',
  'View',
  'ScrollView',
  'CollectionView',
  'TableView',
  'Cell',
  'Window',
  'Application',
  'HostingView' // SwiftUI container
]

/**
 * Calculate element priority score
 * Higher score = better match
 */
function calculateElementScore(element: HierarchyElement, depth: number): number {
  let score = 0

  // Prefer interactive elements
  const isInteractive = INTERACTIVE_PATTERNS.some(pattern => element.className.includes(pattern))
  if (isInteractive) {
    score += 100
    console.log(`   💯 Interactive element: +100`)
  }

  // Penalize container elements
  const isContainer = CONTAINER_PATTERNS.some(pattern => element.className.includes(pattern))
  if (isContainer) {
    score -= 50
    console.log(`   📦 Container element: -50`)
  }

  // Prefer elements with accessibility IDs
  if (element.accessibilityIdentifier && element.accessibilityIdentifier.length > 0) {
    score += 50
    console.log(`   🏷️  Has accessibility ID: +50`)
  }

  // Prefer smaller elements (more specific)
  const area = element.bounds.width * element.bounds.height
  if (area < 10000) {
    score += 30 // Small elements (< 100x100)
    console.log(`   📏 Small element (${area.toFixed(0)}): +30`)
  } else if (area < 50000) {
    score += 10 // Medium elements
    console.log(`   📏 Medium element (${area.toFixed(0)}): +10`)
  }

  // Prefer earlier in hierarchy (closer to tapped element)
  // Depth 0 = the view that was actually hit
  score += (50 - depth) // First element gets +50, second gets +49, etc.
  console.log(`   🔢 Depth bonus (depth ${depth}): +${50 - depth}`)

  // Prefer elements with user interaction enabled
  if (element.isInteractive) {
    score += 20
    console.log(`   👆 User interaction enabled: +20`)
  }

  return score
}

/**
 * Find best element at given coordinates using SDK hierarchy
 *
 * @param hierarchy - Array of ancestor elements from SDK
 * @param x - X coordinate from touch event
 * @param y - Y coordinate from touch event
 * @returns Element info with accessibility identifier if found
 */
export async function findElementInHierarchy(
  hierarchy: HierarchyElement[],
  x: number,
  y: number
): Promise<SDKElementInfo | null> {
  const startTime = Date.now()
  console.log(`🔍 [SDK Hierarchy] Finding element at coordinates (${x}, ${y})`)
  console.log(`🔍 [SDK Hierarchy] Analyzing ${hierarchy.length} ancestors`)

  if (!hierarchy || hierarchy.length === 0) {
    console.warn('⚠️ [SDK Hierarchy] No hierarchy provided')
    return null
  }

  // Filter elements that contain the tap coordinates
  const candidatesAtCoords: Array<{ element: HierarchyElement; depth: number; score: number }> = []

  for (let depth = 0; depth < hierarchy.length; depth++) {
    const element = hierarchy[depth]
    const bounds = element.bounds

    // Check if coordinates are within bounds
    const isWithinBounds =
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height

    if (isWithinBounds && element.accessibilityIdentifier) {
      const score = calculateElementScore(element, depth)
      const area = bounds.width * bounds.height

      console.log(`🎯 [SDK Hierarchy] Candidate at depth ${depth}:`)
      console.log(`   Class: ${element.className}`)
      console.log(`   ID: ${element.accessibilityIdentifier}`)
      console.log(`   Bounds: (${bounds.x}, ${bounds.y}, ${bounds.width}x${bounds.height})`)
      console.log(`   Area: ${area.toFixed(0)}`)
      console.log(`   Score: ${score}`)

      candidatesAtCoords.push({ element, depth, score })
    }
  }

  if (candidatesAtCoords.length === 0) {
    console.log(`❌ [SDK Hierarchy] No elements with accessibility ID found at (${x}, ${y})`)
    return null
  }

  // Sort by score (highest first)
  candidatesAtCoords.sort((a, b) => b.score - a.score)

  // Best match is highest scoring
  const best = candidatesAtCoords[0]
  const totalTime = Date.now() - startTime

  console.log(`✅ [SDK Hierarchy] Best match: ${best.element.accessibilityIdentifier}`)
  console.log(`   Type: ${best.element.className}`)
  console.log(`   Final score: ${best.score}`)
  console.log(`   Time: ${totalTime}ms`)

  return {
    accessibilityId: best.element.accessibilityIdentifier,
    className: best.element.className,
    elementType: best.element.className,
    bounds: best.element.bounds
  }
}
