import { app, BrowserWindow, ipcMain, session, clipboard } from 'electron';
import * as path from 'path';
import { setupMobileDeviceIPC } from './mobileDeviceIPC';
import { setupSpeechRecognitionIPC } from './speechRecognition';
import { getWebSocketServer, stopWebSocketServer } from './websocketServer';
import { desktopAutomationService } from './automation/desktopAutomation';

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

// Desktop Automation IPC Handlers
ipcMain.handle('desktop:get-running-applications', async () => {
  try {
    return await desktopAutomationService.getRunningApplications();
  } catch (error) {
    console.error('Failed to get running applications:', error);
    return [];
  }
});

ipcMain.handle('desktop:get-focused-application', async () => {
  try {
    return await desktopAutomationService.getFocusedApplication();
  } catch (error) {
    console.error('Failed to get focused application:', error);
    return null;
  }
});

ipcMain.handle('desktop:launch-application', async (_event, identifier: string) => {
  console.log(`🚀 Launching application: ${identifier}`);
  return await desktopAutomationService.launchApplication(identifier);
});

ipcMain.handle('desktop:focus-application', async (_event, pid: number) => {
  console.log(`🎯 Focusing application with PID: ${pid}`);
  return await desktopAutomationService.focusApplication(pid);
});

ipcMain.handle('desktop:quit-application', async (_event, pid: number) => {
  console.log(`❌ Quitting application with PID: ${pid}`);
  return await desktopAutomationService.quitApplication(pid);
});

ipcMain.handle('desktop:get-application-windows', async (_event, pid: number) => {
  try {
    return await desktopAutomationService.getApplicationWindows(pid);
  } catch (error) {
    console.error('Failed to get application windows:', error);
    return [];
  }
});

ipcMain.handle('desktop:get-element-tree', async (_event, windowId: number) => {
  try {
    return await desktopAutomationService.getElementTree(windowId);
  } catch (error) {
    console.error('Failed to get element tree:', error);
    return null;
  }
});

ipcMain.handle('desktop:find-element', async (_event, path: string) => {
  try {
    return await desktopAutomationService.findElement(path);
  } catch (error) {
    console.error('Failed to find element:', error);
    return null;
  }
});

ipcMain.handle('desktop:execute-action', async (_event, action: any) => {
  console.log(`⚡ Executing desktop action: ${action.type}`);
  return await desktopAutomationService.executeAction(action);
});

ipcMain.handle('desktop:execute-flow', async (_event, actions: any[]) => {
  console.log(`🎬 Executing desktop flow with ${actions.length} actions`);
  try {
    const results = await desktopAutomationService.executeFlow(actions);
    const failed = results.filter(r => !r.success);

    if (failed.length === 0) {
      return { success: true, data: results };
    } else {
      return {
        success: false,
        error: `${failed.length} action(s) failed`,
        data: results,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
});

ipcMain.handle('desktop:get-element-at-point', async (_event, x: number, y: number) => {
  try {
    return await desktopAutomationService.getElementAtPoint(x, y);
  } catch (error) {
    console.error('Failed to get element at point:', error);
    return null;
  }
});

// Set recording application (for window-relative coordinates)
ipcMain.handle('desktop:set-recording-application', async (_event, pid: number) => {
  console.log(`📌 Setting recording application: PID ${pid}`);
  desktopAutomationService.setRecordingApplication(pid);
  return { success: true };
});

// Set playback application (for window-relative coordinates)
ipcMain.handle('desktop:set-playback-application', async (_event, pid: number) => {
  console.log(`📌 Setting playback application: PID ${pid}`);
  desktopAutomationService.setPlaybackApplication(pid);
  return { success: true };
});

ipcMain.handle('desktop:start-recording', async () => {
  console.log('🔴 Starting desktop recording');

  try {
    // Set up callback to send actions to renderer in real-time
    desktopAutomationService.setRecordingCallback((action: any) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('desktop:action-recorded', action);
      }
    });

    await desktopAutomationService.startRecording();
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to start recording:', error);

    // Show native dialog to user
    const { dialog } = require('electron');
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Accessibility Permissions Required',
        message: 'Failed to start recording',
        detail: 'This app requires Accessibility permissions to capture keyboard and mouse events.\n\n' +
                'To enable:\n' +
                '1. Open System Settings\n' +
                '2. Go to Privacy & Security > Accessibility\n' +
                '3. Add this app (Electron) to the list and enable it\n' +
                '4. Restart the app\n\n' +
                'Error: ' + (error.message || 'Unknown error'),
        buttons: ['OK']
      });
    }

    return { success: false, error: error.message };
  }
});

ipcMain.handle('desktop:stop-recording', async () => {
  console.log('⏹️ Stopping desktop recording');
  return await desktopAutomationService.stopRecording();
});

ipcMain.handle('desktop:take-screenshot', async (_event, windowId?: number) => {
  return await desktopAutomationService.takeScreenshot(windowId);
});

ipcMain.handle('desktop:get-platform', async () => {
  return desktopAutomationService.getPlatform();
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
