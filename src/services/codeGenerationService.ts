/**
 * Code Generation Service
 *
 * Generates test automation code for Features across platforms
 * - Playwright for Web
 * - WebDriverIO for Mobile (iOS/Android)
 */

import { Feature, PlatformType, MobileAppsConfig } from '../types/feature'
import { Action } from '../store/stepStore'
import { claudeService } from './claudeService'

export interface CodeGenerationOptions {
  projectName: string
  webUrl?: string
  mobileApps?: MobileAppsConfig
}

export interface GeneratedCode {
  code: string
  framework: 'playwright' | 'webdriverio'
  platform: PlatformType
  fileName: string
}

class CodeGenerationService {
  /**
   * Generate code for a feature based on current platform
   */
  generateFeatureCode(
    feature: Feature,
    platform: PlatformType,
    options: CodeGenerationOptions
  ): GeneratedCode {
    if (platform === 'web') {
      return this.generatePlaywrightCode(feature, options)
    } else {
      return this.generateWebDriverIOCode(feature, options)
    }
  }

  /**
   * Regenerate code using AI to improve quality and best practices
   */
  async regenerateCodeWithAI(currentCode: GeneratedCode): Promise<GeneratedCode> {
    if (!claudeService.isInitialized()) {
      throw new Error('Claude AI is not initialized. Please configure your API key in settings.')
    }

    const framework = currentCode.framework === 'playwright' ? 'Playwright' : 'WebdriverIO'
    const language = 'TypeScript'

    const systemPrompt = `You are a senior software engineer specializing in test automation. Your task is to improve and refine test automation code following industry best practices.

Key principles:
- Write clean, maintainable, and professional code
- Follow the official ${framework} best practices
- Use proper TypeScript types and async/await patterns
- Add meaningful comments only where necessary
- Optimize selectors and waits
- Ensure proper error handling
- Follow DRY (Don't Repeat Yourself) principles
- Use Page Object Model patterns where applicable
- Add proper test organization and structure`

    const userPrompt = `Please improve and refine this ${framework} test code. Maintain the same test scenarios and structure, but enhance:

1. Code quality and readability
2. Best practices for ${framework}
3. Selector strategies (prefer data-testid, id, or role-based selectors)
4. Proper waiting strategies
5. Better error messages and assertions
6. TypeScript best practices

Current code:
\`\`\`typescript
${currentCode.code}
\`\`\`

Please return ONLY the improved code without any explanations or markdown code blocks.`

    try {
      const improvedCode = await claudeService.askClaude(userPrompt, systemPrompt)

      // Clean up markdown code blocks if present
      let cleanedCode = improvedCode.trim()

      // Remove markdown code block syntax (```typescript, ```ts, or just ```)
      cleanedCode = cleanedCode.replace(/^```(?:typescript|ts)?\n?/i, '')
      cleanedCode = cleanedCode.replace(/\n?```$/, '')

      return {
        ...currentCode,
        code: cleanedCode.trim()
      }
    } catch (error: any) {
      console.error('AI code regeneration failed:', error)
      throw new Error(`Failed to regenerate code: ${error.message}`)
    }
  }

  /**
   * Generate Playwright code for web platform
   */
  private generatePlaywrightCode(
    feature: Feature,
    options: CodeGenerationOptions
  ): GeneratedCode {
    const steps = feature.stepsWeb
    const { projectName, webUrl } = options

    let code = `import { test, expect } from '@playwright/test';\n\n`

    // Feature documentation
    code += `/**\n`
    code += ` * Feature: ${feature.name}\n`
    if (feature.descriptionWeb) {
      code += ` * Description: ${feature.descriptionWeb}\n`
    }
    if (webUrl) {
      code += ` * Base URL: ${webUrl}\n`
    }
    code += ` */\n\n`

    // Test suite
    code += `test.describe('${this.sanitizeTestName(feature.name)}', () => {\n`

    // Generate test for each step
    steps.forEach((step, stepIndex) => {
      code += `\n  test('${this.sanitizeTestName(step.name)}', async ({ page }) => {\n`

      // Navigate to URL if this is the first step
      if (stepIndex === 0 && webUrl) {
        code += `    // Navigate to application\n`
        code += `    await page.goto('${webUrl}');\n\n`
      }

      // Generate actions
      step.actions.forEach((action, actionIndex) => {
        code += this.generatePlaywrightAction(action, actionIndex + 1, stepIndex + 1)
      })

      code += `  });\n`
    })

    code += `});\n`

    const fileName = this.generateFileName(projectName, feature.name, 'spec.ts')

    return {
      code,
      framework: 'playwright',
      platform: 'web',
      fileName
    }
  }

  /**
   * Generate WebDriverIO code for mobile platform
   */
  private generateWebDriverIOCode(
    feature: Feature,
    options: CodeGenerationOptions
  ): GeneratedCode {
    const steps = feature.stepsMobile
    const { projectName, mobileApps } = options

    let code = `import { expect } from '@wdio/globals';\n\n`

    // Feature documentation
    code += `/**\n`
    code += ` * Feature: ${feature.name}\n`
    if (feature.descriptionMobile) {
      code += ` * Description: ${feature.descriptionMobile}\n`
    }
    code += ` *\n`
    if (mobileApps?.ios) {
      code += ` * iOS Bundle: ${mobileApps.ios.bundleId}\n`
    }
    if (mobileApps?.android) {
      code += ` * Android Package: ${mobileApps.android.packageName}\n`
    }
    code += ` */\n\n`

    // Single describe block for the feature
    code += `describe('${this.sanitizeTestName(feature.name)}', () => {\n`

    // Generate test for each step
    steps.forEach((step, stepIndex) => {
      code += `\n  it('${this.sanitizeTestName(step.name)}', async () => {\n`

      // Generate actions
      step.actions.forEach((action, actionIndex) => {
        code += this.generateWebDriverIOAction(action, actionIndex + 1, stepIndex + 1)
      })

      code += `  });\n`
    })

    code += `});\n`

    const fileName = this.generateFileName(projectName, feature.name, 'test.ts')

    return {
      code,
      framework: 'webdriverio',
      platform: 'mobile',
      fileName
    }
  }

  /**
   * Generate Playwright action code
   */
  private generatePlaywrightAction(action: Action, actionNumber: number, stepNumber: number): string {
    let code = ''

    switch (action.type) {
      case 'click':
        if (!action.selector) {
          code += `    // TODO: Add selector for click action\n`
        } else {
          code += `    await page.locator('${this.escapeSelector(action.selector)}').click();\n`
        }
        break

      case 'type':
        if (!action.selector || !action.value) {
          code += `    // TODO: Add selector and text for type action\n`
        } else {
          code += `    await page.locator('${this.escapeSelector(action.selector)}').fill('${this.escapeString(action.value)}');\n`
        }
        break

      case 'hover':
        if (!action.selector) {
          code += `    // TODO: Add selector for hover action\n`
        } else {
          code += `    await page.locator('${this.escapeSelector(action.selector)}').hover();\n`
        }
        break

      case 'wait':
        const waitTime = parseInt(action.value || '1000')
        code += `    await page.waitForTimeout(${waitTime});\n`
        break

      case 'assert':
        if (!action.selector) {
          code += `    // TODO: Add selector for assertion\n`
        } else {
          code += `    await expect(page.locator('${this.escapeSelector(action.selector)}')).toBeVisible();\n`
        }
        break

      case 'scroll':
        const scrollAmount = action.value || '300'
        code += `    await page.evaluate(() => window.scrollBy(0, ${scrollAmount}));\n`
        break

      case 'navigate':
        if (action.value) {
          code += `    await page.goto('${action.value}');\n`
        }
        break

      case 'screenshot':
        code += `    await page.screenshot({ path: 'screenshot-step-${stepNumber}-${actionNumber}.png' });\n`
        break

      default:
        code += `    // TODO: Implement ${action.type} action\n`
    }

    return code
  }

  /**
   * Generate WebDriverIO action code
   */
  private generateWebDriverIOAction(action: Action, actionNumber: number, stepNumber: number): string {
    const elementName = `element${stepNumber}_${actionNumber}`
    let code = ''

    switch (action.type) {
      case 'click':
        if (!action.selector) {
          code += `    // TODO: Add selector for tap action\n`
        } else {
          const selector = this.convertToMobileSelector(action.selector)
          code += `    const ${elementName} = await $('${this.escapeSelector(selector)}');\n`
          code += `    await ${elementName}.waitForDisplayed({ timeout: 5000 });\n`
          code += `    await ${elementName}.click();\n`
        }
        break

      case 'type':
        if (!action.selector || !action.value) {
          code += `    // TODO: Add selector and text for type action\n`
        } else {
          const selector = this.convertToMobileSelector(action.selector)
          code += `    const ${elementName} = await $('${this.escapeSelector(selector)}');\n`
          code += `    await ${elementName}.waitForDisplayed({ timeout: 5000 });\n`
          code += `    await ${elementName}.setValue('${this.escapeString(action.value)}');\n`
        }
        break

      case 'wait':
        const waitTime = parseInt(action.value || '1000')
        code += `    await driver.pause(${waitTime});\n`
        break

      case 'assert':
        if (!action.selector) {
          code += `    // TODO: Add selector for assertion\n`
        } else {
          const selector = this.convertToMobileSelector(action.selector)
          code += `    const ${elementName} = await $('${this.escapeSelector(selector)}');\n`
          code += `    await expect(${elementName}).toBeDisplayed();\n`
        }
        break

      case 'scroll':
        const direction = action.value || 'down'
        code += `    await driver.execute('mobile: scroll', { direction: '${direction}' });\n`
        break

      case 'swipe':
        const swipeDirection = action.value || 'up'
        code += `    await driver.execute('mobile: swipe', { direction: '${swipeDirection}' });\n`
        break

      default:
        code += `    // TODO: Implement ${action.type} action\n`
    }

    return code
  }

  /**
   * Convert web selector to mobile selector
   * CSS selectors → accessibility IDs or XPath
   */
  private convertToMobileSelector(selector: string): string {
    // If already a mobile selector (starts with ~), return as-is
    if (selector.startsWith('~')) {
      return selector
    }

    // If it's an ID selector (#id), convert to accessibility ID
    if (selector.startsWith('#')) {
      const id = selector.substring(1)
      return `~${id}`
    }

    // If it's a data-testid attribute, convert to accessibility ID
    const testIdMatch = selector.match(/\[data-testid=["']([^"']+)["']\]/)
    if (testIdMatch) {
      return `~${testIdMatch[1]}`
    }

    // Otherwise, keep as-is (might be XPath)
    return selector
  }

  /**
   * Get human-readable action description
   */
  private getActionDescription(action: Action): string {
    switch (action.type) {
      case 'click':
        return 'Tap element'
      case 'type':
        return `Enter "${action.value || 'text'}"`
      case 'hover':
        return 'Hover over element'
      case 'wait':
        return `Wait ${action.value || '1000'}ms`
      case 'assert':
        return 'Verify element is visible'
      case 'scroll':
        return `Scroll ${action.value || 'down'}`
      case 'swipe':
        return `Swipe ${action.value || 'up'}`
      default:
        return action.type
    }
  }

  /**
   * Generate file name for test
   */
  private generateFileName(_projectName: string, featureName: string, extension: string): string {
    const sanitized = featureName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return `${sanitized}.${extension}`
  }

  /**
   * Sanitize test name
   */
  private sanitizeTestName(name: string): string {
    return name.replace(/'/g, "\\'")
  }

  /**
   * Escape string for code generation
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  }

  /**
   * Escape selector for code generation
   */
  private escapeSelector(selector: string): string {
    return selector.replace(/'/g, "\\'")
  }

  /**
   * Export code to file (download in browser)
   */
  async exportCode(code: GeneratedCode): Promise<void> {
    try {
      this.downloadCode(code)
    } catch (error) {
      console.error('Failed to export code:', error)
      throw new Error('Failed to save file. Please try again.')
    }
  }

  /**
   * Download code in browser (fallback)
   */
  private downloadCode(code: GeneratedCode): void {
    const blob = new Blob([code.code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = code.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export const codeGenerationService = new CodeGenerationService()
