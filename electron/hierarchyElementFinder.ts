/**
 * Hierarchy Element Finder
 *
 * Recursively searches through iOS view hierarchy to find the actual
 * clickable element at given tap coordinates.
 *
 * Solves the problem of recording container views instead of actual buttons.
 */

export interface ViewNode {
  className: string
  memoryAddress: string
  frame: { x: number; y: number; width: number; height: number }
  accessibilityIdentifier?: string
  accessibilityLabel?: string
  accessibilityTraits: string[]
  userInteractionEnabled: boolean
  hidden: boolean
  alpha: number
  children: ViewNode[]
  parent?: ViewNode
  depth: number
  rawLine: string
}

export interface FindOptions {
  preferClickable?: boolean // Prefer buttons/controls over containers
  returnDeepest?: boolean   // Return deepest match instead of first match
}

/**
 * Parse iOS view hierarchy debug description into tree structure
 *
 * Input format:
 * <UIWindow: 0x14e354000>; frame = (0.0 0.0; 428.0 926.0); userInteractionEnabled = YES; alpha = 1.0;
 *   <UITransitionView: 0x14e3c4800>; frame = (0.0 0.0; 428.0 926.0); ...
 *     <UIView: 0x14ef70a80>; frame = (0.0 0.0; 428.0 827.3); ...
 *       <UIButton: 0x14e147c00>; frame = (20.0 141.0; 141.0 28.0); accessibilityIdentifier = 'homeConvertInstalments'; ...
 */
export function parseViewHierarchy(debugDescription: string): ViewNode | null {
  if (!debugDescription || debugDescription.trim().length === 0) {
    console.warn('⚠️ [HierarchyParser] Empty debug description')
    return null
  }

  const lines = debugDescription.split('\n').filter(line => line.trim().length > 0)

  if (lines.length === 0) {
    console.warn('⚠️ [HierarchyParser] No valid lines in debug description')
    return null
  }

  console.log(`🌳 [HierarchyParser] Parsing ${lines.length} lines...`)

  const root: ViewNode = {
    className: 'ROOT',
    memoryAddress: '0x0',
    frame: { x: 0, y: 0, width: 0, height: 0 },
    accessibilityTraits: [],
    userInteractionEnabled: true,
    hidden: false,
    alpha: 1.0,
    children: [],
    depth: -1,
    rawLine: ''
  }

  const stack: ViewNode[] = [root]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Calculate depth from leading spaces (2 spaces = 1 level)
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0
    const depth = Math.floor(leadingSpaces / 2)

    // Parse node from line
    const node = parseNode(line, depth)
    if (!node) {
      continue // Skip lines that don't parse (like accessibility elements)
    }

    // Adjust stack to current depth
    while (stack.length > depth + 1) {
      stack.pop()
    }

    // Get parent (current top of stack)
    const parent = stack[stack.length - 1]

    // Set parent reference
    node.parent = parent

    // Add as child to parent
    parent.children.push(node)

    // Push this node onto stack for potential children
    stack.push(node)
  }

  // Return the first actual view (not the synthetic root)
  if (root.children.length > 0) {
    const firstChild = root.children[0]
    console.log(`✅ [HierarchyParser] Parsed tree with root: ${firstChild.className}`)
    console.log(`   └─ Total nodes: ${countNodes(firstChild)}`)
    return firstChild
  }

  console.warn('⚠️ [HierarchyParser] No nodes parsed from debug description')
  return null
}

/**
 * Parse a single line into a ViewNode
 */
function parseNode(line: string, depth: number): ViewNode | null {
  // Extract className and memory address
  const classMatch = line.match(/<([^:]+):\s*(0x[0-9a-f]+)>/i)
  if (!classMatch) {
    return null // Not a valid view line
  }

  const className = classMatch[1].trim()
  const memoryAddress = classMatch[2]

  // Extract frame
  const frameMatch = line.match(/frame\s*=\s*\(([0-9.-]+)\s+([0-9.-]+);\s+([0-9.-]+)\s+([0-9.-]+)\)/)
  const frame = frameMatch
    ? {
        x: parseFloat(frameMatch[1]),
        y: parseFloat(frameMatch[2]),
        width: parseFloat(frameMatch[3]),
        height: parseFloat(frameMatch[4])
      }
    : { x: 0, y: 0, width: 0, height: 0 }

  // Extract accessibility identifier
  const accessibilityIdMatch = line.match(/accessibilityIdentifier\s*=\s*'([^']+)'/)
  const accessibilityIdentifier = accessibilityIdMatch?.[1]

  // Extract accessibility label
  const accessibilityLabelMatch = line.match(/accessibilityLabel\s*=\s*'([^']+)'/)
  const accessibilityLabel = accessibilityLabelMatch?.[1]

  // Extract accessibility traits
  const traitsMatch = line.match(/accessibilityTraits\s*=\s*\[([^\]]+)\]/)
  const accessibilityTraits = traitsMatch
    ? traitsMatch[1].split(',').map(t => t.trim())
    : []

  // Extract userInteractionEnabled
  const userInteractionEnabled = line.includes('userInteractionEnabled = YES')

  // Extract hidden
  const hidden = line.includes('hidden = YES')

  // Extract alpha
  const alphaMatch = line.match(/alpha\s*=\s*([0-9.]+)/)
  const alpha = alphaMatch ? parseFloat(alphaMatch[1]) : 1.0

  return {
    className,
    memoryAddress,
    frame,
    accessibilityIdentifier,
    accessibilityLabel,
    accessibilityTraits,
    userInteractionEnabled,
    hidden,
    alpha,
    children: [],
    depth,
    rawLine: line.trim()
  }
}

/**
 * Find the actual clickable element at the given coordinates
 *
 * Uses recursive depth-first search to find the deepest clickable element
 * that contains the tap coordinates.
 */
export function findElementAtCoordinates(
  root: ViewNode,
  x: number,
  y: number,
  options: FindOptions = {}
): ViewNode | null {
  const {
    preferClickable = true,
    returnDeepest = true
  } = options

  return findElementRecursive(root, x, y, { x: 0, y: 0 }, preferClickable, returnDeepest)
}

/**
 * Recursive helper for finding element at coordinates
 *
 * @param node Current node being checked
 * @param x Absolute X coordinate (screen space)
 * @param y Absolute Y coordinate (screen space)
 * @param parentOffset Accumulated offset from parent frames
 * @param preferClickable Prefer clickable elements over containers
 * @param returnDeepest Return deepest match instead of first match
 */
function findElementRecursive(
  node: ViewNode,
  x: number,
  y: number,
  parentOffset: { x: number; y: number },
  preferClickable: boolean,
  returnDeepest: boolean
): ViewNode | null {
  // Skip hidden or transparent elements
  if (node.hidden || node.alpha < 0.01) {
    return null
  }

  // Calculate absolute frame by adding parent offset
  const absoluteX = parentOffset.x + node.frame.x
  const absoluteY = parentOffset.y + node.frame.y

  // Check if coordinates are within this node's bounds
  const contains =
    x >= absoluteX &&
    x <= absoluteX + node.frame.width &&
    y >= absoluteY &&
    y <= absoluteY + node.frame.height

  if (!contains) {
    return null // Coordinates not in this node
  }

  // Search children first (depth-first for deepest match)
  let deepestMatch: ViewNode | null = null
  const newOffset = { x: absoluteX, y: absoluteY }

  for (const child of node.children) {
    const match = findElementRecursive(child, x, y, newOffset, preferClickable, returnDeepest)
    if (match) {
      deepestMatch = match
      // If we don't need the deepest match, return immediately
      if (!returnDeepest) {
        return match
      }
    }
  }

  // If found a child match, return it (it's deeper than current node)
  if (deepestMatch) {
    return deepestMatch
  }

  // No child matched, check if THIS node is suitable
  if (preferClickable) {
    // Only return if this node is clickable
    if (isClickable(node)) {
      return node
    }
    // Not clickable, don't return it
    return null
  }

  // Return this node (any match is acceptable)
  return node
}

/**
 * Check if a node is clickable
 *
 * Clickable elements include:
 * - UIButton
 * - UIControl (except text fields)
 * - Elements with button accessibility trait
 */
export function isClickable(node: ViewNode): boolean {
  // UIButton is always clickable
  if (node.className === 'UIButton') {
    return true
  }

  // UIControl subclasses (except text fields which are editable, not clickable)
  if (
    node.className.includes('UIControl') &&
    !node.className.includes('UITextField') &&
    !node.className.includes('UITextView')
  ) {
    return true
  }

  // Has button accessibility trait
  if (node.accessibilityTraits.includes('button')) {
    return true
  }

  // Tab bar buttons and similar
  if (
    node.className.includes('Button') &&
    node.userInteractionEnabled &&
    node.accessibilityIdentifier
  ) {
    return true
  }

  return false
}

/**
 * Helper: Count total nodes in tree
 */
function countNodes(node: ViewNode): number {
  let count = 1
  for (const child of node.children) {
    count += countNodes(child)
  }
  return count
}

/**
 * Helper: Print tree structure (for debugging)
 */
export function printTree(node: ViewNode, indent: number = 0): void {
  const spaces = '  '.repeat(indent)
  const clickable = isClickable(node) ? '🔘' : '  '
  const id = node.accessibilityIdentifier || '(no id)'

  console.log(
    `${spaces}${clickable} ${node.className} - ${id} - frame(${node.frame.x}, ${node.frame.y}, ${node.frame.width}, ${node.frame.height})`
  )

  for (const child of node.children) {
    printTree(child, indent + 1)
  }
}

/**
 * Helper: Find all clickable elements in tree
 */
export function findAllClickableElements(node: ViewNode): ViewNode[] {
  const clickable: ViewNode[] = []

  if (isClickable(node)) {
    clickable.push(node)
  }

  for (const child of node.children) {
    clickable.push(...findAllClickableElements(child))
  }

  return clickable
}

/**
 * Helper: Get absolute frame for a node (including all parent offsets)
 */
export function getAbsoluteFrame(node: ViewNode): { x: number; y: number; width: number; height: number } {
  let x = node.frame.x
  let y = node.frame.y

  let current = node.parent
  while (current) {
    x += current.frame.x
    y += current.frame.y
    current = current.parent
  }

  return {
    x,
    y,
    width: node.frame.width,
    height: node.frame.height
  }
}
