# SnapTest - Application Summary

## Tech Stack
- **Frontend**: React 18.2 + TypeScript + Vite + Tailwind CSS
- **Desktop**: Electron 28.0 (multi-process architecture with IPC)
- **Mobile SDK**: SnapTestSDK (Swift/UIKit) for iOS test automation
- **State Management**: Zustand 4.4
- **Test Framework**: Playwright 1.40 + Appium 2.19
- **Real-time Communication**: WebSocket (ws 8.18) + Bonjour/mDNS service discovery
- **AI Integration**: Anthropic Claude API, OpenAI, Groq SDK
- **Mobile Automation**: WebDriverIO 9.20 + Appium XCUITest Driver 7.35
- **Voice**: Whisper WebGPU 0.10 for speech recognition
- **Styling**: Lucide React icons + React Syntax Highlighter

## Core Features

### Test Automation
- **Manual Flow**: Point-and-click interface for manual test step creation
- **Auto Flow**: Automatic detection of common user journeys (login, forms, search)
- **AI Explore**: Claude-powered autonomous exploration and journey discovery
- **Code Generation**: Export test flows as ready-to-use Playwright scripts
- **Selector Capture**: Visual element picker with XPath generation
- **Flow Execution**: Run test flows directly from desktop app

### Mobile Testing (iOS)
- **Live Device Connection**: WebSocket-based communication with iOS devices
- **Auto-Discovery**: Bonjour/mDNS for zero-config device discovery
- **Touch Event Capture**: Record taps, swipes, and gestures in real-time
- **View Hierarchy Inspector**: Capture complete UI structure with properties
- **Action Execution**: Remote tap, type, swipe commands via SDK
- **Network Monitoring**: Intercept and display HTTP/HTTPS traffic from iOS app
- **Screen Mirroring**: Live preview of mobile device screen in desktop app

### AI-Powered
- **Voice to Text**: Convert voice commands to test flows using Whisper
- **AI Journey Discovery**: Intelligent exploration of application flows
- **Code Generation**: AI-assisted Playwright test script generation
- **UI Analysis**: (Planned) AI-powered UI element analysis with Claude

### Network Features
- **HTTP Traffic Capture**: Real-time network request/response monitoring
- **HAR Export**: Export network logs in HAR format
- **Request Filtering**: Filter by method, status, URL patterns
- **Detail View**: Headers, body, timing, response preview
- **Resizable Panel**: Adjustable network panel width

### Developer Experience
- **Hot Reload**: Instant updates during development
- **TypeScript**: Full type safety across codebase
- **Cross-Platform**: macOS, Windows, Linux support via Electron Builder
- **Modular Architecture**: Separation of concerns (main, renderer, preload)
- **IPC Security**: Context isolation with secure context bridge

## Key Dependencies

### Core Runtime
- `electron` ^28.0.0 - Desktop application framework
- `react` ^18.2.0 + `react-dom` ^18.2.0 - UI framework
- `zustand` ^4.4.7 - Lightweight state management
- `ws` ^8.18.3 - WebSocket server/client
- `bonjour-service` ^1.3.0 - Service discovery (mDNS/Bonjour)

### Test Automation
- `playwright` ^1.40.1 + `@playwright/test` ^1.40.1 - Browser automation
- `appium` ^2.19.0 - Mobile automation server
- `appium-xcuitest-driver` ^7.35.1 - iOS automation driver
- `webdriverio` ^9.20.0 - WebDriver protocol implementation
- `@devicefarmer/adbkit` ^3.2.6 - Android Debug Bridge toolkit

### AI Services
- `@anthropic-ai/sdk` ^0.68.0 - Claude AI integration
- `openai` ^6.8.1 - OpenAI API client
- `groq-sdk` ^0.34.0 - Groq AI integration
- `whisper-webgpu` ^0.10.0 - Speech-to-text (WebGPU accelerated)

### Utilities
- `xml2js` ^0.6.2 - XML parsing for mobile view hierarchies
- `chrome-remote-interface` ^0.33.2 - Chrome DevTools Protocol
- `lucide-react` ^0.294.0 - Icon library
- `react-syntax-highlighter` ^16.1.0 - Code syntax highlighting
- `node-fetch` ^2.7.0 - HTTP client

### Build & Dev Tools
- `typescript` ^5.3.3 - Type checking
- `vite` ^5.0.8 - Fast build tool and dev server
- `tailwindcss` ^3.3.6 + `autoprefixer` ^10.4.16 - CSS framework
- `electron-builder` ^24.9.1 - Application packaging
- `concurrently` ^8.2.2 - Run multiple commands simultaneously
- `eslint` ^8.55.0 - Code linting

## Architecture Highlights
- **Multi-Process**: Electron main (Node.js) + renderer (React) + preload (bridge)
- **Event-Driven**: WebSocket events for iOS SDK communication
- **Store-Based**: Zustand stores for flows, network, device state
- **Service-Oriented**: Dedicated services for code generation, AI, network listening
- **Type-Safe**: TypeScript across all layers with strict typing
- **Secure IPC**: Context bridge exposes only necessary APIs to renderer

## Development Commands
- `npm run dev` - Start React dev server + Electron (hot reload enabled)
- `npm run build` - Build production bundles for React + Electron
- `npm run package` - Create distributable packages (macOS/Windows/Linux)
- `npm test` - Run Playwright tests
- `npm run lint` - Lint TypeScript/React code

## Target Platforms
- **macOS**: .app bundle (Developer Tools category)
- **Windows**: NSIS installer
- **Linux**: AppImage
- **iOS**: SnapTestSDK integration (Swift Package)
