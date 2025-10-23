import { Step, Action } from '../store/stepStore'

export function generatePlaywrightCode(step: Step & { url: string }): string {
  const { name, actions, url } = step

  let code = `import { test, expect } from '@playwright/test';\n\n`
  code += `test('${sanitizeTestName(name)}', async ({ page }) => {\n`
  code += `  // Navigate to the target URL\n`
  code += `  await page.goto('${url}');\n\n`

  actions.forEach((action, index) => {
    code += generateActionCode(action, index + 1)
  })

  code += `});\n`

  return code
}

function generateActionCode(action: Action, actionNumber: number): string {
  let code = `  // Action ${actionNumber}: ${getActionDescription(action)}\n`

  switch (action.type) {
    case 'click':
      if (!action.selector) {
        code += `  // TODO: Add selector for click action\n\n`
      } else {
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

    default:
      code += `  // Unknown action type: ${action.type}\n\n`
  }

  return code
}

function getActionDescription(action: Action): string {
  switch (action.type) {
    case 'click':
      return 'Click element'
    case 'type':
      return `Type "${action.value || 'text'}"`
    case 'hover':
      return 'Hover over element'
    case 'wait':
      return `Wait ${action.value || '1000'}ms`
    case 'assert':
      return 'Assert element is visible'
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
