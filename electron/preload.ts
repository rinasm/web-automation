import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Generic invoke for any IPC channel
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  // Generic event listener with unsubscribe
  on: (channel: string, callback: (...args: any[]) => void) => {
    const listener = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },

  // Specific methods for backwards compatibility
  getXPath: (element: any) => ipcRenderer.invoke('get-xpath', element),
  executeFlow: (steps: any[]) => ipcRenderer.invoke('execute-flow', steps),
  generateCode: (flow: any) => ipcRenderer.invoke('generate-code', flow),

  // SDK WebSocket event listeners
  onSDKConnected: (callback: (device: any) => void) => {
    ipcRenderer.on('sdk:sdk-connected', (_event, data) => callback(data.device));
  },
  onSDKDisconnected: (callback: (device: any) => void) => {
    ipcRenderer.on('sdk:sdk-disconnected', (_event, data) => callback(data.device));
  },
  onSDKEvent: (callback: (data: { device: any; event: any }) => void) => {
    ipcRenderer.on('sdk:sdk-event', (_event, data) => callback(data));
  },
  onSDKServerStarted: (callback: (port: number) => void) => {
    ipcRenderer.on('sdk:server-started', (_event, data) => callback(data.port));
  },
  onSDKServerError: (callback: (error: string) => void) => {
    ipcRenderer.on('sdk:server-error', (_event, data) => callback(data.error));
  },
  onSDKActionResult: (callback: (data: { deviceId: string; result: any }) => void) => {
    ipcRenderer.on('sdk:sdk-action-result', (_event, data) => callback(data));
  },
  onSDKExecutionLog: (callback: (data: { deviceId: string; log: any }) => void) => {
    ipcRenderer.on('sdk:sdk-execution-log', (_event, data) => callback(data));
  },
  onSDKViewHierarchyResponse: (callback: (data: { deviceId: string; response: any }) => void) => {
    ipcRenderer.on('sdk:sdk-view-hierarchy-response', (_event, data) => callback(data));
  },

  // Send command to SDK (start/stop recording, network monitoring)
  sendSDKCommand: (deviceId: string, commandType: 'startRecording' | 'stopRecording' | 'startNetworkMonitoring' | 'stopNetworkMonitoring') => {
    return ipcRenderer.invoke('sdk:send-command', deviceId, commandType);
  },

  // Send any message to SDK device (for action execution)
  sendToMobileDevice: (deviceId: string, message: any) => {
    return ipcRenderer.invoke('sdk:send-message', deviceId, message);
  },

  // Refresh network detection and republish Bonjour service
  refreshSDKNetwork: () => {
    return ipcRenderer.invoke('sdk:refresh-network');
  },

  // Remove SDK event listeners
  removeSDKListeners: () => {
    ipcRenderer.removeAllListeners('sdk:sdk-connected');
    ipcRenderer.removeAllListeners('sdk:sdk-disconnected');
    ipcRenderer.removeAllListeners('sdk:sdk-event');
    ipcRenderer.removeAllListeners('sdk:server-started');
    ipcRenderer.removeAllListeners('sdk:server-error');
    ipcRenderer.removeAllListeners('sdk:sdk-action-result');
    ipcRenderer.removeAllListeners('sdk:sdk-execution-log');
    ipcRenderer.removeAllListeners('sdk:sdk-view-hierarchy-response');
  },

  // Desktop Automation APIs
  desktop: {
    // Get list of running applications
    getRunningApplications: () => ipcRenderer.invoke('desktop:get-running-applications'),

    // Get focused application
    getFocusedApplication: () => ipcRenderer.invoke('desktop:get-focused-application'),

    // Launch application
    launchApplication: (identifier: string) => ipcRenderer.invoke('desktop:launch-application', identifier),

    // Focus application
    focusApplication: (pid: number) => ipcRenderer.invoke('desktop:focus-application', pid),

    // Quit application
    quitApplication: (pid: number) => ipcRenderer.invoke('desktop:quit-application', pid),

    // Get application windows
    getApplicationWindows: (pid: number) => ipcRenderer.invoke('desktop:get-application-windows', pid),

    // Get element tree
    getElementTree: (windowId: number) => ipcRenderer.invoke('desktop:get-element-tree', windowId),

    // Find element
    findElement: (path: string) => ipcRenderer.invoke('desktop:find-element', path),

    // Execute action
    executeAction: (action: any) => ipcRenderer.invoke('desktop:execute-action', action),

    // Execute flow
    executeFlow: (actions: any[]) => ipcRenderer.invoke('desktop:execute-flow', actions),

    // Get element at point
    getElementAtPoint: (x: number, y: number) => ipcRenderer.invoke('desktop:get-element-at-point', x, y),

    // Recording
    setRecordingApplication: (pid: number) => ipcRenderer.invoke('desktop:set-recording-application', pid) as Promise<{ success: boolean }>,
    setPlaybackApplication: (pid: number) => ipcRenderer.invoke('desktop:set-playback-application', pid) as Promise<{ success: boolean }>,
    startRecording: () => ipcRenderer.invoke('desktop:start-recording') as Promise<{ success: boolean; error?: string }>,
    stopRecording: () => ipcRenderer.invoke('desktop:stop-recording'),

    // Event listener for real-time action recording
    onActionRecorded: (callback: (action: any) => void) => {
      const subscription = (_event: any, action: any) => callback(action);
      ipcRenderer.on('desktop:action-recorded', subscription);
      return () => ipcRenderer.removeListener('desktop:action-recorded', subscription);
    },

    // Screenshot
    takeScreenshot: (windowId?: number) => ipcRenderer.invoke('desktop:take-screenshot', windowId),

    // Get platform
    getPlatform: () => ipcRenderer.invoke('desktop:get-platform'),
  },
});

// Type definitions for TypeScript
export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  getXPath: (element: any) => Promise<string>;
  executeFlow: (steps: any[]) => Promise<{ success: boolean; message: string }>;
  generateCode: (flow: any) => Promise<string>;

  // SDK WebSocket event listeners
  onSDKConnected: (callback: (device: any) => void) => void;
  onSDKDisconnected: (callback: (device: any) => void) => void;
  onSDKEvent: (callback: (data: { device: any; event: any }) => void) => void;
  onSDKServerStarted: (callback: (port: number) => void) => void;
  onSDKServerError: (callback: (error: string) => void) => void;
  onSDKActionResult: (callback: (data: { deviceId: string; result: any }) => void) => void;
  onSDKExecutionLog: (callback: (data: { deviceId: string; log: any }) => void) => void;
  onSDKViewHierarchyResponse: (callback: (data: { deviceId: string; response: any }) => void) => void;
  sendSDKCommand: (deviceId: string, commandType: 'startRecording' | 'stopRecording' | 'startNetworkMonitoring' | 'stopNetworkMonitoring') => Promise<{ success: boolean; error?: string }>;
  sendToMobileDevice: (deviceId: string, message: any) => Promise<{ success: boolean; error?: string }>;
  refreshSDKNetwork: () => Promise<{ success: boolean }>;
  removeSDKListeners: () => void;

  // Desktop Automation APIs
  desktop: {
    getRunningApplications: () => Promise<any[]>;
    getFocusedApplication: () => Promise<any | null>;
    launchApplication: (identifier: string) => Promise<{ success: boolean; error?: string }>;
    focusApplication: (pid: number) => Promise<{ success: boolean; error?: string }>;
    quitApplication: (pid: number) => Promise<{ success: boolean; error?: string }>;
    getApplicationWindows: (pid: number) => Promise<any[]>;
    getElementTree: (windowId: number) => Promise<any | null>;
    findElement: (path: string) => Promise<any | null>;
    executeAction: (action: any) => Promise<{ success: boolean; error?: string; data?: any }>;
    executeFlow: (actions: any[]) => Promise<{ success: boolean; error?: string; data?: any }>;
    getElementAtPoint: (x: number, y: number) => Promise<any | null>;
    setRecordingApplication: (pid: number) => Promise<{ success: boolean }>;
    setPlaybackApplication: (pid: number) => Promise<{ success: boolean }>;
    startRecording: () => Promise<{ success: boolean; error?: string }>;
    stopRecording: () => Promise<any[]>;
    onActionRecorded: (callback: (action: any) => void) => () => void;
    takeScreenshot: (windowId?: number) => Promise<string>;
    getPlatform: () => Promise<string>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
