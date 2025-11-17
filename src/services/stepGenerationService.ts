/**
 * Step Generation Service
 *
 * AI-powered service to generate test steps from natural language descriptions
 * Uses Claude API to parse descriptions and create structured steps
 */

import { claudeService } from './claudeService'
import { Step, Action } from '../store/stepStore'
import { PlatformType } from '../types/feature'

export interface GeneratedStep {
  name: string
  actions: Action[]
  order: number
}

export interface StepGenerationResult {
  steps: GeneratedStep[]
  confidence: number
  warnings: string[]
}

class StepGenerationService {
  /**
   * Generate steps from a natural language description
   */
  async generateStepsFromDescription(
    description: string,
    platform: PlatformType,
    context?: {
      url?: string
      appInfo?: { bundleId?: string, packageName?: string }
    }
  ): Promise<StepGenerationResult> {
    const systemPrompt = this.buildSystemPrompt(platform, context)
    const userPrompt = this.buildUserPrompt(description, platform)

    try {
      const response = await claudeService.sendMessage([
        { role: 'user', content: userPrompt }
      ], systemPrompt)

      const parsedSteps = this.parseAIResponse(response.content, platform)
      return {
        steps: parsedSteps,
        confidence: this.calculateConfidence(parsedSteps),
        warnings: this.generateWarnings(parsedSteps, platform)
      }
    } catch (error) {
      console.error('Step generation failed:', error)
      throw new Error('Failed to generate steps from description')
    }
  }

  /**
   * Generate a step name from actions
   */
  async generateStepName(actions: Action[], platform: PlatformType): Promise<string> {
    const actionsDescription = actions.map(a =>
      `${a.type} ${a.selector ? `on "${a.selector}"` : ''} ${a.value ? `with "${a.value}"` : ''}`
    ).join(', ')

    const prompt = `Given these test actions for ${platform} platform:\n${actionsDescription}\n\nGenerate a concise, human-readable name for this step (3-6 words). Examples: "Enter login credentials", "Submit registration form", "Navigate to checkout". Respond with the name only, no quotes or explanation.`

    try {
      const response = await claudeService.sendMessage([
        { role: 'user', content: prompt }
      ])
      return response.content.trim()
    } catch (error) {
      console.error('Step name generation failed:', error)
      return 'Unnamed Step'
    }
  }

  /**
   * Regenerate steps for an existing feature
   */
  async regenerateSteps(
    description: string,
    platform: PlatformType,
    context?: any
  ): Promise<StepGenerationResult> {
    // Same as initial generation
    return this.generateStepsFromDescription(description, platform, context)
  }

  /**
   * Build system prompt for Claude
   */
  private buildSystemPrompt(platform: PlatformType, context?: any): string {
    const basePrompt = `You are an expert QA automation engineer specializing in ${platform} test automation.

Your task is to convert natural language test descriptions into structured, executable test steps.

Platform-specific guidelines:

${platform === 'web' ? `
**Web Testing:**
- Actions: navigate, click, type, hover, wait, assert, scroll, screenshot
- Selectors: Use ONLY standard CSS selectors or XPath (no Playwright-specific selectors)
- FORBIDDEN: Do NOT use :has-text(), :text(), >> syntax, or any Playwright-specific pseudo-selectors
- ALLOWED: CSS selectors (#id, .class, [attribute="value"]), XPath (//*[@id="..."]), attribute selectors
- Common patterns: Form filling, navigation, button clicks, assertions
- Example selectors: "#email", "button[type='submit']", "[aria-label='Login']", "//input[@name='username']"
- For text matching: Use attribute selectors like [aria-label], [title], [value], or XPath with text()
` : `
**Mobile Testing (iOS/Android Native Apps):**
- Actions: tap (same as click), type (fill text field), swipe, scroll, wait, assert, screenshot
- Selectors: Use accessibility identifiers (not XPath) - will be captured later using SDK
- Common patterns: Tap buttons, fill text fields, swipe gestures
- Example actions:
  * type "username" into username field → ONE action: type with value "username"
  * tap login button → ONE action: tap/click with no value
  * enter "password" in password field → ONE action: type with value "password"
- **CRITICAL**: Do NOT add separate "tap" or "click" actions before "type" actions
- **CRITICAL**: Mobile text fields are auto-focused when tapped - just use "type" action directly
- **CRITICAL**: Each step should have EXACTLY ONE action (either tap OR type, never both)
- **CRITICAL**: For mobile apps, ALWAYS include a "context" field describing what element to interact with
- Note: No hover action on mobile (not applicable)
`}

${context?.url ? `\nApplication URL: ${context.url}` : ''}
${context?.appInfo?.bundleId ? `\niOS Bundle ID: ${context.appInfo.bundleId}` : ''}
${context?.appInfo?.packageName ? `\nAndroid Package: ${context.appInfo.packageName}` : ''}

**Output Format:**
Return a JSON array of steps. Each step should have:
{
  "name": "Concise step name (3-6 words)",
  "actions": [
    {
      "type": "action_type",
      "selector": "",
      "value": "exact_value_from_description",
      "description": "What this action does",
      "context": "element to interact with (e.g., 'Account button', 'Wealths tab', 'Back button')"
    }
  ],
  "order": step_number
}

**CRITICAL - Action and Value Rules:**
${platform === 'mobile' ? `
- **Each step = ONE action only** (never combine tap + type in same step)
- **For text input**: Extract the EXACT text value from the description and put it in the "value" field
- **For taps/clicks**: Leave "value" empty or null
- **Example breakdown**:
  Input: "enter 'john@example.com' in email and 'password123' in password and click login"
  Output:
  [
    {"name": "Enter email", "actions": [{"type": "type", "value": "john@example.com", "description": "Type email address", "context": "email field"}], "order": 0},
    {"name": "Enter password", "actions": [{"type": "type", "value": "password123", "description": "Type password", "context": "password field"}], "order": 1},
    {"name": "Click login button", "actions": [{"type": "click", "value": "", "description": "Tap login button", "context": "login button"}], "order": 2}
  ]

- **Example for navigation**:
  Input: "Click on Account and go back. Click on Cards and go back."
  Output:
  [
    {"name": "Click on Account", "actions": [{"type": "click", "value": "", "description": "Navigate to Account", "context": "Account button or tab"}], "order": 0},
    {"name": "Go back from Account", "actions": [{"type": "click", "value": "", "description": "Navigate back", "context": "Back button or navigation back"}], "order": 1},
    {"name": "Click on Cards", "actions": [{"type": "click", "value": "", "description": "Navigate to Cards", "context": "Cards button or tab"}], "order": 2},
    {"name": "Go back from Cards", "actions": [{"type": "click", "value": "", "description": "Navigate back", "context": "Back button or navigation back"}], "order": 3}
  ]
` : `
- DO NOT generate actual CSS or XPath selectors - they will not work
`}
- ALWAYS use empty string "" for the selector field
- Users will capture the actual selectors using the visual selector capture tool
- Focus on generating correct action types, values, and descriptions

**Important:**
- Break complex descriptions into atomic, testable steps
- Each step should accomplish ONE clear objective
- Extract exact text values from the description (preserve quotes content)
- Actions should be in logical sequence
- Be specific and actionable in descriptions`

    return basePrompt
  }

  /**
   * Build user prompt from description
   */
  private buildUserPrompt(description: string, platform: PlatformType): string {
    return `Convert this ${platform} test scenario into structured steps:

"${description}"

Analyze the description and break it down into atomic steps with specific actions. Return valid JSON only, no additional text.`
  }

  /**
   * Parse AI response into structured steps
   */
  private parseAIResponse(response: string, platform: PlatformType): GeneratedStep[] {
    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response

      const parsed = JSON.parse(jsonStr)

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array')
      }

      return parsed.map((step: any, index: number) => ({
        name: step.name || `Step ${index + 1}`,
        actions: (step.actions || []).map((action: any) => {
          // Detect password fields by checking selector or description
          const isPassword = action.type === 'type' && (
            action.selector?.toLowerCase().includes('password') ||
            action.description?.toLowerCase().includes('password') ||
            action.context?.toLowerCase().includes('password') ||
            action.selector?.includes('[type="password"]') ||
            action.selector?.includes('[type=password]')
          )

          return {
            id: crypto.randomUUID(),
            type: this.validateActionType(action.type, platform),
            selector: action.selector || '',
            value: isPassword && action.value ? '********' : action.value,  // Mask password values
            description: action.description,
            context: action.context || '',  // Preserve context for AI decision-making
            isPassword
          }
        }),
        order: step.order ?? index
      }))
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      console.error('Response was:', response)

      // Fallback: create a single manual step
      return [{
        name: 'Manual step required',
        actions: [{
          id: crypto.randomUUID(),
          type: platform === 'web' ? 'click' : 'click',
          selector: '',
          description: 'AI generation failed - please configure manually'
        }],
        order: 0
      }]
    }
  }

  /**
   * Validate action type for platform
   */
  private validateActionType(type: string, platform: PlatformType): Action['type'] {
    const webActions: Action['type'][] = ['click', 'type', 'hover', 'wait', 'assert', 'scroll', 'navigate', 'screenshot']
    const mobileActions: Action['type'][] = ['click', 'type', 'wait', 'assert', 'swipe', 'scroll', 'navigate', 'screenshot']

    const validActions = platform === 'web' ? webActions : mobileActions

    // Convert hover to click on mobile
    if (platform === 'mobile' && type === 'hover') {
      return 'click'
    }

    if (validActions.includes(type as Action['type'])) {
      return type as Action['type']
    }

    // Default fallback
    return 'click'
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(steps: GeneratedStep[]): number {
    if (steps.length === 0) return 0

    let score = 100

    // Reduce score for empty selectors
    const emptySelectors = steps.flatMap(s => s.actions).filter(a => !a.selector).length
    score -= emptySelectors * 10

    // Reduce score for generic names
    const genericNames = steps.filter(s => s.name.toLowerCase().includes('step')).length
    score -= genericNames * 5

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Generate warnings
   */
  private generateWarnings(steps: GeneratedStep[], platform: PlatformType): string[] {
    const warnings: string[] = []

    if (steps.length === 0) {
      warnings.push('No steps were generated')
    }

    const emptySelectors = steps.flatMap(s => s.actions).filter(a => !a.selector)
    if (emptySelectors.length > 0) {
      warnings.push(`${emptySelectors.length} action(s) have empty selectors - you'll need to specify them`)
    }

    // Check for hover on mobile
    if (platform === 'mobile') {
      const hoverActions = steps.flatMap(s => s.actions).filter(a => a.type === 'hover')
      if (hoverActions.length > 0) {
        warnings.push('Hover actions are not supported on mobile - converted to tap')
      }
    }

    return warnings
  }
}

export const stepGenerationService = new StepGenerationService()
