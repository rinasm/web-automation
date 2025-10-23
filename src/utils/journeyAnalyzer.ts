import { InteractableElement } from './flowExtractor'
import { Journey, JourneyStep, JourneyType } from '../types/journey'
import { filterNoise } from './noiseFilter'

interface FormGroup {
  formPath: string
  inputs: InteractableElement[]
  buttons: InteractableElement[]
  selects: InteractableElement[]
  textareas: InteractableElement[]
}

/**
 * Group elements by their parent form
 */
function groupElementsByForm(elements: InteractableElement[]): FormGroup[] {
  const formMap = new Map<string, FormGroup>()

  // Group elements with parent forms
  elements.forEach(el => {
    if (el.parentForm) {
      if (!formMap.has(el.parentForm)) {
        formMap.set(el.parentForm, {
          formPath: el.parentForm,
          inputs: [],
          buttons: [],
          selects: [],
          textareas: []
        })
      }

      const group = formMap.get(el.parentForm)!
      if (el.tagName === 'INPUT') group.inputs.push(el)
      else if (el.tagName === 'BUTTON') group.buttons.push(el)
      else if (el.tagName === 'SELECT') group.selects.push(el)
      else if (el.tagName === 'TEXTAREA') group.textareas.push(el)
    }
  })

  return Array.from(formMap.values())
}

/**
 * Find elements within proximity (pixels)
 */
function findNearbyElements(
  element: InteractableElement,
  candidates: InteractableElement[],
  maxDistance: number = 200
): InteractableElement[] {
  if (!element.position) return []

  return candidates.filter(candidate => {
    if (!candidate.position) return false

    const dx = Math.abs(element.position.x - candidate.position.x)
    const dy = Math.abs(element.position.y - candidate.position.y)
    const distance = Math.sqrt(dx * dx + dy * dy)

    return distance <= maxDistance && candidate.selector !== element.selector
  })
}

/**
 * Match text against patterns (case insensitive)
 */
function matchesPattern(text: string | undefined, patterns: RegExp[]): boolean {
  if (!text) return false
  return patterns.some(pattern => pattern.test(text))
}

/**
 * Detect login/authentication flow
 */
function detectLoginFlow(formGroups: FormGroup[]): Journey | null {
  for (const group of formGroups) {
    const hasEmailOrUsername = group.inputs.some(input =>
      input.inputType === 'email' ||
      matchesPattern(input.name, [/user|email|login/i]) ||
      matchesPattern(input.associatedLabel, [/user|email|login/i]) ||
      matchesPattern(input.placeholder, [/user|email|login/i])
    )

    const hasPassword = group.inputs.some(input =>
      input.inputType === 'password' ||
      matchesPattern(input.name, [/pass/i]) ||
      matchesPattern(input.associatedLabel, [/pass/i])
    )

    const submitButton = group.buttons.find(btn =>
      btn.inputType === 'submit' ||
      matchesPattern(btn.text, [/login|sign in|log in/i])
    )

    if (hasEmailOrUsername && hasPassword && submitButton) {
      const emailInput = group.inputs.find(i =>
        i.inputType === 'email' ||
        matchesPattern(i.name, [/user|email|login/i])
      )!

      const passwordInput = group.inputs.find(i =>
        i.inputType === 'password'
      )!

      const steps: JourneyStep[] = [
        {
          type: 'fill',
          element: emailInput,
          description: `Fill ${emailInput.associatedLabel || 'email/username'}`,
          requiresData: true,
          dataType: emailInput.inputType === 'email' ? 'email' : 'text',
          order: 1
        },
        {
          type: 'fill',
          element: passwordInput,
          description: `Fill ${passwordInput.associatedLabel || 'password'}`,
          requiresData: true,
          dataType: 'password',
          order: 2
        },
        {
          type: 'click',
          element: submitButton,
          description: `Click "${submitButton.text}"`,
          requiresData: false,
          order: 3
        }
      ]

      return {
        id: `login-${Date.now()}`,
        name: 'Login Flow',
        type: 'login',
        confidence: calculateConfidence({
          hasSemanticHtml: true,
          hasLabels: !!(emailInput.associatedLabel && passwordInput.associatedLabel),
          hasCorrectInputTypes: emailInput.inputType === 'email' && passwordInput.inputType === 'password',
          hasSubmitButton: !!submitButton
        }),
        steps,
        metadata: {
          formId: group.formPath
        }
      }
    }
  }

  return null
}

/**
 * Detect registration/signup flow
 */
function detectRegistrationFlow(formGroups: FormGroup[]): Journey | null {
  for (const group of formGroups) {
    const hasEmail = group.inputs.some(i => i.inputType === 'email')
    const passwordInputs = group.inputs.filter(i => i.inputType === 'password')
    const hasMultiplePasswords = passwordInputs.length >= 2 // password + confirm

    const submitButton = group.buttons.find(btn =>
      matchesPattern(btn.text, [/register|sign up|signup|create account|join/i])
    )

    if (hasEmail && hasMultiplePasswords && submitButton) {
      const steps: JourneyStep[] = []
      let order = 1

      // Add all form inputs as steps
      group.inputs.forEach(input => {
        steps.push({
          type: 'fill',
          element: input,
          description: `Fill ${input.associatedLabel || input.placeholder || input.name || 'field'}`,
          requiresData: true,
          dataType: input.inputType as any || 'text',
          order: order++
        })
      })

      // Add submit button
      steps.push({
        type: 'click',
        element: submitButton,
        description: `Click "${submitButton.text}"`,
        requiresData: false,
        order: order
      })

      return {
        id: `registration-${Date.now()}`,
        name: 'Registration Flow',
        type: 'registration',
        confidence: calculateConfidence({
          hasSemanticHtml: true,
          hasLabels: group.inputs.every(i => i.associatedLabel),
          hasCorrectInputTypes: hasEmail && hasMultiplePasswords,
          hasSubmitButton: !!submitButton
        }),
        steps,
        metadata: {
          formId: group.formPath
        }
      }
    }
  }

  return null
}

/**
 * Detect search flow
 */
function detectSearchFlow(elements: InteractableElement[]): Journey | null {
  const searchInputs = elements.filter(el =>
    el.tagName === 'INPUT' &&
    (matchesPattern(el.placeholder, [/search|find|query/i]) ||
     matchesPattern(el.ariaLabel, [/search/i]) ||
     matchesPattern(el.name, [/search|query|q/i]))
  )

  for (const input of searchInputs) {
    // Find nearby button
    const nearbyButtons = findNearbyElements(input, elements.filter(e => e.tagName === 'BUTTON'))
    const searchButton = nearbyButtons.find(btn =>
      matchesPattern(btn.text, [/search|find|go/i]) ||
      matchesPattern(btn.ariaLabel, [/search/i])
    )

    if (searchButton) {
      const steps: JourneyStep[] = [
        {
          type: 'fill',
          element: input,
          description: `Enter search query`,
          requiresData: true,
          dataType: 'text',
          order: 1
        },
        {
          type: 'click',
          element: searchButton,
          description: `Click "${searchButton.text || 'search'}"`,
          requiresData: false,
          order: 2
        }
      ]

      return {
        id: `search-${Date.now()}`,
        name: 'Search Flow',
        type: 'search',
        confidence: calculateConfidence({
          hasSemanticHtml: !!input.parentForm,
          hasLabels: !!input.ariaLabel || !!input.placeholder,
          hasCorrectInputTypes: true,
          hasSubmitButton: !!searchButton
        }),
        steps
      }
    }
  }

  return null
}

/**
 * Detect generic form submission flow
 */
function detectFormFlow(formGroups: FormGroup[]): Journey[] {
  const journeys: Journey[] = []

  for (const group of formGroups) {
    // Skip if already detected as login/registration
    const hasPassword = group.inputs.some(i => i.inputType === 'password')
    if (hasPassword) continue // Likely login/registration

    const submitButton = group.buttons.find(btn =>
      btn.inputType === 'submit' ||
      matchesPattern(btn.text, [/submit|send|continue|next|save/i])
    )

    if (submitButton && (group.inputs.length > 0 || group.textareas.length > 0)) {
      const steps: JourneyStep[] = []
      let order = 1

      // Add all inputs
      group.inputs.forEach(input => {
        steps.push({
          type: 'fill',
          element: input,
          description: `Fill ${input.associatedLabel || input.placeholder || 'field'}`,
          requiresData: true,
          dataType: input.inputType as any || 'text',
          order: order++
        })
      })

      // Add textareas
      group.textareas.forEach(textarea => {
        steps.push({
          type: 'fill',
          element: textarea,
          description: `Fill ${textarea.associatedLabel || 'text area'}`,
          requiresData: true,
          dataType: 'text',
          order: order++
        })
      })

      // Add selects
      group.selects.forEach(select => {
        steps.push({
          type: 'select',
          element: select,
          description: `Select ${select.associatedLabel || 'option'}`,
          requiresData: true,
          dataType: 'select',
          order: order++
        })
      })

      // Add submit
      steps.push({
        type: 'click',
        element: submitButton,
        description: `Click "${submitButton.text}"`,
        requiresData: false,
        order: order
      })

      // Try to infer form purpose from button text or inputs
      let formName = 'Form Submission'
      if (matchesPattern(submitButton.text, [/contact|message/i])) {
        formName = 'Contact Form'
      } else if (matchesPattern(submitButton.text, [/subscribe|newsletter/i])) {
        formName = 'Newsletter Subscription'
      } else if (group.inputs.some(i => matchesPattern(i.name, [/card|payment/i]))) {
        formName = 'Payment Form'
      }

      journeys.push({
        id: `form-${Date.now()}-${journeys.length}`,
        name: formName,
        type: 'form',
        confidence: calculateConfidence({
          hasSemanticHtml: true,
          hasLabels: group.inputs.some(i => i.associatedLabel),
          hasCorrectInputTypes: true,
          hasSubmitButton: !!submitButton
        }),
        steps,
        metadata: {
          formId: group.formPath
        }
      })
    }
  }

  return journeys
}

/**
 * Detect navigation flow (main navigation links)
 */
function detectNavigationFlow(elements: InteractableElement[]): Journey | null {
  const navLinks = elements.filter(el =>
    el.tagName === 'A' &&
    el.href &&
    !el.href.startsWith('#') &&
    // Should be in header/nav area (top 20% of page)
    el.position && el.position.y < (window.innerHeight * 0.2)
  )

  if (navLinks.length >= 3) {
    const steps: JourneyStep[] = navLinks.slice(0, 8).map((link, index) => ({
      type: 'click',
      element: link,
      description: `Navigate to "${link.text}"`,
      requiresData: false,
      order: index + 1
    }))

    return {
      id: `navigation-${Date.now()}`,
      name: 'Main Navigation',
      type: 'navigation',
      confidence: 85,
      steps
    }
  }

  return null
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidence(factors: {
  hasSemanticHtml: boolean
  hasLabels: boolean
  hasCorrectInputTypes: boolean
  hasSubmitButton: boolean
}): number {
  let score = 50 // Base score

  if (factors.hasSemanticHtml) score += 20
  if (factors.hasLabels) score += 15
  if (factors.hasCorrectInputTypes) score += 10
  if (factors.hasSubmitButton) score += 5

  return Math.min(100, Math.max(0, score))
}

/**
 * Main analysis function - detect all journeys from extracted elements
 */
export function analyzeElements(elements: InteractableElement[]): Journey[] {
  const journeys: Journey[] = []

  // Step 1: Filter noise
  const cleanElements = filterNoise(elements)

  // Step 2: Group by form
  const formGroups = groupElementsByForm(cleanElements)

  // Step 3: Detect specific journey types
  const loginJourney = detectLoginFlow(formGroups)
  if (loginJourney) journeys.push(loginJourney)

  const registrationJourney = detectRegistrationFlow(formGroups)
  if (registrationJourney) journeys.push(registrationJourney)

  const searchJourney = detectSearchFlow(cleanElements)
  if (searchJourney) journeys.push(searchJourney)

  // Step 4: Detect generic forms
  const formJourneys = detectFormFlow(formGroups)
  journeys.push(...formJourneys)

  // Step 5: Detect navigation
  const navJourney = detectNavigationFlow(cleanElements)
  if (navJourney) journeys.push(navJourney)

  // Sort by confidence
  return journeys.sort((a, b) => b.confidence - a.confidence)
}
