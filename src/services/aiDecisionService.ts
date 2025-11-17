import { claudeService } from './claudeService'
import { InteractableElement } from '../utils/flowExtractor'
import { AIDecision, PageContext, JourneyTreeNode, MeaningfulElement } from '../types/journey'

/**
 * AI-powered decision service for intelligent journey exploration
 */
export class AIDecisionService {
  private systemPrompt = `You are an expert QA automation engineer analyzing a web application to discover meaningful user journeys for test automation.

Your goal is to intelligently explore the application by:
1. Understanding the context of each page (what the user is trying to accomplish)
2. Deciding which elements to click next to discover valuable user journeys
3. **IMPORTANT**: Recognizing when a journey has reached a meaningful completion point

**JOURNEY COMPLETION CRITERIA** - Mark as complete when:
- User has completed AT LEAST 3-4 meaningful clicks that demonstrate a testable flow
- User has successfully accessed critical data after navigating through multiple pages
- A multi-step workflow is complete (e.g., dashboard → accounts → transactions → transaction details)
- A form submission shows success state after filling multiple fields
- User has drilled down into detailed information (not just surface-level views)

**EXPLORATION DEPTH**:
- Aim for 3-5 meaningful clicks before completing a journey
- Don't stop too early - a 1-2 click journey is usually too shallow
- Explore deeper paths that show real user workflows
- Click into details, not just overview pages

You should prioritize:
- Business-critical flows (account management, transactions, data views)
- Common user tasks (search, forms, navigation to key pages)
- Paths that lead to meaningful outcomes (data displayed, success states)

You should AVOID:
- Utility links (logout, help, settings, legal pages, footers)
- Destructive actions (delete, remove, cancel account)
- Loops (going back to already-visited pages)
- Dead-end paths with no value

Always provide clear reasoning for your decisions.`

  /**
   * Analyze page context and decide the next action
   */
  async decideNextAction(
    currentPath: JourneyTreeNode[],
    pageContext: PageContext,
    availableElements: InteractableElement[],
    visitedSelectors: Set<string>
  ): Promise<AIDecision> {
    if (!claudeService.isInitialized()) {
      throw new Error('Claude service not initialized')
    }

    // Build context for AI
    const pathDescription = this.buildPathDescription(currentPath)
    const elementsDescription = this.buildElementsDescription(availableElements, visitedSelectors)

    const prompt = `Current Journey Path:
${pathDescription}

Current Page:
- URL: ${pageContext.url}
- Title: ${pageContext.title}
- Main Heading: ${pageContext.mainHeading || 'None'}
- Key Content: ${pageContext.visibleText}

Available Elements to Click (not yet visited in this path):
${elementsDescription}

**CRITICAL QUESTION**: Has this journey achieved a meaningful, testable goal?

Consider:
- Current depth: Have we navigated 3-5+ meaningful clicks?
- Is this a COMPLETE workflow (not just the first step)?
- Would this path demonstrate a real user scenario worth testing?
- Have we drilled down into detailed information (not just overview)?

Based on this context, decide what to do next:
1. **CLICK** - If we're only 1-2 steps deep, KEEP EXPLORING to find a complete workflow
2. **COMPLETE** - Only if we've achieved 3-5+ meaningful steps demonstrating a full user journey

Respond in JSON format:
{
  "action": "click" | "complete",
  "elementSelector": "xpath-if-clicking",
  "elementDescription": "human-readable-description",
  "reasoning": "why you made this decision",
  "confidence": 0-100,
  "isComplete": true/false,
  "journeyName": "name-if-complete",
  "completionReason": "reason-if-complete"
}

Example responses:
- Journey complete: {"action":"complete","reasoning":"User navigated from dashboard → accounts → transaction list. Transaction list is now displayed with 246 transactions, demonstrating a complete user flow","confidence":90,"isComplete":true,"journeyName":"View Account Transactions","completionReason":"Successfully accessed and displayed transaction list"}
- Continue exploring: {"action":"click","elementSelector":"//button[@id='search']","elementDescription":"Search button","reasoning":"Adding search functionality would significantly enhance this test flow","confidence":85,"isComplete":false}`

    try {
      const response = await claudeService.askClaude(prompt, this.systemPrompt)

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response')
      }

      const decision: AIDecision = JSON.parse(jsonMatch[0])
      return decision
    } catch (error) {
      console.error('AI decision error:', error)
      throw new Error(`Failed to get AI decision: ${error}`)
    }
  }

  /**
   * Build human-readable description of the journey path
   */
  private buildPathDescription(path: JourneyTreeNode[]): string {
    if (path.length === 0) return 'Starting at initial page'

    return path.map((node, index) => {
      return `${index + 1}. ${node.label} (${node.pageContext.title})`
    }).join('\n')
  }

  /**
   * Build description of available elements
   */
  private buildElementsDescription(
    elements: InteractableElement[],
    visitedSelectors: Set<string>
  ): string {
    // Filter out visited elements and noise
    const filteredElements = elements
      .filter(el => !visitedSelectors.has(el.selector))
      .filter(el => !this.isNoiseElement(el))
      .slice(0, 20) // Limit to top 20 elements

    if (filteredElements.length === 0) {
      return 'No unvisited elements available (all paths explored or filtered as noise)'
    }

    return filteredElements.map((el, index) => {
      const description = this.describeElement(el)
      return `${index + 1}. ${description}`
    }).join('\n')
  }

  /**
   * Create human-readable description of an element
   */
  private describeElement(el: InteractableElement): string {
    let desc = `[${el.tagName}] "${el.text}"`

    if (el.associatedLabel) desc += ` (label: ${el.associatedLabel})`
    if (el.ariaLabel) desc += ` (aria: ${el.ariaLabel})`
    if (el.placeholder) desc += ` (placeholder: ${el.placeholder})`
    if (el.href) desc += ` (href: ${el.href})`

    desc += ` | selector: ${el.selector}`

    return desc
  }

  /**
   * Check if element is likely noise that should be ignored
   */
  private isNoiseElement(el: InteractableElement): boolean {
    const noisePatterns = [
      /logout/i,
      /sign out/i,
      /log out/i,
      /help/i,
      /support/i,
      /privacy/i,
      /terms/i,
      /cookie/i,
      /settings/i,
      /preferences/i,
      /profile/i,
      /legal/i,
      /about/i,
      /contact us/i,
      /faq/i
    ]

    const textToCheck = [
      el.text,
      el.associatedLabel,
      el.ariaLabel,
      el.href
    ].filter(Boolean).join(' ').toLowerCase()

    return noisePatterns.some(pattern => pattern.test(textToCheck))
  }

  /**
   * Generate a descriptive name for a completed journey
   */
  async generateJourneyName(path: JourneyTreeNode[]): Promise<string> {
    if (!claudeService.isInitialized()) {
      // Fallback: generate simple name from path
      return this.generateFallbackName(path)
    }

    const pathDescription = path.map(node =>
      `${node.label} → ${node.pageContext.title}`
    ).join(' → ')

    const prompt = `Based on this user journey path, generate a concise, descriptive name (3-6 words) for this test flow:

${pathDescription}

Respond with ONLY the journey name, no explanation. Examples of good names:
- "View Account Balance"
- "Submit Contact Form"
- "Search and Filter Products"
- "Complete User Registration"

Journey name:`

    try {
      const name = await claudeService.askClaude(prompt, this.systemPrompt)
      return name.trim().replace(/^["']|["']$/g, '') // Remove quotes if present
    } catch (error) {
      console.error('Failed to generate AI name:', error)
      return this.generateFallbackName(path)
    }
  }

  /**
   * Generate fallback name without AI
   */
  private generateFallbackName(path: JourneyTreeNode[]): string {
    if (path.length === 0) return 'Unknown Journey'

    const lastNode = path[path.length - 1]
    return `Journey to ${lastNode.pageContext.title}`
  }

  /**
   * Extract and summarize key visible text from page
   */
  summarizePageText(fullText: string, maxLength: number = 500): string {
    // Remove excessive whitespace
    const cleaned = fullText.replace(/\s+/g, ' ').trim()

    if (cleaned.length <= maxLength) return cleaned

    // Try to extract key sentences (headings, important content)
    const sentences = cleaned.split(/[.!?]+/)
    const important = sentences
      .filter(s => s.length > 10 && s.length < 100) // Reasonable length
      .slice(0, 5) // Take first 5 important sentences
      .join('. ')

    return important.substring(0, maxLength) + '...'
  }

  /**
   * Summarize mobile view hierarchy - keep interactive elements, remove noise
   */
  summarizeMobileViewHierarchy(hierarchy: string, maxLength: number = 8000): string {
    if (hierarchy.length <= maxLength) return hierarchy

    // Split into lines
    const lines = hierarchy.split('\n')

    // Priority levels for element types
    const highPriority = ['UIButton', 'UITextField', 'UITextView', 'UISwitch', 'UISlider', 'UISegmentedControl']
    const mediumPriority = ['UILabel', 'UIImageView', 'UITabBar', 'UINavigationBar', 'UITableViewCell']
    const lowPriority = ['UIView', 'UIStackView', 'UIScrollView']
    const containerOnly = ['UIWindow', 'UITransitionView', 'UIDropShadowView', 'UILayoutContainerView']

    // Filter and prioritize lines
    const prioritizedLines: { line: string, priority: number, hasAccessibility: boolean }[] = lines.map(line => {
      let priority = 0

      // Check element type
      if (highPriority.some(type => line.includes(type))) priority = 100
      else if (mediumPriority.some(type => line.includes(type))) priority = 50
      else if (lowPriority.some(type => line.includes(type))) priority = 10
      else if (containerOnly.some(type => line.includes(type))) priority = 1

      // Boost priority if has accessibility identifier or label
      const hasAccessibility = line.includes('accessibilityIdentifier') ||
                               line.includes('accessibilityLabel') ||
                               line.includes('text=')

      if (hasAccessibility) priority += 50

      return { line, priority, hasAccessibility }
    })

    // Sort by priority (highest first)
    prioritizedLines.sort((a, b) => b.priority - a.priority)

    // Take lines until we hit the limit
    let result = ''
    let currentLength = 0

    for (const item of prioritizedLines) {
      if (currentLength + item.line.length > maxLength) break
      result += item.line + '\n'
      currentLength += item.line.length + 1
    }

    // If result is still too long or too short, just take first N chars
    if (result.length < 500) {
      return hierarchy.substring(0, maxLength)
    }

    return result + '\n...(hierarchy truncated, showing most relevant interactive elements)'
  }

  /**
   * Check if two pages are similar (to detect loops)
   */
  arePagesSimular(context1: PageContext, context2: PageContext): boolean {
    return context1.url === context2.url && context1.title === context2.title
  }

  // ========== New Methods for Re-engineered Architecture ==========

  /**
   * PHASE 2: Filter meaningful elements from all interactable elements
   * This reduces redundancy (e.g., 100 transaction rows → 1 representative element)
   */
  async filterMeaningfulElements(
    url: string,
    pageTitle: string,
    visibleText: string,
    allElements: InteractableElement[]
  ): Promise<{ meaningfulElements: MeaningfulElement[], pageContext: string }> {
    if (!claudeService.isInitialized()) {
      throw new Error('Claude service not initialized')
    }

    console.log('🔍 [AI FILTER] Filtering', allElements.length, 'elements')

    const elementsDescription = allElements
      .slice(0, 100) // Limit to first 100 to avoid token limits
      .map((el, index) => {
        return `${index + 1}. [${el.tagName}] "${el.text}" | selector: ${el.selector}${
          el.ariaLabel ? ` | aria: ${el.ariaLabel}` : ''
        }${el.href ? ` | href: ${el.href}` : ''}`
      })
      .join('\n')

    const prompt = `You are analyzing a web page to identify MEANINGFUL elements for test automation.

Page Information:
- URL: ${url}
- Title: ${pageTitle}
- Visible Text Summary: ${this.summarizePageText(visibleText, 300)}

All Interactable Elements Found (${allElements.length} total):
${elementsDescription}

Your task:
1. **Filter out redundant elements**: If you see many similar elements (e.g., 50 transaction rows), keep only 1-2 representative ones
2. **Prioritize business-critical elements**: Buttons/links that lead to important user flows
3. **Ignore utility elements**: Logout, help, settings, footers, social media links
4. **Generate a page context summary**: Brief description of what this page does (2-3 sentences max)

Respond in JSON format:
{
  "meaningfulElements": [
    {
      "type": "button|link|input",
      "label": "element text",
      "context": "brief description of what clicking this does",
      "selector": "xpath from original list",
      "text": "original text",
      "ariaLabel": "aria label if exists",
      "href": "href if exists"
    }
  ],
  "pageContext": "2-3 sentence summary of this page's purpose"
}

Example for a transaction list page:
{
  "meaningfulElements": [
    {"type": "button", "label": "First Transaction", "context": "Representative transaction to test detail view", "selector": "//div[1]/button", "text": "Transaction #123"},
    {"type": "button", "label": "Filter Transactions", "context": "Allows filtering transaction list", "selector": "//button[@id='filter']", "text": "Filter"}
  ],
  "pageContext": "This is a transaction list page showing user's recent transactions. Users can view transaction details by clicking on items or filter the list."
}`

    try {
      const response = await claudeService.askClaude(prompt, this.systemPrompt)

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response')
      }

      const result = JSON.parse(jsonMatch[0])

      // Convert to MeaningfulElement format with visited: false
      const meaningfulElements: MeaningfulElement[] = result.meaningfulElements.map((el: any) => ({
        type: el.type,
        label: el.label,
        context: el.context,
        selector: el.selector,
        visited: false,
        text: el.text,
        ariaLabel: el.ariaLabel,
        href: el.href
      }))

      console.log('✅ [AI FILTER] Filtered to', meaningfulElements.length, 'meaningful elements')

      return {
        meaningfulElements,
        pageContext: result.pageContext
      }
    } catch (error) {
      console.error('AI filtering error:', error)
      throw new Error(`Failed to filter elements: ${error}`)
    }
  }

  /**
   * PHASE 3: Decide next action based on meaningful elements and current journey
   */
  async decideNextActionFromMeaningful(
    meaningfulElements: MeaningfulElement[],
    pageContext: string,
    currentJourney: MeaningfulElement[],
    url: string
  ): Promise<AIDecision> {
    if (!claudeService.isInitialized()) {
      throw new Error('Claude service not initialized')
    }

    // Filter out visited elements
    const unvisitedElements = meaningfulElements.filter(el => !el.visited)

    if (unvisitedElements.length === 0) {
      return {
        action: 'complete',
        reasoning: 'All meaningful elements have been explored from this page',
        confidence: 100,
        isComplete: true,
        journeyName: 'Exploration Complete',
        completionReason: 'No more unvisited paths'
      }
    }

    const elementsDescription = unvisitedElements
      .map((el, index) => {
        return `${index + 1}. [${el.type}] "${el.label}" - ${el.context}`
      })
      .join('\n')

    const journeyDescription = currentJourney.length > 0
      ? currentJourney.map(el => `→ ${el.label}`).join(' ')
      : 'Just started (no actions yet)'

    const prompt = `You are guiding test automation exploration.

Current Page:
- URL: ${url}
- Context: ${pageContext}

Current Journey So Far:
${journeyDescription}

Available Unvisited Elements:
${elementsDescription}

Decide the next action:
1. **CLICK** an element to continue exploring (if journey needs more depth)
2. **COMPLETE** if this journey demonstrates a meaningful test flow (3-5+ steps recommended)

Respond in JSON format:
{
  "action": "click" | "complete",
  "elementIndex": 1-based index if clicking,
  "reasoning": "why you made this decision",
  "confidence": 0-100,
  "isComplete": true/false,
  "journeyName": "name if complete",
  "completionReason": "reason if complete"
}

Remember: Aim for 3-5 meaningful steps before completing a journey.`

    try {
      const response = await claudeService.askClaude(prompt, this.systemPrompt)

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response')
      }

      const result = JSON.parse(jsonMatch[0])

      // Map element index to selector
      if (result.action === 'click' && result.elementIndex) {
        const selectedElement = unvisitedElements[result.elementIndex - 1]
        if (selectedElement) {
          return {
            action: 'click',
            elementSelector: selectedElement.selector,
            elementDescription: selectedElement.label,
            reasoning: result.reasoning,
            confidence: result.confidence,
            isComplete: false
          }
        }
      }

      return result
    } catch (error) {
      console.error('AI decision error:', error)
      throw new Error(`Failed to decide action: ${error}`)
    }
  }

  // ========== Text to Flow Methods ==========

  /**
   * Parse user's text flow description into structured steps
   */
  async parseTextToFlowSteps(
    flowDescription: string,
    currentUrl: string
  ): Promise<{ steps: Array<{ description: string; order: number }> }> {
    if (!claudeService.isInitialized()) {
      throw new Error('Claude service not initialized')
    }

    const prompt = `You are analyzing a user's natural language description of a test flow to parse it into discrete, actionable steps.

Current Page URL: ${currentUrl}

User's Flow Description:
${flowDescription}

Your task:
1. Parse the description into a sequence of clear, actionable steps
2. Each step should be a single action (click, type, navigate, wait, etc.)
3. Number the steps in execution order
4. Be specific but concise

Respond in JSON format:
{
  "steps": [
    {
      "description": "Clear, actionable description of what to do",
      "order": 1
    },
    {
      "description": "Next action to perform",
      "order": 2
    }
  ]
}

Examples:

Input: "Login to the app with username 'admin' and password 'test123', then navigate to the dashboard"
Output:
{
  "steps": [
    {"description": "Enter 'admin' in username field", "order": 1},
    {"description": "Enter 'test123' in password field", "order": 2},
    {"description": "Click login button", "order": 3},
    {"description": "Wait for dashboard to load", "order": 4}
  ]
}

Input: "Go to settings and change theme to dark mode"
Output:
{
  "steps": [
    {"description": "Click settings link or button", "order": 1},
    {"description": "Find theme selector", "order": 2},
    {"description": "Select dark mode option", "order": 3},
    {"description": "Save or apply changes", "order": 4}
  ]
}

Now parse the user's flow description above.`

    try {
      const response = await claudeService.askClaude(prompt, this.systemPrompt)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response')
      }

      const result = JSON.parse(jsonMatch[0])
      return result
    } catch (error) {
      console.error('Text to flow parsing error:', error)
      throw new Error(`Failed to parse flow description: ${error}`)
    }
  }

  /**
   * Execute a single step from text flow by finding and interacting with the right element
   */
  async executeTextFlowStep(
    stepDescription: string,
    pageUrl: string,
    pageTitle: string,
    visibleText: string,
    availableElements: any[]
  ): Promise<{
    action: 'click' | 'type' | 'select' | 'wait' | 'complete' | 'navigate'
    elementSelector?: string
    inputValue?: string
    selectValue?: string
    reasoning: string
    success: boolean
  }> {
    if (!claudeService.isInitialized()) {
      throw new Error('Claude service not initialized')
    }

    const elementsDescription = availableElements
      .slice(0, 50)
      .map((el, index) => {
        let description = `${index + 1}. [${el.tagName}] "${el.text}" | selector: ${el.selector}${
          el.ariaLabel ? ` | aria: ${el.ariaLabel}` : ''
        }${el.placeholder ? ` | placeholder: ${el.placeholder}` : ''}${
          el.href ? ` | href: ${el.href}` : ''
        }`

        // Add options for SELECT elements (native HTML or Material UI)
        // Material UI selects have type='select' but tagName might be MAT-SELECT
        if ((el.tagName === 'SELECT' || el.type === 'select') && el.options !== undefined) {
          if (el.options.length > 0) {
            description += ` | options: [${el.options.join(', ')}]`
          } else {
            // Material UI selects might have empty options array (options are in overlay)
            description += ` | type: dropdown (Material UI)`
          }
        }

        return description
      })
      .join('\n')

    const prompt = `You are executing a specific step in a user's test flow. Find the right element and determine what action to take.

Current Page:
- URL: ${pageUrl}
- Title: ${pageTitle}
- Visible Text: ${this.summarizePageText(visibleText, 300)}

Step to Execute:
"${stepDescription}"

Available Elements on Page:
${elementsDescription}

Your task:
1. Find the element that matches the step description
2. Determine the action (click, type, select, wait, or navigate)
3. If typing, determine what value to input
4. If selecting from dropdown, determine which option to select
5. Provide clear reasoning

Respond in JSON format:
{
  "action": "click" | "type" | "select" | "wait" | "navigate" | "complete",
  "elementIndex": 1-based index if clicking, typing, or selecting,
  "inputValue": "value to type" (only if action is "type"),
  "selectValue": "option to select" (only if action is "select"),
  "reasoning": "Why you chose this element and action",
  "success": true/false
}

Action types:
- "click": Click a button, link, or interactive element
- "type": Fill an input field with text
- "select": Choose an option from a SELECT dropdown
- "wait": Wait for something (use if no immediate action needed)
- "navigate": Navigate to a URL
- "complete": Step cannot be completed (element not found)

**IMPORTANT for SELECT/dropdown elements:**
- If the step mentions "select", "choose", or "pick" and you see a SELECT element OR an element marked "type: dropdown (Material UI)", use action: "select"
- For native HTML SELECT elements, the options will be listed in square brackets
- For Material UI dropdowns, they'll be marked as "type: dropdown (Material UI)" - options are loaded dynamically
- Extract the value to select from the step description and put it in "selectValue"
- Even if you can't see the options list (Material UI case), still use action: "select" if the step clearly describes selecting from a dropdown

Examples:

Step: "Enter 'admin' in username field"
Response: {"action": "type", "elementIndex": 3, "inputValue": "admin", "reasoning": "Found username input field at index 3", "success": true}

Step: "Click login button"
Response: {"action": "click", "elementIndex": 5, "reasoning": "Found login button at index 5", "success": true}

Step: "Select 2025 as the year"
Available: 7. [SELECT] "Year" | selector: //select[@id="year"] | options: [2023, 2024, 2025, 2026]
Response: {"action": "select", "elementIndex": 7, "selectValue": "2025", "reasoning": "Found year dropdown at index 7 with option 2025", "success": true}

Step: "Choose Dark Mode from theme dropdown"
Available: 12. [SELECT] "Theme" | selector: //select[@name="theme"] | options: [Light Mode, Dark Mode, Auto]
Response: {"action": "select", "elementIndex": 12, "selectValue": "Dark Mode", "reasoning": "Found theme dropdown at index 12, selecting Dark Mode option", "success": true}

Step: "Select Year 2025"
Available: 13. [MAT-SELECT] "Year" | selector: //mat-select[@id="mat-select-0"] | type: dropdown (Material UI)
Response: {"action": "select", "elementIndex": 13, "selectValue": "2025", "reasoning": "Found Material UI year dropdown at index 13, will select 2025", "success": true}

Step: "Wait for page to load"
Response: {"action": "wait", "reasoning": "Waiting for 2 seconds", "success": true}

Now execute the step above.`

    try {
      const response = await claudeService.askClaude(prompt, this.systemPrompt)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response')
      }

      const result = JSON.parse(jsonMatch[0])

      // Map element index to selector
      if ((result.action === 'click' || result.action === 'type' || result.action === 'select') && result.elementIndex) {
        const selectedElement = availableElements[result.elementIndex - 1]
        if (selectedElement) {
          return {
            action: result.action,
            elementSelector: selectedElement.selector,
            inputValue: result.inputValue,
            selectValue: result.selectValue,
            reasoning: result.reasoning,
            success: result.success
          }
        }
      }

      return result
    } catch (error) {
      console.error('Step execution error:', error)
      throw new Error(`Failed to execute step: ${error}`)
    }
  }

  /**
   * Execute a single step from mobile text flow by finding elements in SDK view hierarchy
   */
  async executeMobileTextFlowStep(
    stepDescription: string,
    viewHierarchy: string,
    screenName?: string
  ): Promise<{
    action: 'tap' | 'type' | 'swipe' | 'wait' | 'complete'
    elementXPath?: string
    elementDescription?: string
    inputValue?: string
    reasoning: string
    success: boolean
  }> {
    if (!claudeService.isInitialized()) {
      throw new Error('Claude service not initialized')
    }

    const prompt = `You are executing a specific step in a mobile app test flow. Find the right element from the view hierarchy and determine what action to take.

Current Screen:
${screenName ? `- Screen Name: ${screenName}` : '- Screen: Unknown'}

Step to Execute:
"${stepDescription}"

View Hierarchy (iOS Debug Description Format):
${this.summarizeMobileViewHierarchy(viewHierarchy, 8000)}

Your task:
1. Analyze the view hierarchy to find UI elements
2. **CRITICAL**: If the step description includes "on element: X" (e.g., "click on element: Account button"), search for elements with:
   - accessibilityLabel matching or containing "X" (case-insensitive)
   - accessibilityIdentifier matching or containing "X" (case-insensitive)
   - Button text matching or containing "X"
3. Find the element that matches the step description and context
4. Determine the mobile action (tap, type, swipe, or wait)
5. Extract the accessibility identifier for the element
6. **CRITICAL**: If the step description contains a value (e.g., "type with value 'asd'"), extract that EXACT value and return it in inputValue
7. Provide clear reasoning

View Hierarchy Format Notes:
- Each line shows a UI element with its type (UIButton, UILabel, UITextField, etc.)
- Elements may have accessibilityLabel, accessibilityIdentifier, or text content
- Hierarchy is indented showing parent-child relationships
- Look for interactive elements like buttons, text fields, switches, etc.

**CRITICAL - Accessibility Identifier Extraction:**
- ALWAYS prioritize accessibilityIdentifier over other attributes
- Return ONLY the identifier value, NOT an XPath
- If you see: accessibilityIdentifier="loginButton" → return "loginButton"
- If you see: accessibilityIdentifier="usernameField" → return "usernameField"
- If no accessibilityIdentifier exists, use accessibilityLabel value
- DO NOT generate XPath selectors - mobile automation uses direct accessibility IDs

**CRITICAL - Input Value Extraction:**
- If step says "type with value 'X'" → extract 'X' and return as inputValue
- If step says "type with value \"Y\"" → extract "Y" and return as inputValue
- If step says "click" or "tap" → leave inputValue empty/null
- Preserve the exact value including any special characters

Respond in JSON format:
{
  "action": "tap" | "type" | "swipe" | "wait" | "complete",
  "elementXPath": "accessibility identifier or label value (NOT an XPath)",
  "elementDescription": "Human-readable description of the element",
  "inputValue": "exact value from step description" (only if action is "type"),
  "reasoning": "Why you chose this element and action",
  "success": true/false
}

Action types:
- "tap": Tap a button, link, or interactive element
- "type": Fill a text field with text (must have inputValue)
- "swipe": Swipe gesture (up, down, left, right)
- "wait": Wait for something (use if no immediate action needed)
- "complete": Step cannot be completed (element not found)

Examples:

Step: "tap"
View Hierarchy contains: UIButton, accessibilityIdentifier="loginButton"
Response: {"action": "tap", "elementXPath": "loginButton", "elementDescription": "Login button", "reasoning": "Found login button with identifier loginButton", "success": true}

Step: "type with value 'admin'"
View Hierarchy contains: UITextField, accessibilityIdentifier="usernameField"
Response: {"action": "type", "elementXPath": "usernameField", "elementDescription": "Username text field", "inputValue": "admin", "reasoning": "Found username text field with identifier usernameField, will type 'admin'", "success": true}

Step: "type with value \"password123\""
View Hierarchy contains: UITextField, accessibilityIdentifier="passwordField"
Response: {"action": "type", "elementXPath": "passwordField", "elementDescription": "Password text field", "inputValue": "password123", "reasoning": "Found password text field with identifier passwordField, will type 'password123'", "success": true}

Step: "click on element: Account button"
View Hierarchy contains: UIButton, accessibilityLabel="Account Details", accessibilityIdentifier="accountDetailsButton"
Response: {"action": "tap", "elementXPath": "accountDetailsButton", "elementDescription": "Account Details button", "reasoning": "Found button with label 'Account Details' matching context 'Account button', using identifier accountDetailsButton", "success": true}

Step: "click on element: Wealths tab"
View Hierarchy contains: UIButton, accessibilityLabel="Wealth", frame=(x: 209, y: 710, width: 70, height: 48)
Response: {"action": "tap", "elementXPath": "Wealth", "elementDescription": "Wealth tab button", "reasoning": "Found tab button with label 'Wealth' matching context 'Wealths tab', using accessibilityLabel as identifier", "success": true}

Step: "click on element: Back button"
View Hierarchy contains: UINavigationButton, accessibilityLabel="Back", accessibilityIdentifier="backButton"
Response: {"action": "tap", "elementXPath": "backButton", "elementDescription": "Back navigation button", "reasoning": "Found navigation back button matching context 'Back button', using identifier backButton", "success": true}

Now execute the mobile step above.`

    try {
      const response = await claudeService.askClaude(prompt, this.systemPrompt)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response')
      }

      const result = JSON.parse(jsonMatch[0])
      return result
    } catch (error) {
      console.error('Mobile step execution error:', error)
      throw new Error(`Failed to execute mobile step: ${error}`)
    }
  }
}

// Export singleton instance
export const aiDecisionService = new AIDecisionService()
