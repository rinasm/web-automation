export interface InteractableElement {
  type: string
  selector: string
  text: string
  tagName: string
  eventListeners: string[]
  // Extended context for journey detection
  parentForm?: string // XPath to parent form
  associatedLabel?: string // Label text
  inputType?: string // For inputs: email, password, text, etc.
  placeholder?: string // Placeholder text
  ariaLabel?: string // ARIA label
  name?: string // Element name attribute
  id?: string // Element ID
  className?: string // Element classes
  value?: string // Current value
  required?: boolean // Is field required
  position?: { x: number; y: number; width: number; height: number } // Bounding box
  surroundingText?: string // Text content near element
  href?: string // For links
  options?: string[] // For SELECT elements: available option values
  // Mobile-specific properties
  isTouchEnabled?: boolean // Element has touch event listeners
  isVisible?: boolean // Element is visible in viewport
}

export class FlowExtractor {
  private webview: any

  constructor(webview: any) {
    this.webview = webview
  }

  /**
   * Extract all interactable elements by detecting event listeners
   */
  async extractInteractableElements(): Promise<InteractableElement[]> {
    const script = `
      (function() {
        const interactableElements = [];
        const getXPath = ${getXPathForElement.toString()};

        // Get all elements in the DOM
        const allElements = document.querySelectorAll('*');
        const seen = new Set();

        // Event types we're looking for
        const eventTypes = ['click', 'mousedown', 'mouseup', 'dblclick', 'contextmenu'];

        allElements.forEach(el => {
          // Skip hidden elements
          if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') return;

          const detectedEvents = [];

          // Check for event listeners using getEventListeners (Chrome DevTools API)
          // This won't work in production, so we also check for onclick attributes
          if (typeof getEventListeners !== 'undefined') {
            const listeners = getEventListeners(el);
            eventTypes.forEach(eventType => {
              if (listeners[eventType] && listeners[eventType].length > 0) {
                detectedEvents.push(eventType);
              }
            });
          }

          // Check for inline event handlers
          eventTypes.forEach(eventType => {
            const attrName = 'on' + eventType;
            if (el.hasAttribute(attrName) || el[attrName]) {
              if (!detectedEvents.includes(eventType)) {
                detectedEvents.push(eventType);
              }
            }
          });

          // Check for common interactive elements (they likely have event listeners added programmatically)
          const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
          const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'];
          const hasInteractiveRole = el.getAttribute('role') && interactiveRoles.includes(el.getAttribute('role'));
          const isInteractiveTag = interactiveTags.includes(el.tagName);

          // Include element if it has detected events OR is an interactive element
          if (detectedEvents.length > 0 || isInteractiveTag || hasInteractiveRole || el.hasAttribute('tabindex')) {
            const xpath = getXPath(el);
            if (seen.has(xpath)) return;
            seen.add(xpath);

            // If no events detected yet but it's an interactive element, assume click
            if (detectedEvents.length === 0 && (isInteractiveTag || hasInteractiveRole)) {
              detectedEvents.push('click');
            }

            const text = el.textContent?.trim().substring(0, 100) ||
                         el.getAttribute('aria-label') ||
                         el.getAttribute('title') ||
                         el.getAttribute('placeholder') ||
                         el.getAttribute('value') ||
                         el.tagName;

            let type = 'element';
            if (el.tagName === 'A') type = 'link';
            else if (el.tagName === 'BUTTON') type = 'button';
            else if (el.tagName === 'INPUT') type = 'input';
            else if (el.tagName === 'SELECT') type = 'select';
            else if (hasInteractiveRole) type = el.getAttribute('role');

            // Find parent form
            let parentForm = null;
            let parent = el.parentElement;
            while (parent) {
              if (parent.tagName === 'FORM') {
                parentForm = getXPath(parent);
                break;
              }
              parent = parent.parentElement;
            }

            // Find associated label
            let associatedLabel = null;
            if (el.id) {
              const label = document.querySelector(\`label[for="\${el.id}"]\`);
              if (label) {
                associatedLabel = label.textContent?.trim();
              }
            }
            // Also check for label as parent
            if (!associatedLabel && el.parentElement?.tagName === 'LABEL') {
              associatedLabel = el.parentElement.textContent?.trim();
            }

            // Get surrounding text (text from nearby elements)
            let surroundingText = '';
            const prevSibling = el.previousElementSibling;
            const nextSibling = el.nextElementSibling;
            if (prevSibling) surroundingText += prevSibling.textContent?.trim().substring(0, 50) || '';
            if (nextSibling) surroundingText += ' ' + (nextSibling.textContent?.trim().substring(0, 50) || '');

            // Get bounding box for proximity calculations
            const rect = el.getBoundingClientRect();
            const position = {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            };

            // Extract options for SELECT elements (native and Material UI)
            let options = undefined;
            if (el.tagName === 'SELECT') {
              // Native HTML select
              options = Array.from(el.options || []).map(opt => opt.text || opt.value).filter(Boolean);
            } else if (el.tagName === 'MAT-SELECT' || el.hasAttribute('mat-select') || (typeof el.className === 'string' && el.className.includes('mat-select'))) {
              // Material UI select - mark as select type
              type = 'select';
              // Options will be populated after clicking to open dropdown
              options = [];
            }

            interactableElements.push({
              type,
              selector: xpath,
              text: text,
              tagName: el.tagName,
              eventListeners: detectedEvents,
              parentForm,
              associatedLabel,
              inputType: el.type || undefined,
              placeholder: el.getAttribute('placeholder') || undefined,
              ariaLabel: el.getAttribute('aria-label') || undefined,
              name: el.getAttribute('name') || undefined,
              id: el.id || undefined,
              className: el.className || undefined,
              value: el.value || undefined,
              required: el.hasAttribute('required'),
              position,
              surroundingText: surroundingText.trim() || undefined,
              href: el.getAttribute('href') || undefined,
              options
            });
          }
        });

        return interactableElements;
      })();
    `

    try {
      const elements = await this.webview.executeJavaScript(script)
      return elements || []
    } catch (error) {
      console.error('Error extracting interactable elements:', error)
      return []
    }
  }

  /**
   * Highlight an element in the webview
   */
  async highlightElement(selector: string, highlight: boolean): Promise<void> {
    const script = `
      (function() {
        // Remove any existing highlights
        const existingHighlight = document.getElementById('__flow_extractor_highlight__');
        if (existingHighlight) {
          existingHighlight.remove();
        }

        if (${highlight}) {
          try {
            const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const el = result.singleNodeValue;

            if (el) {
              // Scroll element into view
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });

              // Create highlight overlay
              const rect = el.getBoundingClientRect();
              const highlight = document.createElement('div');
              highlight.id = '__flow_extractor_highlight__';
              highlight.style.position = 'fixed';
              highlight.style.left = rect.left + 'px';
              highlight.style.top = rect.top + 'px';
              highlight.style.width = rect.width + 'px';
              highlight.style.height = rect.height + 'px';
              highlight.style.border = '3px solid #4F46E5';
              highlight.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
              highlight.style.pointerEvents = 'none';
              highlight.style.zIndex = '999999';
              highlight.style.borderRadius = '4px';
              highlight.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.2)';

              document.body.appendChild(highlight);
            }
          } catch (e) {
            console.error('Highlight error:', e);
          }
        }
      })();
    `

    try {
      await this.webview.executeJavaScript(script)
    } catch (error) {
      console.error('Error highlighting element:', error)
    }
  }
}

// XPath helper function
function getXPathForElement(element: Element): string {
  if (element.id !== '') {
    return `//*[@id="${element.id}"]`
  }
  if (element === document.body) {
    return '/html/body'
  }

  let ix = 0
  const siblings = element.parentNode?.children
  if (siblings) {
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i]
      if (sibling === element) {
        const parentPath = element.parentNode ? getXPathForElement(element.parentNode as Element) : ''
        return `${parentPath}/${element.tagName.toLowerCase()}[${ix + 1}]`
      }
      if (sibling.tagName === element.tagName) {
        ix++
      }
    }
  }
  return ''
}

/**
 * Mobile Flow Extractor
 *
 * Extracts interactable elements from mobile devices via CDP or WebKit
 */
export class MobileFlowExtractor {
  private deviceId: string
  private connectionManager: any

  constructor(deviceId: string, connectionManager: any) {
    this.deviceId = deviceId
    this.connectionManager = connectionManager
  }

  /**
   * Extract all interactable elements from mobile DOM
   */
  async extractInteractableElements(): Promise<InteractableElement[]> {
    const script = `
      (function() {
        const interactableElements = [];
        const getXPath = ${getXPathForElement.toString()};

        // Get all elements in the DOM
        const allElements = document.querySelectorAll('*');
        const seen = new Set();

        // Event types we're looking for (including touch events)
        const eventTypes = ['click', 'mousedown', 'mouseup', 'dblclick', 'touchstart', 'touchend', 'touchmove'];

        allElements.forEach(el => {
          // Skip hidden elements
          if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') return;

          const detectedEvents = [];
          let isTouchEnabled = false;

          // Check for event listeners
          if (typeof getEventListeners !== 'undefined') {
            const listeners = getEventListeners(el);
            eventTypes.forEach(eventType => {
              if (listeners[eventType] && listeners[eventType].length > 0) {
                detectedEvents.push(eventType);
                if (eventType.startsWith('touch')) {
                  isTouchEnabled = true;
                }
              }
            });
          }

          // Check for inline event handlers
          eventTypes.forEach(eventType => {
            const attrName = 'on' + eventType;
            if (el.hasAttribute(attrName) || el[attrName]) {
              if (!detectedEvents.includes(eventType)) {
                detectedEvents.push(eventType);
              }
              if (eventType.startsWith('touch')) {
                isTouchEnabled = true;
              }
            }
          });

          // Check for common interactive elements
          const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
          const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'];
          const hasInteractiveRole = el.getAttribute('role') && interactiveRoles.includes(el.getAttribute('role'));
          const isInteractiveTag = interactiveTags.includes(el.tagName);

          // Include element if it has detected events OR is an interactive element
          if (detectedEvents.length > 0 || isInteractiveTag || hasInteractiveRole || el.hasAttribute('tabindex')) {
            const xpath = getXPath(el);
            if (seen.has(xpath)) return;
            seen.add(xpath);

            // If no events detected yet but it's an interactive element, assume click
            if (detectedEvents.length === 0 && (isInteractiveTag || hasInteractiveRole)) {
              detectedEvents.push('click');
            }

            const text = el.textContent?.trim().substring(0, 100) ||
                         el.getAttribute('aria-label') ||
                         el.getAttribute('title') ||
                         el.getAttribute('placeholder') ||
                         el.getAttribute('value') ||
                         el.tagName;

            let type = 'element';
            if (el.tagName === 'A') type = 'link';
            else if (el.tagName === 'BUTTON') type = 'button';
            else if (el.tagName === 'INPUT') type = 'input';
            else if (el.tagName === 'SELECT') type = 'select';
            else if (hasInteractiveRole) type = el.getAttribute('role');

            // Find parent form
            let parentForm = null;
            let parent = el.parentElement;
            while (parent) {
              if (parent.tagName === 'FORM') {
                parentForm = getXPath(parent);
                break;
              }
              parent = parent.parentElement;
            }

            // Find associated label
            let associatedLabel = null;
            if (el.id) {
              const label = document.querySelector(\`label[for="\${el.id}"]\`);
              if (label) {
                associatedLabel = label.textContent?.trim();
              }
            }
            if (!associatedLabel && el.parentElement?.tagName === 'LABEL') {
              associatedLabel = el.parentElement.textContent?.trim();
            }

            // Get surrounding text
            let surroundingText = '';
            const prevSibling = el.previousElementSibling;
            const nextSibling = el.nextElementSibling;
            if (prevSibling) surroundingText += prevSibling.textContent?.trim().substring(0, 50) || '';
            if (nextSibling) surroundingText += ' ' + (nextSibling.textContent?.trim().substring(0, 50) || '');

            // Get bounding box
            const rect = el.getBoundingClientRect();
            const position = {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            };

            // Check if element is visible in viewport
            const isVisible = (
              rect.width > 0 &&
              rect.height > 0 &&
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
              rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );

            // Extract options for SELECT elements (native and Material UI)
            let options = undefined;
            if (el.tagName === 'SELECT') {
              // Native HTML select
              options = Array.from(el.options || []).map(opt => opt.text || opt.value).filter(Boolean);
            } else if (el.tagName === 'MAT-SELECT' || el.hasAttribute('mat-select') || (typeof el.className === 'string' && el.className.includes('mat-select'))) {
              // Material UI select - mark as select type
              type = 'select';
              // Options will be populated after clicking to open dropdown
              options = [];
            }

            interactableElements.push({
              type,
              selector: xpath,
              text: text,
              tagName: el.tagName,
              eventListeners: detectedEvents,
              parentForm,
              associatedLabel,
              inputType: el.type || undefined,
              placeholder: el.getAttribute('placeholder') || undefined,
              ariaLabel: el.getAttribute('aria-label') || undefined,
              name: el.getAttribute('name') || undefined,
              id: el.id || undefined,
              className: el.className || undefined,
              value: el.value || undefined,
              required: el.hasAttribute('required'),
              position,
              surroundingText: surroundingText.trim() || undefined,
              href: el.getAttribute('href') || undefined,
              options,
              isTouchEnabled,
              isVisible
            });
          }
        });

        return interactableElements;
      })();
    `

    try {
      const elements = await this.connectionManager.executeJavaScript(this.deviceId, script)
      console.log(`📱 [MobileFlowExtractor] Extracted ${elements?.length || 0} interactable elements`)
      return elements || []
    } catch (error) {
      console.error('📱 [MobileFlowExtractor] Error extracting elements:', error)
      return []
    }
  }

  /**
   * Highlight an element on mobile device
   */
  async highlightElement(selector: string, highlight: boolean): Promise<void> {
    const script = `
      (function() {
        // Remove any existing highlights
        const existingHighlight = document.getElementById('__mobile_flow_extractor_highlight__');
        if (existingHighlight) {
          existingHighlight.remove();
        }

        if (${highlight}) {
          try {
            const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const el = result.singleNodeValue;

            if (el) {
              // Scroll element into view
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });

              // Create highlight overlay
              const rect = el.getBoundingClientRect();
              const highlight = document.createElement('div');
              highlight.id = '__mobile_flow_extractor_highlight__';
              highlight.style.position = 'fixed';
              highlight.style.left = rect.left + 'px';
              highlight.style.top = rect.top + 'px';
              highlight.style.width = rect.width + 'px';
              highlight.style.height = rect.height + 'px';
              highlight.style.border = '4px solid #10B981';
              highlight.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
              highlight.style.pointerEvents = 'none';
              highlight.style.zIndex = '999999';
              highlight.style.borderRadius = '8px';
              highlight.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';

              document.body.appendChild(highlight);

              // Auto-remove after 3 seconds
              setTimeout(() => {
                highlight.remove();
              }, 3000);
            }
          } catch (e) {
            console.error('Mobile highlight error:', e);
          }
        }
      })();
    `

    try {
      await this.connectionManager.executeJavaScript(this.deviceId, script)
    } catch (error) {
      console.error('📱 [MobileFlowExtractor] Error highlighting element:', error)
    }
  }

  /**
   * Get element at coordinates (for touch events)
   */
  async getElementAtPoint(x: number, y: number): Promise<InteractableElement | null> {
    const script = `
      (function() {
        const getXPath = ${getXPathForElement.toString()};
        const el = document.elementFromPoint(${x}, ${y});

        if (!el) return null;

        const xpath = getXPath(el);
        const rect = el.getBoundingClientRect();

        return {
          type: el.tagName.toLowerCase(),
          selector: xpath,
          text: el.textContent?.trim().substring(0, 100) || el.tagName,
          tagName: el.tagName,
          eventListeners: [],
          inputType: el.type || undefined,
          placeholder: el.getAttribute('placeholder') || undefined,
          ariaLabel: el.getAttribute('aria-label') || undefined,
          name: el.getAttribute('name') || undefined,
          id: el.id || undefined,
          className: el.className || undefined,
          position: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          },
          isVisible: true
        };
      })();
    `

    try {
      const element = await this.connectionManager.executeJavaScript(this.deviceId, script)
      return element
    } catch (error) {
      console.error('📱 [MobileFlowExtractor] Error getting element at point:', error)
      return null
    }
  }

  /**
   * Get viewport dimensions
   */
  async getViewportDimensions(): Promise<{ width: number; height: number }> {
    const script = `
      (function() {
        return {
          width: window.innerWidth || document.documentElement.clientWidth,
          height: window.innerHeight || document.documentElement.clientHeight
        };
      })();
    `

    try {
      const dimensions = await this.connectionManager.executeJavaScript(this.deviceId, script)
      return dimensions || { width: 0, height: 0 }
    } catch (error) {
      console.error('📱 [MobileFlowExtractor] Error getting viewport dimensions:', error)
      return { width: 0, height: 0 }
    }
  }

  /**
   * Check if element is in viewport
   */
  async isElementInViewport(selector: string): Promise<boolean> {
    const script = `
      (function() {
        try {
          const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = result.singleNodeValue;

          if (!el) return false;

          const rect = el.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
        } catch (e) {
          return false;
        }
      })();
    `

    try {
      const isInViewport = await this.connectionManager.executeJavaScript(this.deviceId, script)
      return isInViewport || false
    } catch (error) {
      console.error('📱 [MobileFlowExtractor] Error checking viewport:', error)
      return false
    }
  }

  /**
   * Scroll element into view
   */
  async scrollElementIntoView(selector: string): Promise<void> {
    const script = `
      (function() {
        try {
          const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = result.singleNodeValue;

          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch (e) {
          console.error('Scroll error:', e);
        }
      })();
    `

    try {
      await this.connectionManager.executeJavaScript(this.deviceId, script)
    } catch (error) {
      console.error('📱 [MobileFlowExtractor] Error scrolling element:', error)
    }
  }
}
