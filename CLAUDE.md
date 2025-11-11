# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application that enables users to visually generate Playwright test code by interacting with websites loaded in the app. It offers three powerful modes:

1. **Manual Flow**: Point-and-click interface to manually define test steps
2. **Auto Flow**: Automatic detection of common user journeys (login, forms, search)
3. **AI Explore** (NEW): Intelligent journey discovery powered by Claude AI that autonomously explores your application and discovers meaningful user flows

Users can create flows, record interactions, and export ready-to-use Playwright scripts.

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

## AI-Powered Journey Exploration

### Overview
The **AI Explore** feature uses Anthropic's Claude AI to intelligently discover meaningful user journeys by autonomously exploring your web application.

### Architecture
Key components:

1. **Claude Service** (`src/services/claudeService.ts`):
   - Handles API communication with Anthropic
   - Manages API key storage (localStorage)
   - Supports message history and system prompts

2. **AI Decision Service** (`src/services/aiDecisionService.ts`):
   - Analyzes page context (title, content, elements)
   - Decides next actions (which element to click)
   - Detects journey completion
   - Generates journey names
   - Filters noise elements (logout, help, etc.)

3. **Exploration Controller** (`src/services/explorationController.ts`):
   - Orchestrates exploration loop
   - Manages journey tree building
   - Handles backtracking and path tracking
   - Emits events for UI updates
   - Converts journeys to test steps

4. **UI Components**:
   - `AIExplorationPanel.tsx`: Main exploration interface
   - `JourneyCompletionDialog.tsx`: Journey confirmation UI
   - `ApiKeyDialog.tsx`: API key configuration

### How It Works

1. **Page Analysis**: Extract URL, title, heading, visible text, and interactable elements
2. **AI Decision**: Claude analyzes context and decides to click an element or complete
3. **Action Execution**: Click element, wait for page load, capture new state
4. **Tree Building**: Create child node, check for loops, recurse
5. **Completion**: When AI detects goal achieved, pause for user confirmation
6. **Conversion**: Convert approved journeys to manual flow format

### AI Prompts
The system uses two main prompts:

**System Prompt**: Establishes AI as QA automation expert with goals:
- Discover business-critical flows
- Prioritize common user tasks
- Avoid utility and destructive actions

**Decision Prompt**: Provides per-page context:
- Current journey path
- Page information (URL, title, content)
- Available elements with descriptions
- Request JSON response with next action

### Configuration
Located in `ExplorationController`:
```typescript
{
  maxDepth: 10,              // Maximum clicks deep
  waitTimeBetweenActions: 2000, // Wait time in ms
  ignoreElements: [],        // Patterns to ignore
  autoSaveJourneys: false,   // Auto-save without confirmation
  explorationStrategy: 'ai-guided' // Strategy type
}
```

### API Key Management
- Stored in localStorage (`anthropic_api_key`)
- Can also use environment variable (`VITE_ANTHROPIC_API_KEY`)
- Never sent to backend servers
- Required for AI Explore functionality

### Journey Data Structure
```typescript
interface ExploredJourney {
  id: string
  name: string // AI-generated name
  path: JourneyTreeNode[] // Sequence from root to completion
  confidence: number // 0-100
  completionReason: string
  steps: JourneyStep[] // Converted to manual format
  status: 'pending' | 'confirmed' | 'discarded'
}
```

### Adding Custom Logic
To customize AI decisions:

1. Modify noise filters in `aiDecisionService.ts`:
```typescript
private isNoiseElement(el: InteractableElement): boolean {
  // Add custom patterns here
}
```

2. Adjust system prompt in `aiDecisionService.ts`:
```typescript
private systemPrompt = `...your custom instructions...`
```

3. Change exploration strategy in config:
```typescript
explorationStrategy: 'depth-first' | 'breadth-first' | 'ai-guided'
```

### Debugging
Enable detailed logging:
```typescript
console.log('🤖 [AI]', decision)
console.log('📍 [EXPLORATION]', state)
console.log('🎯 [JOURNEY]', journey)
```

All exploration events are logged with emoji prefixes for easy filtering.

### Performance
- Average API call: 1-3 seconds
- Tokens per page: 500-1500 input, 200-500 output
- Session cost: $0.05-$0.30 (typical 10-click exploration)

For detailed usage guide, see [AI_EXPLORATION_GUIDE.md](./AI_EXPLORATION_GUIDE.md).

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
