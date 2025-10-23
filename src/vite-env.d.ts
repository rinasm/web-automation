/// <reference types="vite/client" />

interface ElectronAPI {
  getXPath: (element: any) => Promise<string>
  executeFlow: (steps: any[]) => Promise<{ success: boolean; message: string }>
  generateCode: (flow: any) => Promise<string>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        style?: React.CSSProperties
        partition?: string
        allowpopups?: string
        preload?: string
      }
    }
  }
}

export {}
