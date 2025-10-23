# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application that enables users to visually generate Playwright test code by interacting with websites loaded in the app. Users can point-and-click on elements, define test steps, and export ready-to-use Playwright scripts.

## Development Commands

### Setup
```bash
npm install
```

### Running the App
```bash
npm run dev              # Start both React dev server and Electron (recommended for development)
npm run dev:react        # Start only React dev server on port 5173
npm run dev:electron     # Compile TypeScript and start Electron
```

### Building
```bash
npm run build            # Build both React and Electron
npm run build:react      # Build React app to dist/react/
npm run build:electron   # Compile Electron TypeScript to dist/electron/
npm run package          # Create distributable package using electron-builder
```

### Other
```bash
npm run lint             # Run ESLint
npm run preview          # Preview production React build
npm test                 # Run Playwright tests (for testing generated code)
```

## Architecture

### Core Components Split

The application follows Electron's multi-process architecture:

1. **Main Process** (`electron/main.ts`):
   - Creates BrowserWindow
   - Handles IPC communication
   - Manages native OS integration
   - Contains code generation logic in `generatePlaywrightCode()`

2. **Renderer Process** (`src/`):
   - React-based UI
   - Handles user interactions
   - Manages test flow state via Zustand
   - Renders website preview via iframe

3. **Preload Script** (`electron/preload.ts`):
   - Exposes secure IPC channels via `contextBridge`
   - Provides typed API: `window.electronAPI`

### State Management

The app uses Zustand (`src/store/flowStore.ts`) for centralized state management:

- **Flows**: Test flows (similar to Playwright test suites)
- **Steps**: Individual test actions within flows
- **Selector Capture State**: Tracks when user is capturing element selectors

Key state structure:
```typescript
{
  flows: Flow[],                    // All test flows
  currentFlowId: string | null,     // Active flow being edited
  currentUrl: string,               // Website URL being tested
  isCapturingSelector: boolean,     // Whether selector capture mode is active
  capturingStepId: string | null    // Which step is receiving captured selector
}
```

### Key User Flow

1. User enters URL → `UrlInput` component → loads in `WebView` iframe
2. User creates flow → stored in Zustand store
3. User adds steps → each step needs type + selector + optional value
4. User clicks selector capture → `startCapturingSelector()` enables capture mode
5. User clicks element in iframe → `getXPathForElement()` generates XPath → stored in step
6. User clicks "Play Flow" → IPC call to main process → executes flow
7. User clicks "Generate Code" → `generatePlaywrightCode()` creates test script → shown in modal

### Selector Capture Mechanism

The selector capture feature (`src/components/WebView.tsx`) works by:

1. Injecting CSS and event listeners into the iframe document
2. Highlighting elements on mouseover (DevTools inspector-like)
3. Capturing XPath on click via `getXPathForElement()` utility
4. Removing event listeners after capture

**Important**: This only works for same-origin iframes or when CORS permits. For production use with arbitrary websites, consider using Electron's webview tag or separate BrowserView.

### Code Generation

The `generatePlaywrightCode()` function (`src/utils/codeGenerator.ts`) transforms flow definitions into Playwright test syntax:

- Maps each step type to appropriate Playwright API calls
- Handles escaping for selectors and values
- Generates complete test file with imports and test wrapper

Supported mappings:
- `click` → `page.locator().click()`
- `type` → `page.locator().fill()`
- `hover` → `page.locator().hover()`
- `wait` → `page.waitForTimeout()`
- `assert` → `expect(page.locator()).toBeVisible()`

### XPath Generation Strategy

The `getXPathForElement()` utility (`src/utils/xpath.ts`) prioritizes selectors in this order:

1. ID attribute (most stable)
2. Unique attributes (data-testid, data-test, name, aria-label)
3. Full path from root with tag names and classes

This ensures generated selectors are both unique and reasonably maintainable.

## Important Notes

### TypeScript Configuration

- `tsconfig.json`: React/Vite renderer process (uses JSX, no emit)
- `tsconfig.electron.json`: Electron main process (CommonJS, emits to dist/electron/)
- `tsconfig.node.json`: Vite config file

### IPC Security

Always use `contextBridge` in preload scripts. Never enable `nodeIntegration` or disable `contextIsolation` in production.

### WebView Implementation

The app uses Electron's `<webview>` tag to load external websites, which bypasses CORS/X-Frame-Options restrictions that would block standard iframes.

Key implementation details:
- Enabled via `webviewTag: true` in BrowserWindow preferences
- Uses `executeJavaScript()` to inject selector capture functionality
- Listens for `dom-ready` event before injecting scripts
- Communication via `window.postMessage()` from webview to renderer
- TypeScript declarations in `src/vite-env.d.ts` for JSX support

### Building for Distribution

The `electron-builder` configuration in `package.json` defines:
- Output directory: `release/`
- Included files: `dist/**/*` and `package.json`
- Platform-specific targets (macOS app, Windows NSIS, Linux AppImage)

When packaging, ensure both React and Electron builds are up-to-date.

## Adding New Step Types

To add a new step type:

1. Add to `StepType` union in `src/store/flowStore.ts`
2. Add to `stepTypes` array in `src/components/StepList.tsx`
3. Add case in `generateStepCode()` in `src/utils/codeGenerator.ts`
4. Update UI in `StepList.tsx` if special input fields needed

## Debugging

- React DevTools: Available in development mode
- Electron DevTools: Opens automatically in dev mode (`mainWindow.webContents.openDevTools()`)
- Main process logs: Check terminal running `npm run dev`
- Renderer process logs: Check Electron DevTools console
