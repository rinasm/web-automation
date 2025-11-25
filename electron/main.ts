import { app, BrowserWindow, ipcMain, session, clipboard } from 'electron';
import * as path from 'path';
import { setupMobileDeviceIPC } from './mobileDeviceIPC';
import { setupSpeechRecognitionIPC } from './speechRecognition';
import { getWebSocketServer, stopWebSocketServer } from './websocketServer';

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
      // Disable sandbox to allow media access
      sandbox: false,
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
  // Setup mobile device IPC handlers
  setupMobileDeviceIPC(ipcMain);

  // Setup speech recognition IPC handlers
  setupSpeechRecognitionIPC();

  // Handle microphone permission requests for speech recognition
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    console.log('🎤 Permission requested:', permission);

    // Automatically grant media permissions
    if (permission === 'media') {
      console.log('🎤 Granting media permission');
      callback(true);
    } else {
      callback(false);
    }
  });

  // Handle permission check for media devices
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, _requestingOrigin) => {
    console.log('🎤 Permission check:', permission);

    if (permission === 'media') {
      console.log('🎤 Allowing media permission check');
      return true;
    }
    return false;
  });

  createWindow();

  // Start WebSocket server for SDK connections
  if (mainWindow) {
    console.log('🟢 [Main] Starting WebSocket server for SnapTest SDK...');
    const wsServer = getWebSocketServer();
    wsServer.start(mainWindow);
  }

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

app.on('will-quit', () => {
  // Clean up WebSocket server
  console.log('🔴 [Main] Stopping WebSocket server...');
  stopWebSocketServer();
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

// Clipboard operations
ipcMain.handle('clipboard:write', async (_event, text: string) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    console.error('Failed to write to clipboard:', error);
    return { success: false, error: (error as Error).message };
  }
});

// SDK WebSocket - Send command to connected SDK
ipcMain.handle('sdk:send-command', async (_event, deviceId: string, commandType: 'startRecording' | 'stopRecording' | 'startNetworkMonitoring' | 'stopNetworkMonitoring') => {
  console.log(`📤 [IPC] Sending SDK command: ${commandType} to device ${deviceId}`);

  const wsServer = getWebSocketServer();
  const success = wsServer.sendCommand(deviceId, commandType);

  if (success) {
    console.log(`✅ [IPC] Command sent successfully`);
    return { success: true };
  } else {
    console.warn(`⚠️ [IPC] Failed to send command - device not found`);
    return { success: false, error: 'Device not connected' };
  }
});

// SDK WebSocket - Send any message to connected SDK device
ipcMain.handle('sdk:send-message', async (_event, deviceId: string, message: any) => {
  console.log(`📤 [IPC] Sending message to SDK device ${deviceId}:`, message.type);

  const wsServer = getWebSocketServer();
  const success = wsServer.sendToDevice(deviceId, message);

  if (success) {
    console.log(`✅ [IPC] Message sent successfully`);
    return { success: true };
  } else {
    console.warn(`⚠️ [IPC] Failed to send message - device not found`);
    return { success: false, error: 'Device not connected' };
  }
});

// SDK WebSocket - Refresh network detection and republish Bonjour service
ipcMain.handle('sdk:refresh-network', async () => {
  console.log(`🔄 [IPC] Refreshing network detection...`);

  const wsServer = getWebSocketServer();
  wsServer.refreshNetwork();

  console.log(`✅ [IPC] Network refresh complete`);
  return { success: true };
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
