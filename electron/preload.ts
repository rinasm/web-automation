import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Generic invoke for any IPC channel
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

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

  // Send command to SDK (start/stop recording)
  sendSDKCommand: (deviceId: string, commandType: 'startRecording' | 'stopRecording') => {
    return ipcRenderer.invoke('sdk:send-command', deviceId, commandType);
  },

  // Send any message to SDK device (for action execution)
  sendToMobileDevice: (deviceId: string, message: any) => {
    return ipcRenderer.invoke('sdk:send-message', deviceId, message);
  },

  // Remove SDK event listeners
  removeSDKListeners: () => {
    ipcRenderer.removeAllListeners('sdk:sdk-connected');
    ipcRenderer.removeAllListeners('sdk:sdk-disconnected');
    ipcRenderer.removeAllListeners('sdk:sdk-event');
    ipcRenderer.removeAllListeners('sdk:server-started');
    ipcRenderer.removeAllListeners('sdk:server-error');
    ipcRenderer.removeAllListeners('sdk:sdk-action-result');
  },
});

// Type definitions for TypeScript
export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
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
  sendSDKCommand: (deviceId: string, commandType: 'startRecording' | 'stopRecording') => Promise<{ success: boolean; error?: string }>;
  sendToMobileDevice: (deviceId: string, message: any) => Promise<{ success: boolean; error?: string }>;
  removeSDKListeners: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
