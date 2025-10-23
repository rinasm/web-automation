import { InteractableElement } from './flowExtractor'

// Social media patterns
const SOCIAL_MEDIA_PATTERNS = [
  /facebook|fb-|twitter|tweet|linkedin|instagram|youtube|pinterest|reddit|tiktok/i,
  /share-|social-share|social-media/i,
  /follow-us|connect-with/i
]

// Cookie/consent patterns
const COOKIE_PATTERNS = [
  /cookie|gdpr|consent|privacy-notice|data-protection/i,
  /accept-cookie|cookie-banner|cookie-policy/i
]

// Chat/support widget patterns
const CHAT_PATTERNS = [
  /chat|intercom|zendesk|tawk|livechat|support-widget|help-center/i,
  /customer-support|contact-support|live-support/i
]

// Footer utility patterns
const FOOTER_UTILITY_PATTERNS = [
  /privacy-policy|terms-of-service|terms-and-conditions|sitemap/i,
  /copyright|all-rights-reserved|legal-notice/i,
  /contact-us|about-us|careers|press/i
]

// Advertisement patterns
const AD_PATTERNS = [
  /advertisement|ad-container|ad-banner|ad-slot|sponsored/i,
  /google-ad|doubleclick|adsense/i
]

// Navigation/menu utility patterns (duplicates)
const NAV_UTILITY_PATTERNS = [
  /skip-|skip-to|skip-navigation/i,
  /breadcrumb|back-to-top|scroll-to-top/i,
  /language-selector|currency-selector/i
]

/**
 * Check if element text/attributes contain noise patterns
 */
function matchesNoisePattern(element: InteractableElement, patterns: RegExp[]): boolean {
  const searchText = [
    element.text,
    element.selector,
    element.type
  ].join(' ').toLowerCase()

  return patterns.some(pattern => pattern.test(searchText))
}

/**
 * Check if element is a social media button
 */
export function isSocialMediaButton(element: InteractableElement): boolean {
  return matchesNoisePattern(element, SOCIAL_MEDIA_PATTERNS)
}

/**
 * Check if element is part of cookie consent banner
 */
export function isCookieBanner(element: InteractableElement): boolean {
  return matchesNoisePattern(element, COOKIE_PATTERNS)
}

/**
 * Check if element is a chat widget
 */
export function isChatWidget(element: InteractableElement): boolean {
  return matchesNoisePattern(element, CHAT_PATTERNS)
}

/**
 * Check if element is footer utility link
 */
export function isFooterUtility(element: InteractableElement): boolean {
  // Check if in footer based on selector
  const inFooter = /footer|foot-/i.test(element.selector)
  const matchesPattern = matchesNoisePattern(element, FOOTER_UTILITY_PATTERNS)

  return inFooter && matchesPattern
}

/**
 * Check if element is an advertisement
 */
export function isAdvertisement(element: InteractableElement): boolean {
  return matchesNoisePattern(element, AD_PATTERNS)
}

/**
 * Check if element is navigation utility (skip links, breadcrumbs)
 */
export function isNavigationUtility(element: InteractableElement): boolean {
  return matchesNoisePattern(element, NAV_UTILITY_PATTERNS)
}

/**
 * Check if element is external link (outside main domain)
 */
export function isExternalLink(element: InteractableElement, currentDomain?: string): boolean {
  if (element.tagName !== 'A' || !currentDomain) return false

  // Check if href contains different domain
  const hrefMatch = element.selector.match(/href="([^"]+)"/)
  if (!hrefMatch) return false

  const href = hrefMatch[1]

  // External if starts with http:// or https:// and doesn't include current domain
  return /^https?:\/\//.test(href) && !href.includes(currentDomain)
}

/**
 * Main noise filter - returns true if element should be filtered out
 */
export function isNoise(element: InteractableElement, options?: {
  currentDomain?: string
  includeExternalLinks?: boolean
}): boolean {
  // Check all noise patterns
  if (isSocialMediaButton(element)) return true
  if (isCookieBanner(element)) return true
  if (isChatWidget(element)) return true
  if (isFooterUtility(element)) return true
  if (isAdvertisement(element)) return true
  if (isNavigationUtility(element)) return true

  // Optionally filter external links
  if (!options?.includeExternalLinks && isExternalLink(element, options?.currentDomain)) {
    return true
  }

  return false
}

/**
 * Filter out noise elements from array
 */
export function filterNoise(elements: InteractableElement[], options?: {
  currentDomain?: string
  includeExternalLinks?: boolean
}): InteractableElement[] {
  return elements.filter(element => !isNoise(element, options))
}

/**
 * Get statistics about filtered elements
 */
export function getFilterStats(elements: InteractableElement[], filtered: InteractableElement[]) {
  const total = elements.length
  const kept = filtered.length
  const removed = total - kept
  const removalRate = total > 0 ? (removed / total) * 100 : 0

  return {
    total,
    kept,
    removed,
    removalRate: Math.round(removalRate)
  }
}
