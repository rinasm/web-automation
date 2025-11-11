/**
 * Code Generation Service
 *
 * Generates test automation code for Features across platforms
 * - Playwright for Web
 * - WebDriverIO for Mobile (iOS/Android)
 */

import { Feature, PlatformType, MobileAppsConfig } from '../types/feature'
import { Action } from '../store/stepStore'

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
   * Generate Playwright code for web platform
   */
  private generatePlaywrightCode(
    feature: Feature,
    options: CodeGenerationOptions
  ): GeneratedCode {
    const steps = feature.stepsWeb
    const { projectName, webUrl } = options

    let code = `import { test, expect } from '@playwright/test';\n\n`
    code += `/**\n`
    code += ` * Feature: ${feature.name}\n`
    if (feature.descriptionWeb) {
      code += ` * ${feature.descriptionWeb}\n`
    }
    code += ` */\n\n`

    // Generate test for each step
    steps.forEach((step, index) => {
      code += `test('${this.sanitizeTestName(step.name)}', async ({ page }) => {\n`

      // Navigate to URL if this is the first step
      if (index === 0 && webUrl) {
        code += `  // Navigate to application\n`
        code += `  await page.goto('${webUrl}');\n\n`
      }

      // Generate actions
      step.actions.forEach((action, actionIndex) => {
        code += this.generatePlaywrightAction(action, actionIndex + 1)
      })

      code += `});\n\n`
    })

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
    code += `/**\n`
    code += ` * Feature: ${feature.name}\n`
    if (feature.descriptionMobile) {
      code += ` * ${feature.descriptionMobile}\n`
    }
    code += ` *\n`
    if (mobileApps?.ios) {
      code += ` * iOS: ${mobileApps.ios.bundleId}\n`
    }
    if (mobileApps?.android) {
      code += ` * Android: ${mobileApps.android.packageName}\n`
    }
    code += ` */\n\n`

    // Generate test for each step
    steps.forEach((step) => {
      code += `describe('${this.sanitizeTestName(feature.name)}', () => {\n`
      code += `  it('${this.sanitizeTestName(step.name)}', async () => {\n`

      // Generate actions
      step.actions.forEach((action, actionIndex) => {
        code += this.generateWebDriverIOAction(action, actionIndex + 1)
      })

      code += `  });\n`
      code += `});\n\n`
    })

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
  private generatePlaywrightAction(action: Action, actionNumber: number): string {
    let code = `  // Action ${actionNumber}: ${this.getActionDescription(action)}\n`

    switch (action.type) {
      case 'click':
        if (!action.selector) {
          code += `  // TODO: Add selector for click action\n\n`
        } else {
          code += `  await page.locator('${this.escapeSelector(action.selector)}').click();\n\n`
        }
        break

      case 'type':
        if (!action.selector || !action.value) {
          code += `  // TODO: Add selector and text for type action\n\n`
        } else {
          code += `  await page.locator('${this.escapeSelector(action.selector)}').fill('${this.escapeString(action.value)}');\n\n`
        }
        break

      case 'hover':
        if (!action.selector) {
          code += `  // TODO: Add selector for hover action\n\n`
        } else {
          code += `  await page.locator('${this.escapeSelector(action.selector)}').hover();\n\n`
        }
        break

      case 'wait':
        const waitTime = parseInt(action.value || '1000')
        code += `  await page.waitForTimeout(${waitTime});\n\n`
        break

      case 'assert':
        if (!action.selector) {
          code += `  // TODO: Add selector for assertion\n\n`
        } else {
          code += `  await expect(page.locator('${this.escapeSelector(action.selector)}')).toBeVisible();\n\n`
        }
        break

      default:
        code += `  // TODO: Implement ${action.type} action\n\n`
    }

    return code
  }

  /**
   * Generate WebDriverIO action code
   */
  private generateWebDriverIOAction(action: Action, actionNumber: number): string {
    let code = `    // Action ${actionNumber}: ${this.getActionDescription(action)}\n`

    switch (action.type) {
      case 'click':
        if (!action.selector) {
          code += `    // TODO: Add selector for tap action\n\n`
        } else {
          const selector = this.convertToMobileSelector(action.selector)
          code += `    const element${actionNumber} = await $('${this.escapeSelector(selector)}');\n`
          code += `    await element${actionNumber}.waitForDisplayed();\n`
          code += `    await element${actionNumber}.click();\n\n`
        }
        break

      case 'type':
        if (!action.selector || !action.value) {
          code += `    // TODO: Add selector and text for type action\n\n`
        } else {
          const selector = this.convertToMobileSelector(action.selector)
          code += `    const element${actionNumber} = await $('${this.escapeSelector(selector)}');\n`
          code += `    await element${actionNumber}.waitForDisplayed();\n`
          code += `    await element${actionNumber}.setValue('${this.escapeString(action.value)}');\n\n`
        }
        break

      case 'wait':
        const waitTime = parseInt(action.value || '1000')
        code += `    await driver.pause(${waitTime});\n\n`
        break

      case 'assert':
        if (!action.selector) {
          code += `    // TODO: Add selector for assertion\n\n`
        } else {
          const selector = this.convertToMobileSelector(action.selector)
          code += `    const element${actionNumber} = await $('${this.escapeSelector(selector)}');\n`
          code += `    await expect(element${actionNumber}).toBeDisplayed();\n\n`
        }
        break

      case 'scroll':
        const direction = action.value || 'down'
        code += `    // Scroll ${direction}\n`
        code += `    await driver.execute('mobile: scroll', { direction: '${direction}' });\n\n`
        break

      case 'swipe':
        const swipeDirection = action.value || 'up'
        code += `    // Swipe ${swipeDirection}\n`
        code += `    await driver.execute('mobile: swipe', { direction: '${swipeDirection}' });\n\n`
        break

      default:
        code += `    // TODO: Implement ${action.type} action\n\n`
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
