/**
 * Generate an XPath expression for a given element
 * Tries to create a unique and stable XPath selector
 */
export function getXPathForElement(element: Element): string {
  // If element has an ID, use it (most stable)
  if (element.id) {
    return `//*[@id="${element.id}"]`
  }

  // Try to use unique attributes
  const uniqueAttrs = ['data-testid', 'data-test', 'name', 'aria-label']
  for (const attr of uniqueAttrs) {
    const value = element.getAttribute(attr)
    if (value) {
      return `//${element.tagName.toLowerCase()}[@${attr}="${value}"]`
    }
  }

  // Build path from root
  const paths: string[] = []
  let currentElement: Element | null = element

  while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
    let index = 0
    let sibling: Element | null = currentElement.previousElementSibling

    // Count preceding siblings of the same tag
    while (sibling) {
      if (sibling.tagName === currentElement.tagName) {
        index++
      }
      sibling = sibling.previousElementSibling
    }

    const tagName = currentElement.tagName.toLowerCase()
    const pathIndex = index > 0 ? `[${index + 1}]` : ''

    // Add classes if available (for better readability)
    const classes = currentElement.className
    if (classes && typeof classes === 'string' && classes.trim()) {
      const classNames = classes.trim().split(/\s+/).slice(0, 2).join('.')
      paths.unshift(`${tagName}[@class="${classNames}"]${pathIndex}`)
    } else {
      paths.unshift(tagName + pathIndex)
    }

    currentElement = currentElement.parentElement
  }

  return '//' + paths.join('/')
}

/**
 * Generate a CSS selector for a given element (alternative to XPath)
 */
export function getCssSelectorForElement(element: Element): string {
  if (element.id) {
    return `#${element.id}`
  }

  const path: string[] = []
  let current: Element | null = element

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector += `#${current.id}`
      path.unshift(selector)
      break
    } else {
      let sibling: Element | null = current
      let nth = 1

      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling
        if (sibling.tagName.toLowerCase() === selector) {
          nth++
        }
      }

      if (nth > 1) {
        selector += `:nth-of-type(${nth})`
      }
    }

    path.unshift(selector)
    current = current.parentElement
  }

  return path.join(' > ')
}
