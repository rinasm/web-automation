import { Step, Action } from '../store/stepStore'
import { MobileDevice } from '../types/mobileDevice'

export interface CodeGenOptions {
  device?: MobileDevice
  isMobile?: boolean
}

export type FrameworkType = 'playwright' | 'webdriverio'

export function generatePlaywrightCode(
  step: Step & { url: string },
  options: CodeGenOptions = {}
): string {
  const { name, actions, url } = step
  const { device, isMobile } = options

  let code = `import { test, expect, devices } from '@playwright/test';\n\n`

  if (isMobile && device) {
    // Mobile test with device emulation
    code += `// Mobile test for ${device.name} (${device.os === 'android' ? 'Android' : 'iOS'})\n`
    code += `test.use({\n`
    code += `  ...devices['${getPlaywrightDeviceName(device)}'],\n`
    code += `});\n\n`
  }

  code += `test('${sanitizeTestName(name)}', async ({ page }) => {\n`
  code += `  // Navigate to the target URL\n`
  code += `  await page.goto('${url}');\n\n`

  actions.forEach((action, index) => {
    code += generateActionCode(action, index + 1, isMobile)
  })

  code += `});\n`

  return code
}

export function generateWebDriverIOCode(
  step: Step & { url: string },
  options: CodeGenOptions = {}
): string {
  const { name, actions, url } = step
  const { device, isMobile } = options

  let code = `import { expect } from '@wdio/globals';\n\n`

  if (isMobile && device) {
    code += `/**\n`
    code += ` * Mobile test for ${device.name} (${device.os === 'android' ? 'Android' : 'iOS'})\n`
    code += ` * Platform: ${device.os}\n`
    code += ` * Device: ${device.name}\n`
    code += ` */\n\n`
  }

  code += `describe('${sanitizeTestName(name)}', () => {\n`
  code += `  it('should execute test steps', async () => {\n`

  if (!isMobile) {
    code += `    // Navigate to the target URL\n`
    code += `    await browser.url('${url}');\n\n`
  }

  actions.forEach((action, index) => {
    code += generateWebDriverIOActionCode(action, index + 1, isMobile)
  })

  code += `  });\n`
  code += `});\n`

  return code
}

/**
 * Get Playwright device name from mobile device
 */
function getPlaywrightDeviceName(device: MobileDevice): string {
  const name = device.name.toLowerCase()

  // Android devices
  if (device.os === 'android') {
    if (name.includes('pixel 7')) return 'Pixel 7'
    if (name.includes('pixel 5')) return 'Pixel 5'
    if (name.includes('pixel 4')) return 'Pixel 4'
    if (name.includes('galaxy')) return 'Galaxy S9+'
    if (name.includes('nexus')) return 'Nexus 7'
    return 'Pixel 5' // Default Android
  }

  // iOS devices
  if (device.os === 'ios') {
    if (name.includes('iphone 14')) return 'iPhone 14 Pro Max'
    if (name.includes('iphone 13')) return 'iPhone 13 Pro Max'
    if (name.includes('iphone 12')) return 'iPhone 12 Pro Max'
    if (name.includes('iphone 11')) return 'iPhone 11 Pro Max'
    if (name.includes('ipad')) return 'iPad Pro 11'
    return 'iPhone 13' // Default iOS
  }

  return 'iPhone 13'
}

function generateActionCode(action: Action, actionNumber: number, isMobile: boolean = false): string {
  let code = `  // Action ${actionNumber}: ${getActionDescription(action)}\n`

  switch (action.type) {
    case 'click':
      if (!action.selector) {
        code += `  // TODO: Add selector for click action\n\n`
      } else {
        if (isMobile) {
          code += `  // Mobile tap\n`
        }
        code += `  await page.locator('${action.selector}').click();\n\n`
      }
      break

    case 'type':
      if (!action.selector || !action.value) {
        code += `  // TODO: Add selector and text for type action\n\n`
      } else {
        code += `  await page.locator('${action.selector}').fill('${escapeString(action.value)}');\n\n`
      }
      break

    case 'hover':
      if (!action.selector) {
        code += `  // TODO: Add selector for hover action\n\n`
      } else {
        if (isMobile) {
          code += `  // Note: hover is converted to tap on mobile\n`
        }
        code += `  await page.locator('${action.selector}').hover();\n\n`
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
        code += `  await expect(page.locator('${action.selector}')).toBeVisible();\n\n`
      }
      break

    case 'scroll':
      if (isMobile) {
        const direction = action.value || 'down'
        code += `  // Mobile scroll: ${direction}\n`
        code += `  await page.evaluate(() => {\n`
        code += `    window.scrollBy({\n`
        code += `      top: ${direction === 'down' ? '300' : '-300'},\n`
        code += `      behavior: 'smooth'\n`
        code += `    });\n`
        code += `  });\n\n`
      } else {
        code += `  await page.evaluate(() => window.scrollBy(0, ${action.value || '300'}));\n\n`
      }
      break

    case 'swipe':
      if (isMobile) {
        const direction = action.value || 'up'
        code += `  // Mobile swipe: ${direction}\n`
        code += `  await page.touchscreen.swipe({\n`
        code += `    fromX: 200,\n`
        code += `    fromY: ${direction === 'up' ? '600' : '200'},\n`
        code += `    toX: 200,\n`
        code += `    toY: ${direction === 'up' ? '200' : '600'}\n`
        code += `  });\n\n`
      } else {
        code += `  // Swipe action not supported on web\n\n`
      }
      break

    case 'navigate':
      if (action.value) {
        code += `  await page.goto('${action.value}');\n\n`
      }
      break

    case 'screenshot':
      code += `  await page.screenshot({ path: 'screenshot-${actionNumber}.png' });\n\n`
      break

    default:
      code += `  // Unknown action type: ${action.type}\n\n`
  }

  return code
}

function getActionDescription(action: Action): string {
  switch (action.type) {
    case 'click':
      return 'Click/Tap element'
    case 'type':
      return `Type "${action.value || 'text'}"`
    case 'hover':
      return 'Hover over element'
    case 'wait':
      return `Wait ${action.value || '1000'}ms`
    case 'assert':
      return 'Assert element is visible'
    case 'scroll':
      return `Scroll ${action.value || 'down'}`
    case 'swipe':
      return `Swipe ${action.value || 'up'}`
    case 'navigate':
      return `Navigate to ${action.value}`
    case 'screenshot':
      return 'Take screenshot'
    default:
      return action.type
  }
}

function sanitizeTestName(name: string): string {
  return name.replace(/'/g, "\\'")
}

function escapeString(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

function generateWebDriverIOActionCode(action: Action, actionNumber: number, isMobile: boolean = false): string {
  let code = `    // Action ${actionNumber}: ${getActionDescription(action)}\n`

  switch (action.type) {
    case 'click':
      if (!action.selector) {
        code += `    // TODO: Add selector for click action\n\n`
      } else {
        const selector = convertToMobileSelector(action.selector, isMobile)
        code += `    const element${actionNumber} = await $('${selector}');\n`
        code += `    await element${actionNumber}.waitForDisplayed();\n`
        code += `    await element${actionNumber}.click();\n\n`
      }
      break

    case 'type':
      if (!action.selector || !action.value) {
        code += `    // TODO: Add selector and text for type action\n\n`
      } else {
        const selector = convertToMobileSelector(action.selector, isMobile)
        code += `    const element${actionNumber} = await $('${selector}');\n`
        code += `    await element${actionNumber}.waitForDisplayed();\n`
        code += `    await element${actionNumber}.setValue('${escapeString(action.value)}');\n\n`
      }
      break

    case 'hover':
      if (!action.selector) {
        code += `    // TODO: Add selector for hover action\n\n`
      } else {
        if (isMobile) {
          code += `    // Note: hover is not supported on mobile, using tap instead\n`
          const selector = convertToMobileSelector(action.selector, isMobile)
          code += `    const element${actionNumber} = await $('${selector}');\n`
          code += `    await element${actionNumber}.click();\n\n`
        } else {
          code += `    const element${actionNumber} = await $('${action.selector}');\n`
          code += `    await element${actionNumber}.moveTo();\n\n`
        }
      }
      break

    case 'wait':
      const waitTime = parseInt(action.value || '1000')
      code += `    await browser.pause(${waitTime});\n\n`
      break

    case 'assert':
      if (!action.selector) {
        code += `    // TODO: Add selector for assertion\n\n`
      } else {
        const selector = convertToMobileSelector(action.selector, isMobile)
        code += `    const element${actionNumber} = await $('${selector}');\n`
        code += `    await expect(element${actionNumber}).toBeDisplayed();\n\n`
      }
      break

    case 'scroll':
      if (isMobile) {
        const direction = action.value || 'down'
        code += `    // Mobile scroll: ${direction}\n`
        code += `    await driver.execute('mobile: scroll', { direction: '${direction}' });\n\n`
      } else {
        const scrollAmount = action.value || '300'
        code += `    await browser.execute((amount) => {\n`
        code += `      window.scrollBy(0, amount);\n`
        code += `    }, ${scrollAmount});\n\n`
      }
      break

    case 'swipe':
      if (isMobile) {
        const direction = action.value || 'up'
        code += `    // Mobile swipe: ${direction}\n`
        code += `    await driver.execute('mobile: swipe', { direction: '${direction}' });\n\n`
      } else {
        code += `    // Swipe action not supported on web\n\n`
      }
      break

    case 'navigate':
      if (action.value) {
        code += `    await browser.url('${action.value}');\n\n`
      }
      break

    case 'screenshot':
      code += `    await browser.saveScreenshot('screenshot-${actionNumber}.png');\n\n`
      break

    default:
      code += `    // Unknown action type: ${action.type}\n\n`
  }

  return code
}

function convertToMobileSelector(selector: string, isMobile: boolean): string {
  if (!isMobile) {
    return selector
  }

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
