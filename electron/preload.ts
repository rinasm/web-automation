import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getXPath: (element: any) => ipcRenderer.invoke('get-xpath', element),
  executeFlow: (steps: any[]) => ipcRenderer.invoke('execute-flow', steps),
  generateCode: (flow: any) => ipcRenderer.invoke('generate-code', flow),
});

// Type definitions for TypeScript
export interface ElectronAPI {
  getXPath: (element: any) => Promise<string>;
  executeFlow: (steps: any[]) => Promise<{ success: boolean; message: string }>;
  generateCode: (flow: any) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
