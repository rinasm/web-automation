import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../react/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for communication with renderer
ipcMain.handle('get-xpath', async (_event, element) => {
  // This will be called from the webview to get XPath
  return element;
});

ipcMain.handle('execute-flow', async (_event, steps) => {
  // Execute the flow and return results
  console.log('Executing flow:', steps);
  return { success: true, message: 'Flow executed successfully' };
});

ipcMain.handle('generate-code', async (_event, flow) => {
  // Generate Playwright code from flow
  return generatePlaywrightCode(flow);
});

function generatePlaywrightCode(flow: any): string {
  const { name, steps } = flow;

  let code = `import { test, expect } from '@playwright/test';\n\n`;
  code += `test('${name}', async ({ page }) => {\n`;
  code += `  await page.goto('${flow.url}');\n\n`;

  steps.forEach((step: any, index: number) => {
    switch (step.type) {
      case 'click':
        code += `  // Step ${index + 1}: Click element\n`;
        code += `  await page.locator('${step.selector}').click();\n\n`;
        break;
      case 'type':
        code += `  // Step ${index + 1}: Type text\n`;
        code += `  await page.locator('${step.selector}').fill('${step.value}');\n\n`;
        break;
      case 'hover':
        code += `  // Step ${index + 1}: Hover over element\n`;
        code += `  await page.locator('${step.selector}').hover();\n\n`;
        break;
      case 'wait':
        code += `  // Step ${index + 1}: Wait\n`;
        code += `  await page.waitForTimeout(${step.value});\n\n`;
        break;
      case 'assert':
        code += `  // Step ${index + 1}: Assert element visibility\n`;
        code += `  await expect(page.locator('${step.selector}')).toBeVisible();\n\n`;
        break;
    }
  });

  code += `});\n`;

  return code;
}
