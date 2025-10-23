# Playwright Test Generator

A desktop application built with Electron that enables visual generation of Playwright test code through an intuitive point-and-click interface.

## Features

- **Visual Test Creation**: Load any website and create tests by interacting with elements
- **Element Selector Capture**: Click on elements to automatically capture XPath selectors
- **Multiple Step Types**: Support for click, type, hover, wait, and assertion actions
- **Flow Management**: Create and manage multiple test flows
- **Live Preview**: See the website you're testing in real-time
- **Code Generation**: Export your flows as ready-to-use Playwright test scripts
- **Play Flow**: Test your automation flow before generating code

## Tech Stack

- **Electron**: Cross-platform desktop application framework
- **React**: UI component library
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first styling
- **Zustand**: Lightweight state management
- **Vite**: Fast build tool and dev server
- **Playwright**: Browser automation library

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

Run the application in development mode:

```bash
npm run dev
```

This will start both the React dev server and Electron app concurrently.

### Building

Build the React app and Electron main process:

```bash
npm run build
```

### Packaging

Create a distributable package:

```bash
npm run package
```

## Project Structure

```
.
├── electron/              # Electron main process
│   ├── main.ts           # Main Electron entry point
│   └── preload.ts        # Preload script for IPC
├── src/
│   ├── components/       # React components
│   │   ├── UrlInput.tsx  # Initial URL input screen
│   │   ├── WebView.tsx   # Website iframe viewer
│   │   ├── FlowPanel.tsx # Main flow control panel
│   │   ├── FlowList.tsx  # Flow list component
│   │   ├── StepList.tsx  # Step management
│   │   └── CodeModal.tsx # Code generation modal
│   ├── store/            # State management
│   │   └── flowStore.ts  # Zustand store for flows/steps
│   ├── utils/            # Utility functions
│   │   ├── xpath.ts      # XPath selector generation
│   │   └── codeGenerator.ts # Playwright code generation
│   ├── App.tsx           # Root component
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Usage

1. **Launch the app** and enter a website URL
2. **Create a Flow** using the "Create Flow" button
3. **Add Steps** to define your test actions:
   - Click the "Add Step" button
   - Choose the step type (click, type, hover, etc.)
   - Click the target icon to capture element selectors
   - Click on elements in the website preview to capture their XPath
4. **Play Flow** to test your automation in real-time
5. **Generate Code** to export as Playwright test script
6. **Copy** the generated code to your test files

## Step Types

- **Click**: Click on an element
- **Type**: Enter text into an input field
- **Hover**: Hover over an element
- **Wait**: Pause execution for specified milliseconds
- **Assert Visible**: Verify an element is visible

## License

MIT
