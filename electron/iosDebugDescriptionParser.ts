/**
 * iOS debugDescription Parser
 *
 * Parses window.debugDescription string from iOS SDK to find elements at coordinates.
 * INSTANT element lookup - NO WDA network calls required!
 *
 * Example debugDescription format:
 * <UIWindow: 0x...>; frame = (0 0; 428 926); ...
 *    | <UIView: 0x...>; frame = (0 0; 428 926); ...
 *    |    | <UIButton: 0x...>; frame = (20 100; 100 44); accessibilityIdentifier = 'loginButton'; ...
 */

export interface ParsedElement {
  className: string
  memoryAddress: string
  frame: { x: number; y: number; width: number; height: number }
  accessibilityIdentifier?: string
  accessibilityLabel?: string
  depth: number
  isInteractive: boolean
}

/**
 * Parse iOS window.debugDescription to extract all elements
 */
export function parseDebugDescription(debugDescription: string): ParsedElement[] {
  const elements: ParsedElement[] = []
  const lines = debugDescription.split('\n')

  for (const line of lines) {
    const element = parseLine(line)
    if (element) {
      elements.push(element)
    }
  }

  return elements
}

/**
 * Parse a single line from debugDescription
 */
function parseLine(line: string): ParsedElement | null {
  // Count leading pipes and spaces to determine depth
  const depthMatch = line.match(/^(\s*\|?\s*)/)
  if (!depthMatch) return null

  const leadingWhitespace = depthMatch[1]
  const depth = (leadingWhitespace.match(/\|/g) || []).length

  // Extract class name and memory address: <UIButton: 0x7f8e8c60f890>
  const classMatch = line.match(/<([A-Za-z0-9_]+):\s*(0x[0-9a-f]+)>/)
  if (!classMatch) return null

  const className = classMatch[1]
  const memoryAddress = classMatch[2]

  // Extract frame: frame = (x y; width height)
  const frameMatch = line.match(/frame = \((-?[\d.]+)\s+(-?[\d.]+);\s+(-?[\d.]+)\s+(-?[\d.]+)\)/)
  if (!frameMatch) return null

  const frame = {
    x: parseFloat(frameMatch[1]),
    y: parseFloat(frameMatch[2]),
    width: parseFloat(frameMatch[3]),
    height: parseFloat(frameMatch[4])
  }

  // Extract accessibilityIdentifier: accessibilityIdentifier = 'loginButton'
  const accessibilityIdMatch = line.match(/accessibilityIdentifier\s*=\s*'([^']*)'/)
  const accessibilityId = accessibilityIdMatch ? accessibilityIdMatch[1] : undefined

  // Extract accessibilityLabel: accessibilityLabel = 'Login'
  const accessibilityLabelMatch = line.match(/accessibilityLabel\s*=\s*'([^']*)'/)
  const accessibilityLabel = accessibilityLabelMatch ? accessibilityLabelMatch[1] : undefined

  // Determine if interactive (buttons, text fields, etc. are interactive)
  const isInteractive = /Button|TextField|SecureTextField|Switch|Slider|SegmentedControl/.test(className)

  return {
    className,
    memoryAddress,
    frame,
    accessibilityIdentifier: accessibilityId,
    accessibilityLabel,
    depth,
    isInteractive
  }
}

/**
 * Find element at given coordinates from parsed elements
 */
export function findElementAtCoordinates(
  elements: ParsedElement[],
  x: number,
  y: number
): ParsedElement | null {
  console.log(`🔍 [iOS Parser] Finding element at (${x}, ${y})`)
  console.log(`🔍 [iOS Parser] Analyzing ${elements.length} elements`)

  // Filter elements that contain the coordinates
  const candidates = elements.filter(el => {
    const { frame } = el
    return (
      x >= frame.x &&
      x <= frame.x + frame.width &&
      y >= frame.y &&
      y <= frame.y + frame.height &&
      el.accessibilityIdentifier // Only consider elements with accessibility IDs
    )
  })

  if (candidates.length === 0) {
    console.log(`❌ [iOS Parser] No elements with accessibility ID found at (${x}, ${y})`)
    return null
  }

  console.log(`🎯 [iOS Parser] Found ${candidates.length} candidates`)

  // Score each candidate
  const scored = candidates.map(el => ({
    element: el,
    score: scoreElement(el)
  }))

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score)

  // Log candidates
  for (const { element, score } of scored) {
    console.log(`   📌 ${element.className} "${element.accessibilityIdentifier}" - score: ${score}`)
  }

  const best = scored[0]
  console.log(`✅ [iOS Parser] Best match: ${best.element.accessibilityIdentifier} (score: ${best.score})`)

  return best.element
}

/**
 * Score an element (higher = better match)
 */
function scoreElement(element: ParsedElement): number {
  let score = 0

  // Prefer interactive elements
  if (element.isInteractive) {
    score += 100
  }

  // Prefer elements with accessibility IDs
  if (element.accessibilityIdentifier) {
    score += 50
  }

  // Prefer smaller elements (more specific)
  const area = element.frame.width * element.frame.height
  if (area < 10000) {
    score += 30 // Small elements
  } else if (area < 50000) {
    score += 10 // Medium elements
  }

  // Prefer shallower depth (closer to foreground)
  score += (50 - element.depth)

  return score
}

/**
 * Main function: Parse debugDescription and find element at coordinates
 */
export function findElementInDebugDescription(
  debugDescription: string,
  x: number,
  y: number
): { accessibilityId: string; className: string } | null {
  const startTime = Date.now()

  console.log(`🚀 [iOS Parser] Parsing debugDescription (${debugDescription.length} characters)`)

  const elements = parseDebugDescription(debugDescription)
  const element = findElementAtCoordinates(elements, x, y)

  const elapsed = Date.now() - startTime
  console.log(`⏱️  [iOS Parser] Total time: ${elapsed}ms`)

  if (!element || !element.accessibilityIdentifier) {
    return null
  }

  return {
    accessibilityId: element.accessibilityIdentifier,
    className: element.className
  }
}
