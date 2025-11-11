# SnapTest Multi-Platform Architecture Restructuring Plan

## 🎯 Executive Summary

Transform SnapTest from a web-only automation tool into a **unified multi-platform test automation platform** that elegantly handles Web, iOS, and Android test generation with a clean, intuitive UX.

**User Preferences Applied:**
- ✅ Authentication: Simple localStorage (current)
- ✅ Step Naming: AI auto-generates step names
- ✅ Mobile App Config: Per-project (recommended)
- ✅ Platform Toggle: Project-level toggle (strict visibility control)
- ✅ **Platform Isolation: All platform-specific data hidden when not in that mode**

---

## 📊 New Data Architecture

### 1. Enhanced Project Model
```typescript
interface Project {
  id: string
  title: string
  description: string
  webUrl?: string  // Optional: for web testing
  mobileApps?: {   // Optional: for mobile testing (per-project config)
    ios?: { bundleId: string, appName: string }
    android?: { packageName: string, appName: string }
  }
  currentPlatform: 'web' | 'mobile'  // Project-level toggle
  createdAt: number
  lastEdited: number
  features: Feature[]  // NEW: Features belong to projects
}
```

**Changes from Current:**
- Add `mobileApps` object for per-project iOS/Android configuration
- Add `currentPlatform` for project-level platform toggle
- Remove standalone `url` field, replace with `webUrl`
- Add `features` array (currently projects have no features)

### 2. Feature Model (NEW - Core Abstraction)
```typescript
interface Feature {
  id: string
  projectId: string
  name: string  // e.g., "User Login", "Add to Cart"
  descriptionWeb?: string     // Feature description for web
  descriptionMobile?: string  // Feature description for mobile
  stepsWeb: Step[]      // Steps specific to web platform
  stepsMobile: Step[]   // Steps specific to mobile platform
  status: 'draft' | 'generated' | 'completed'
  createdAt: number
  lastEdited: number
}
```

**Why Feature Model:**
- Single feature can have different implementations per platform
- Web login might be: Navigate → Fill form → Click button
- Mobile login might be: Tap login → Fill username → Fill password → Tap sign in
- Keeps platform-specific logic organized and separate

### 3. Step Model (Enhanced)
```typescript
interface Step {
  id: string
  featureId: string
  platform: 'web' | 'mobile'
  name: string  // AI-generated (e.g., "Enter username", "Click submit button")
  actions: Action[]
  order: number  // Sequence within feature
  createdAt: number
}
```

**Changes from Current:**
- Add `featureId` to link step to feature
- Add `platform` to distinguish web vs mobile steps
- `name` is now AI-generated instead of user-provided
- Add `order` for explicit sequencing

### 4. Action Model (Unchanged, but Platform-Aware)
```typescript
interface Action {
  id: string
  type: 'click' | 'type' | 'hover' | 'wait' | 'assert' | 'swipe' | 'scroll' | 'navigate' | 'screenshot'
  selector: string  // XPath or accessibility ID
  value?: string
  description?: string
}
```

**Platform-Specific Action Types:**
- Web: click, type, hover, wait, assert, scroll, navigate, screenshot
- Mobile: click (tap), type, wait, assert, swipe, scroll, navigate, screenshot
- Note: `hover` is invalid on mobile (will be converted to tap in code gen)

---

## 🔒 Platform Visibility Rules (CRITICAL)

### **Strict Platform Isolation**

The application enforces **complete platform isolation** based on the global platform toggle. Users can only see and interact with data relevant to the currently selected platform.

#### **Visibility Matrix**

| Component | Web Mode (🌐) | Mobile Mode (📱) |
|-----------|---------------|------------------|
| **Feature Name** | ✅ Visible | ✅ Visible |
| **Feature Description** | Only `descriptionWeb` | Only `descriptionMobile` |
| **Steps** | Only `stepsWeb` | Only `stepsMobile` |
| **Actions** | Only web actions | Only mobile actions |
| **Code Generation** | Playwright only | WebDriverIO only |
| **Simulation** | Web preview only | Mobile preview only |
| **Device Selector** | ❌ Hidden | ✅ Visible |
| **URL Input** | ✅ Visible | ❌ Hidden |
| **Mobile App Config** | ❌ Hidden | ✅ Visible |

#### **Feature Card Display Logic**

```typescript
// Feature card rendering logic
function renderFeatureCard(feature: Feature, platform: 'web' | 'mobile') {
  const steps = platform === 'web' ? feature.stepsWeb : feature.stepsMobile
  const description = platform === 'web' ? feature.descriptionWeb : feature.descriptionMobile

  // Only show if feature has steps for this platform
  const hasStepsForPlatform = steps.length > 0

  return (
    <FeatureCard
      name={feature.name}
      description={description}  // Platform-specific description only
      steps={steps}              // Platform-specific steps only
      stepCount={steps.length}
      canGenerate={!hasStepsForPlatform}
      canPlay={hasStepsForPlatform}
      canGenerateCode={hasStepsForPlatform}
    />
  )
}
```

#### **Platform Badge Behavior**

**Feature Platform Indicators:**
- Shows which platforms have steps configured
- Example: `Web ✓ Mobile ✗` means web steps exist, mobile steps don't
- **Badge is informational only** - doesn't change step visibility
- Clicking badge does NOT switch platforms (only global toggle does)

#### **Empty State Handling**

**When Platform = Web, but no `stepsWeb`:**
```
┌─────────────────────────────────────────────┐
│ 🎯 User Login                               │
│    Status: Draft                            │
│    Platforms: Web ✗  Mobile ✓              │
│                                             │
│    No web steps created yet.                │
│    [Generate Web Steps]                     │
└─────────────────────────────────────────────┘
```

**When Platform = Mobile, but no `stepsMobile`:**
```
┌─────────────────────────────────────────────┐
│ 🎯 User Login                               │
│    Status: Draft                            │
│    Platforms: Web ✓  Mobile ✗              │
│                                             │
│    No mobile steps created yet.             │
│    [Generate Mobile Steps]                  │
└─────────────────────────────────────────────┘
```

#### **Code Generation Visibility**

**Web Mode:**
- Only "Generate Playwright Code" button visible
- WebDriverIO options completely hidden

**Mobile Mode:**
- Only "Generate WebDriverIO Code" button visible
- Playwright option completely hidden

#### **Data Entry Isolation**

**Feature Creation Dialog:**
- Web description field: Always visible but grayed out if no web URL configured
- Mobile description field: Always visible but grayed out if no mobile apps configured
- User can fill both, but generation respects platform context

**Step Editing:**
- When editing a feature in Web mode: Can only see/edit `stepsWeb`
- When editing a feature in Mobile mode: Can only see/edit `stepsMobile`
- No mixed views - absolute platform separation

#### **Implementation Enforcement**

```typescript
// All components must use this hook
function usePlatformFilter() {
  const currentPlatform = useProjectStore(state => state.currentPlatform)

  const filterSteps = (feature: Feature): Step[] => {
    return currentPlatform === 'web' ? feature.stepsWeb : feature.stepsMobile
  }

  const filterDescription = (feature: Feature): string | undefined => {
    return currentPlatform === 'web' ? feature.descriptionWeb : feature.descriptionMobile
  }

  return { currentPlatform, filterSteps, filterDescription }
}
```

---

## 🎨 New UI/UX Flow

### **Phase 1: Authentication (Unchanged)**
- Simple localStorage-based login
- Username-only authentication
- Minimal friction to get started

**Current Implementation:** `src/pages/Login.tsx` - No changes needed

---

### **Phase 2: Dashboard (Enhanced)**

**Current State:**
```
Create Project Modal:
- Project Title
- Website URL
- Description
```

**New State:**
```
┌─────────────────────────────────────────────────────┐
│  Create New Project                                 │
│                                                     │
│  Project Details:                                   │
│  • Name: [E-commerce Tests               ]         │
│  • Description: [Automation tests for...  ]         │
│                                                     │
│  Web Configuration:                                 │
│  • URL: [https://example.com             ]         │
│                                                     │
│  Mobile Configuration (Optional):                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ iOS App                                     │  │
│  │ Bundle ID: [com.example.app       ]        │  │
│  │ App Name:  [Example App           ]        │  │
│  │                              [Clear iOS]    │  │
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │ Android App                                 │  │
│  │ Package:   [com.example.app       ]        │  │
│  │ App Name:  [Example App           ]        │  │
│  │                           [Clear Android]   │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  [Create Project] [Cancel]                          │
└─────────────────────────────────────────────────────┘
```

**Visual Indicators on Project Cards:**
```
┌──────────────────────────┐
│ 🌐 📱 E-commerce Tests   │  ← Shows web + mobile icons
│                          │
│ Web: example.com         │
│ iOS: MyApp               │
│ Android: MyApp           │
│                          │
│ Edited Jan 15, 2025      │
└──────────────────────────┘
```

**Files to Modify:**
- `src/pages/Dashboard.tsx` - Enhanced project creation modal
- `src/components/MobileAppConfigDialog.tsx` (NEW) - Reusable mobile config component

---

### **Phase 3: Project View (Completely Redesigned)**

#### **Top Navigation**
```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo] [HOME] [Project Tab] ... [🌐 Web / 📱 Mobile] [Device] [User]  │
│                                         ↑                               │
│                                  Project-level toggle                   │
│                                  (switches ALL features)                │
└────────────────────────────────────────────────────────────────────────┘
```

**Toggle Behavior:**
- When toggled to Web: All features show `stepsWeb`
- When toggled to Mobile: All features show `stepsMobile`
- Toggle state is saved in project (`currentPlatform`)

#### **Left Sidebar (Simplified)**

**Default Mode (Simple):**
```
┌──────────────┐
│ 📋 Features  │ ← Primary tab (default)
│ ⚙️ Settings  │
│ 🔧 Advanced  │ ← Toggle to show advanced features
└──────────────┘
```

**Advanced Mode Enabled:**
```
┌──────────────────┐
│ 📋 Features      │
│ 🤖 Auto Flow     │ ← Only visible in advanced mode
│ 🧠 AI Explore    │ ← Only visible in advanced mode
│ 📊 Results       │
│ 📈 Reports       │
│ ⚙️ Settings      │
└──────────────────┘
```

**Advanced Mode Toggle:**
- Located in Settings tab
- OFF by default (clean, minimal UX)
- Persisted per user in localStorage

#### **Main Content Area (Features Tab)**

**When Platform = Web:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Features (Web Mode)                         [+ Create Feature]     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 🎯 User Login                                              │    │
│  │    Status: ✓ Generated                                     │    │
│  │    Platforms: Web ✓  Mobile ✓  ← (info only, not clickable)│   │
│  │    [⚡ Play] [📝 Edit] [💾 Generate Code] [🗑️ Delete]       │    │
│  │                                                             │    │
│  │    Steps (3):  ← ONLY shows Web steps                      │    │
│  │      1. Navigate to login page                             │    │
│  │         • Navigate to /login                               │    │
│  │      2. Enter credentials                                  │    │
│  │         • Type "user@example.com" into email field         │    │
│  │         • Type "password123" into password field           │    │
│  │      3. Submit login form                                  │    │
│  │         • Click submit button                              │    │
│  │                                                             │    │
│  │    ℹ️ Mobile steps hidden in Web mode                       │    │
│  │    [Regenerate Steps] [Simulate Web]                       │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 🛒 Add to Cart                                             │    │
│  │    Status: Draft                                           │    │
│  │    Platforms: Web ✗  Mobile ✗                              │    │
│  │    [Generate Steps]                                        │    │
│  │                                                             │    │
│  │    Description (Web):                                      │    │
│  │    Add an item to the shopping cart from product page      │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

**When Platform = Mobile:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Features (Mobile Mode)                      [+ Create Feature]     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 🎯 User Login                                              │    │
│  │    Status: ✓ Generated                                     │    │
│  │    Platforms: Web ✓  Mobile ✓  ← (info only, not clickable)│   │
│  │    [⚡ Play] [📝 Edit] [💾 Generate Code] [🗑️ Delete]       │    │
│  │                                                             │    │
│  │    Steps (4):  ← ONLY shows Mobile steps                   │    │
│  │      1. Open login screen                                  │    │
│  │         • Tap "Login" button on home screen                │    │
│  │      2. Enter username                                     │    │
│  │         • Type "user@example.com" into username field      │    │
│  │      3. Enter password                                     │    │
│  │         • Type "password123" into password field           │    │
│  │      4. Submit credentials                                 │    │
│  │         • Tap "Sign In" button                             │    │
│  │                                                             │    │
│  │    ℹ️ Web steps hidden in Mobile mode                       │    │
│  │    [Regenerate Steps] [Simulate Mobile]                    │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

**Key UI Elements:**
- **Strict Platform Filtering**: Only current platform's steps visible
- Platform indicator badges (Web ✓ Mobile ✓) - informational only
- Status badges (Draft, Generated, Completed)
- Action buttons contextual to current platform
- No cross-platform data mixing
- Clear visual indicator of which mode is active

---

### **Phase 4: Feature Creation Modal**

**Trigger:** Click `[+ Create Feature]` button

**Modal UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Create Feature                                             │
│                                                             │
│  Feature Name:                                              │
│  [User Login                                      ]         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Web Platform                                          │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ Description:                                          │ │
│  │ [User navigates to login page and authenticates    ] │ │
│  │                                                       │ │
│  │ Creation Method:                                      │ │
│  │ ( ) Type manually (selected)                          │ │
│  │ ( ) 🎙️ Voice to text (using Whisper)                 │ │
│  │ ( ) ✨ Record actions (interact with web)             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Mobile Platform (Optional)                            │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ Description:                                          │ │
│  │ [User taps login button and enters credentials    ] │ │
│  │                                                       │ │
│  │ Creation Method:                                      │ │
│  │ ( ) Type manually (selected)                          │ │
│  │ ( ) 🎙️ Voice to text                                  │ │
│  │ ( ) ✨ Record actions (interact with mobile app)      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Generate Steps & Simulate] [Cancel]                      │
└─────────────────────────────────────────────────────────────┘
```

**Three Creation Methods:**

1. **Type Manually** (Default)
   - User types natural language description
   - Example: "User navigates to /login, enters email and password, clicks submit"

2. **🎙️ Voice-to-Text**
   - Uses Whisper API (already integrated: `src/components/VoiceRecorder.tsx`)
   - User speaks description
   - Transcribed to text automatically

3. **✨ Record Actions**
   - User interacts with live web/mobile preview
   - System records interactions (clicks, typing, navigation)
   - Auto-generates description from recorded actions
   - Uses existing recording infrastructure: `src/store/stepStore.ts` (lines 171-254)

**Files to Create:**
- `src/components/FeatureCreationDialog.tsx` - Main creation modal
- `src/components/PlatformDescriptionInput.tsx` - Reusable description input with 3 methods

**Files to Leverage:**
- `src/components/VoiceRecorder.tsx` - Already exists for voice input
- `src/store/stepStore.ts` - Already has recording logic (`startRecording`, `addRecordedEvent`)

---

### **Phase 5: Step Generation & Simulation**

**User Journey:**
1. User fills feature description (e.g., "User logs into the application")
2. User clicks `[Generate Steps & Simulate]`
3. **Real-time process begins:**

**Step Generation Process:**
```
┌─────────────────────────────────────────────────────────────┐
│  Generating Steps for "User Login"...                      │
│                                                             │
│  Web Platform:                                              │
│  ✓ Analyzing description...                                │
│  ✓ Identifying key actions...                              │
│  ✓ Generating step: "Navigate to login page"               │
│  ✓ Generating step: "Enter credentials"                    │
│  ✓ Generating step: "Submit login form"                    │
│  🔄 Simulating on web preview...                            │
│                                                             │
│  [Preview Pane]                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  [Live web/mobile preview showing automation]        │ │
│  │                                                       │ │
│  │  Currently: Typing into username field...            │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Mobile Platform:                                           │
│  ✓ Analyzing description...                                │
│  🔄 Generating steps...                                     │
│                                                             │
│  [Cancel] [Skip Simulation]                                │
└─────────────────────────────────────────────────────────────┘
```

**AI Step Generation Logic:**
```typescript
// Input: Feature description
"User navigates to login page, enters email and password, clicks submit"

// AI Analysis: Break down into atomic steps
1. Navigation action detected → "Navigate to login page"
2. Input action detected (email) → "Enter email address"
3. Input action detected (password) → "Enter password"
4. Click action detected → "Submit login form"

// Output: Named steps with actions
Step 1: "Navigate to login page"
  - Action: navigate to /login

Step 2: "Enter email address"
  - Action: type "user@example.com" into #email

Step 3: "Enter password"
  - Action: type "password123" into #password

Step 4: "Submit login form"
  - Action: click #submit-button
```

**Simulation:**
- As steps are generated, they're executed in real-time
- User sees actual automation happening in preview pane
- Provides immediate visual feedback
- Allows user to verify correctness before saving

**Files to Create:**
- `src/services/stepGenerationService.ts` - AI-powered step generation
  - Uses Claude API (already configured: `src/services/claudeService.ts`)
  - Parses natural language → structured steps
  - Auto-generates step names

- `src/services/simulationService.ts` - Real-time simulation orchestrator
  - Executes steps as they're generated
  - Shows progress in preview pane
  - Handles errors gracefully

**Files to Leverage:**
- `src/services/claudeService.ts` - Already exists for AI
- `src/services/aiDecisionService.ts` - Already does element detection
- `src/utils/flowExtractor.ts` - Already extracts elements from pages

---

### **Phase 6: Code Generation**

**Current State:**
- Only generates Playwright code for web
- No mobile code generation

**New State:**
- **Web → Playwright** (enhanced)
- **Mobile → WebDriverIO** (new)
- Per-platform code generation

**UI Changes:**

**Feature Card Actions:**
```
┌────────────────────────────────────────────────────────────┐
│ 🎯 User Login                                              │
│                                                             │
│ [💾 Generate Code ▼]                                       │
│    ├─ Generate Web Code (Playwright)                       │
│    ├─ Generate iOS Code (WebDriverIO)                      │
│    └─ Generate Android Code (WebDriverIO)                  │
└────────────────────────────────────────────────────────────┘
```

**Code Modal (Enhanced):**
```
┌─────────────────────────────────────────────────────────────┐
│  Generated Code - User Login                                │
│                                                             │
│  [Playwright (Web)] [WebDriverIO (iOS)] [WebDriverIO (Android)]│
│                                                             │
│  // Playwright Test (Web)                                  │
│  import { test, expect } from '@playwright/test';          │
│                                                             │
│  test('User Login', async ({ page }) => {                  │
│    // Navigate to login page                               │
│    await page.goto('https://example.com/login');           │
│                                                             │
│    // Enter email address                                  │
│    await page.locator('#email').fill('user@example.com');  │
│                                                             │
│    // Enter password                                       │
│    await page.locator('#password').fill('password123');    │
│                                                             │
│    // Submit login form                                    │
│    await page.locator('#submit-button').click();           │
│  });                                                        │
│                                                             │
│  [Copy to Clipboard] [Download]                            │
└─────────────────────────────────────────────────────────────┘
```

**WebDriverIO Generation Example:**
```typescript
// WebDriverIO Test (iOS)
describe('User Login', () => {
  it('should log in successfully', async () => {
    // Open login screen
    const loginButton = await $('~Login'); // Accessibility ID
    await loginButton.click();

    // Enter email address
    const emailField = await $('~usernameTextField');
    await emailField.setValue('user@example.com');

    // Enter password
    const passwordField = await $('~passwordTextField');
    await passwordField.setValue('password123');

    // Submit credentials
    const signInButton = await $('~signInButton');
    await signInButton.click();
  });
});
```

**Files to Create:**
- `src/utils/webdriverioGenerator.ts` - WebDriverIO code generation
  - Supports iOS (XCUITest selectors)
  - Supports Android (UIAutomator selectors)
  - Generates idiomatic WebDriverIO syntax

**Files to Modify:**
- `src/utils/codeGenerator.ts` - Refactor to work with Features instead of Steps
- `src/components/CodeModal.tsx` - Multi-tab UI for different platforms

---

## 🏗️ Implementation Plan

### **Sprint 1: Data Layer Restructuring** (Week 1-2)

#### **Goals:**
- Create new Feature model and store
- Enhance Project model with mobile app config
- Migrate existing data without breaking changes

#### **Tasks:**

**1.1 Create Feature Type Definitions**
- File: `src/types/feature.ts` (NEW)
```typescript
export interface Feature {
  id: string
  projectId: string
  name: string
  descriptionWeb?: string
  descriptionMobile?: string
  stepsWeb: Step[]
  stepsMobile: Step[]
  status: 'draft' | 'generated' | 'completed'
  createdAt: number
  lastEdited: number
}

export type PlatformType = 'web' | 'mobile'
```

**1.2 Create Feature Store**
- File: `src/store/featureStore.ts` (NEW)
```typescript
interface FeatureState {
  features: Feature[]
  currentFeatureId: string | null

  // Actions
  createFeature: (projectId: string, name: string) => string
  deleteFeature: (featureId: string) => void
  updateFeature: (featureId: string, updates: Partial<Feature>) => void
  setCurrentFeature: (featureId: string) => void
  getFeaturesByProject: (projectId: string) => Feature[]

  // Step management
  addStepToFeature: (featureId: string, platform: PlatformType, step: Step) => void
  updateStepInFeature: (featureId: string, stepId: string, updates: Partial<Step>) => void
  deleteStepFromFeature: (featureId: string, stepId: string) => void
}
```

**1.3 Modify Project Store**
- File: `src/store/projectStore.ts` (MODIFY)
- Changes:
  - Add `webUrl?: string`
  - Add `mobileApps?: { ios?: {...}, android?: {...} }`
  - Add `currentPlatform: 'web' | 'mobile'`
  - Remove standalone `url` field (migrate to `webUrl`)

**1.4 Modify Step Store**
- File: `src/store/stepStore.ts` (MODIFY)
- Changes:
  - Add `featureId: string` to Step interface
  - Add `platform: 'web' | 'mobile'` to Step interface
  - Keep existing recording functionality (will reuse for feature creation)

**1.5 Create Data Migration Utility**
- File: `src/utils/dataMigration.ts` (NEW)
```typescript
export function migrateV1toV2() {
  // 1. Check if migration needed (version flag)
  // 2. Backup existing data to localStorage
  // 3. Read existing projects and steps
  // 4. For each project:
  //    - Create default feature: "Legacy Flow"
  //    - Move all existing steps to this feature
  //    - Set platform to 'web' for all legacy steps
  // 5. Update data version flag
  // 6. Log migration success
}

export function rollbackMigration() {
  // Restore from backup if migration fails
}
```

**1.6 Add Version Management**
- File: `src/utils/dataVersion.ts` (NEW)
```typescript
const DATA_VERSION_KEY = 'snaptest-data-version'
const CURRENT_VERSION = 2

export function getCurrentDataVersion(): number
export function setDataVersion(version: number): void
export function needsMigration(): boolean
```

#### **Testing:**
- ✅ Create new project with mobile app config
- ✅ Migrate existing project data
- ✅ Verify no data loss
- ✅ Test rollback functionality

---

### **Sprint 2: Project Creation UX** (Week 2-3)

#### **Goals:**
- Enhanced project creation modal with mobile app config
- Visual platform indicators on project cards
- Per-project mobile configuration

#### **Tasks:**

**2.1 Create Mobile App Config Component**
- File: `src/components/MobileAppConfigDialog.tsx` (NEW)
```typescript
interface MobileAppConfigProps {
  platform: 'ios' | 'android'
  config?: { bundleId: string, appName: string } | { packageName: string, appName: string }
  onChange: (config: any) => void
  onClear: () => void
}

// Reusable component for iOS and Android configuration
// Used in project creation modal
```

**2.2 Modify Dashboard Project Creation**
- File: `src/pages/Dashboard.tsx` (MODIFY)
- Changes:
  - Add `webUrl` input (rename from `websiteUrl`)
  - Add iOS configuration section (collapsible)
  - Add Android configuration section (collapsible)
  - Add platform indicator badges
  - Validation: At least one platform must be configured

**2.3 Update Project Cards**
- File: `src/components/ProjectCard.tsx` (NEW - extract from Dashboard)
- Features:
  - Show 🌐 icon if web configured
  - Show 📱 icon if mobile configured
  - Display configured platforms in card
  - Hover effect shows full platform details

**2.4 Platform Indicator Component**
- File: `src/components/PlatformIndicator.tsx` (NEW)
```typescript
interface PlatformIndicatorProps {
  webConfigured: boolean
  iosConfigured: boolean
  androidConfigured: boolean
  size?: 'small' | 'medium' | 'large'
}

// Shows badges: 🌐 Web  📱 iOS  📱 Android
```

#### **Testing:**
- ✅ Create project with web only
- ✅ Create project with mobile only
- ✅ Create project with both web and mobile
- ✅ Edit existing project configuration
- ✅ Validation: Reject project without any platform

---

### **Sprint 3: Feature Management UI** (Week 3-5)

#### **Goals:**
- Feature list view (replaces current step list)
- Feature creation with 3 input methods
- Platform-specific step display
- AI step generation

#### **Tasks:**

**3.1 Create Feature List Component**
- File: `src/components/FeatureList.tsx` (NEW)
```typescript
// Main feature management interface
// Displays all features for current project
// Platform toggle filters which steps are shown
// Features:
// - Expandable feature cards
// - Show platform indicators
// - Status badges (draft, generated, completed)
// - Action buttons (Play, Edit, Delete, Generate Code)
// - Search/filter features
```

**3.2 Create Feature Creation Dialog**
- File: `src/components/FeatureCreationDialog.tsx` (NEW)
```typescript
interface FeatureCreationDialogProps {
  projectId: string
  onClose: () => void
  onSuccess: (featureId: string) => void
}

// Modal with:
// - Feature name input
// - Web description (with 3 methods)
// - Mobile description (optional, with 3 methods)
// - Generate & Simulate button
```

**3.3 Create Platform Description Input**
- File: `src/components/PlatformDescriptionInput.tsx` (NEW)
```typescript
interface PlatformDescriptionInputProps {
  platform: 'web' | 'mobile'
  value: string
  onChange: (value: string) => void
  recordingMode: 'manual' | 'voice' | 'record'
  onRecordingModeChange: (mode: string) => void
}

// Supports 3 input methods:
// 1. Manual text input
// 2. Voice-to-text (uses VoiceRecorder component)
// 3. Record actions (uses existing recording logic)
```

**3.4 Create Feature Detail View**
- File: `src/components/FeatureDetailView.tsx` (NEW)
```typescript
// Detailed view of a single feature
// Shows all steps for current platform
// Allows editing step details
// Provides actions:
// - Regenerate steps
// - Simulate steps
// - Generate code
// - Delete step
// - Reorder steps
```

**3.5 Update Project View**
- File: `src/pages/ProjectView.tsx` (MAJOR REFACTOR)
- Changes:
  - Replace StepPanel with FeatureList
  - Add platform toggle in top nav
  - Toggle controls which steps are shown globally
  - Remove old "Flow" sidebar tab
  - Rename to "Features" tab

**3.6 Create Platform Toggle**
- File: `src/components/PlatformToggle.tsx` (NEW)
```typescript
interface PlatformToggleProps {
  currentPlatform: 'web' | 'mobile'
  onChange: (platform: 'web' | 'mobile') => void
  webAvailable: boolean
  mobileAvailable: boolean
}

// Toggle component in top nav
// Disables unavailable platforms
// Shows icon + label
```

#### **Testing:**
- ✅ Create feature with web description only
- ✅ Create feature with mobile description only
- ✅ Create feature with both descriptions
- ✅ Edit feature details
- ✅ Delete feature
- ✅ Platform toggle switches step display
- ✅ Manual, voice, and recording modes all work

---

### **Sprint 4: Advanced Mode Toggle** (Week 5)

#### **Goals:**
- Hide complex features by default
- Clean, minimal UX for new users
- Advanced mode for power users

#### **Tasks:**

**4.1 Add Advanced Mode Setting**
- File: `src/store/settingsStore.ts` (NEW)
```typescript
interface SettingsState {
  advancedMode: boolean
  setAdvancedMode: (enabled: boolean) => void
}

// Persisted in localStorage
```

**4.2 Modify Sidebar**
- File: `src/components/Sidebar.tsx` (MODIFY)
- Changes:
  - Show only "Features" and "Settings" by default
  - Show "Auto Flow", "AI Explore", "Results", "Reports" only if `advancedMode === true`
  - Add visual separator between simple and advanced tabs

**4.3 Add Advanced Mode Toggle in Settings**
- File: `src/pages/ProjectView.tsx` (MODIFY)
- Add toggle in Settings tab:
```typescript
┌─────────────────────────────────────┐
│ Settings                            │
│                                     │
│ User Preferences:                   │
│ [✓] Enable Advanced Mode            │
│     Show advanced features like     │
│     Auto Flow, AI Explore, etc.     │
└─────────────────────────────────────┘
```

**4.4 Conditional Device Capabilities Panel**
- File: `src/pages/ProjectView.tsx` (MODIFY)
- Only show "Capabilities" button if `advancedMode === true`

#### **Testing:**
- ✅ Default mode shows only Features + Settings
- ✅ Enable advanced mode reveals all tabs
- ✅ Setting persists across sessions
- ✅ Toggle works immediately (no refresh needed)

---

### **Sprint 5: AI Step Generation** (Week 6-7)

#### **Goals:**
- AI-powered step generation from descriptions
- Auto-naming of steps
- Intelligent action detection

#### **Tasks:**

**5.1 Create Step Generation Service**
- File: `src/services/stepGenerationService.ts` (NEW)
```typescript
interface StepGenerationService {
  generateStepsFromDescription(
    description: string,
    platform: 'web' | 'mobile'
  ): Promise<Step[]>

  generateStepName(actions: Action[]): string
}

// Uses Claude API to:
// 1. Parse natural language description
// 2. Identify atomic actions
// 3. Generate step names
// 4. Create selector placeholders
```

**5.2 Integrate with Feature Creation**
- File: `src/components/FeatureCreationDialog.tsx` (MODIFY)
- When user clicks "Generate Steps":
  - Call `stepGenerationService.generateStepsFromDescription()`
  - Show loading state with progress
  - Display generated steps for review
  - Allow user to edit before saving

**5.3 Add Step Name Generation**
- Leverage existing Claude integration
- Prompt engineering:
```
Given these actions:
1. Navigate to /login
2. Type into #email
3. Type into #password
4. Click #submit

Generate a concise, human-readable name for this step.
Examples: "Enter login credentials", "Submit login form"

Your response (name only):
```

**5.4 Add Regenerate Function**
- File: `src/components/FeatureDetailView.tsx` (MODIFY)
- Add "Regenerate Steps" button
- Re-runs step generation from description
- Replaces existing steps (with confirmation)

#### **Testing:**
- ✅ Generate steps from simple description
- ✅ Generate steps from complex multi-action description
- ✅ Step names are meaningful and concise
- ✅ Generated selectors are placeholders (user refines later)
- ✅ Regenerate preserves feature metadata

---

### **Sprint 6: Real-Time Simulation** (Week 7-8)

#### **Goals:**
- Simulate steps as they're generated
- Visual feedback in preview pane
- Validate automation before saving

#### **Tasks:**

**6.1 Create Simulation Service**
- File: `src/services/simulationService.ts` (NEW)
```typescript
interface SimulationService {
  simulateSteps(
    steps: Step[],
    platform: 'web' | 'mobile',
    onProgress: (stepIndex: number, action: Action) => void
  ): Promise<SimulationResult>

  pause(): void
  resume(): void
  stop(): void
}

// Orchestrates step execution
// Shows progress in real-time
// Handles errors gracefully
```

**6.2 Integrate with Web Preview**
- File: `src/components/WebView.tsx` (MODIFY)
- Add simulation overlay
- Highlight elements as they're interacted with
- Show current action in tooltip

**6.3 Integrate with Mobile Preview**
- File: `src/components/MobileWebView.tsx` (MODIFY)
- Same simulation overlay as web
- Use Appium actions for mobile

**6.4 Add Progress Modal**
- File: `src/components/SimulationProgress.tsx` (NEW)
```typescript
// Shows during step generation + simulation
// Displays:
// - Current step being generated
// - Current action being executed
// - Progress bar
// - Preview pane (web/mobile)
// - Pause/Resume/Cancel buttons
```

**6.5 Error Handling**
- If action fails during simulation:
  - Pause simulation
  - Highlight failed action
  - Allow user to fix selector
  - Resume simulation

#### **Testing:**
- ✅ Simulate web steps successfully
- ✅ Simulate mobile steps successfully
- ✅ Pause and resume simulation
- ✅ Cancel simulation mid-way
- ✅ Handle failed actions gracefully
- ✅ Visual feedback is clear and helpful

---

### **Sprint 7: Code Generation Enhancement** (Week 8-9)

#### **Goals:**
- Generate Playwright code from features
- Generate WebDriverIO code for mobile
- Multi-platform code export

#### **Tasks:**

**7.1 Create WebDriverIO Generator**
- File: `src/utils/webdriverioGenerator.ts` (NEW)
```typescript
export function generateWebDriverIOCode(
  feature: Feature,
  platform: 'ios' | 'android'
): string

// Generates idiomatic WebDriverIO test code
// Uses accessibility IDs for selectors
// Handles iOS vs Android selector differences
```

**7.2 Refactor Playwright Generator**
- File: `src/utils/codeGenerator.ts` (MODIFY)
- Change from Step-based to Feature-based
- Support generating code for entire feature
- Include all web steps in sequence

**7.3 Update Code Modal**
- File: `src/components/CodeModal.tsx` (MODIFY)
- Add tabs for different platforms:
  - Playwright (Web)
  - WebDriverIO (iOS)
  - WebDriverIO (Android)
- Show only configured platforms
- Add syntax highlighting
- Add copy and download buttons

**7.4 Add Code Generation Actions**
- File: `src/components/FeatureDetailView.tsx` (MODIFY)
- Add dropdown: "Generate Code"
  - Option 1: Generate Web Code (Playwright)
  - Option 2: Generate iOS Code (WebDriverIO)
  - Option 3: Generate Android Code (WebDriverIO)
  - Option 4: Generate All Platforms

**7.5 Selector Translation**
- XPath selectors for web
- Accessibility ID selectors for mobile
- Add helper function to suggest accessibility IDs
```typescript
function suggestAccessibilityId(xpath: string): string {
  // Convert XPath to suggested accessibility ID
  // Example: //input[@id="email"] → "emailTextField"
}
```

#### **Testing:**
- ✅ Generate Playwright code for web feature
- ✅ Generate WebDriverIO code for iOS feature
- ✅ Generate WebDriverIO code for Android feature
- ✅ Copy code to clipboard works
- ✅ Download code as .spec file works
- ✅ Syntax highlighting is correct
- ✅ Generated code is executable

---

### **Sprint 8: Testing & Polish** (Week 9-10)

#### **Goals:**
- Comprehensive end-to-end testing
- Performance optimization
- UI/UX polish
- Documentation

#### **Tasks:**

**8.1 End-to-End Testing**
- Test complete flow:
  1. Create project with web + mobile
  2. Create feature with descriptions
  3. Generate steps (AI)
  4. Simulate steps
  5. Generate code (all platforms)
  6. Edit and regenerate
  7. Delete feature
- Test migration from V1 to V2
- Test rollback functionality

**8.2 Performance Optimization**
- Lazy load feature components
- Virtualize long feature lists
- Optimize re-renders with React.memo
- Add debouncing to search/filter

**8.3 UI/UX Polish**
- Add loading skeletons
- Smooth animations and transitions
- Keyboard shortcuts
- Tooltips and help text
- Empty states (no features yet)
- Error states (generation failed)

**8.4 Documentation**
- Update README.md
- Create user guide for new UI
- Document migration process
- API documentation for services

**8.5 Bug Fixes**
- Fix any discovered bugs
- Edge case handling
- Browser compatibility testing

#### **Testing Checklist:**
- ✅ All features work in Chrome, Firefox, Safari
- ✅ Mobile automation works on iOS and Android
- ✅ Data migration is smooth and reversible
- ✅ Performance is acceptable (features list with 100+ items)
- ✅ No console errors or warnings
- ✅ All TypeScript types are correct
- ✅ Accessibility (keyboard navigation, screen readers)

---

## 🔄 Data Migration Strategy

### Migration Process

```typescript
// src/utils/dataMigration.ts

export function migrateV1toV2() {
  console.log('🔄 Starting migration from V1 to V2...')

  // 1. Check if migration needed
  const currentVersion = getCurrentDataVersion()
  if (currentVersion >= 2) {
    console.log('✅ Already on V2, skipping migration')
    return
  }

  // 2. Backup existing data
  const backup = {
    projects: localStorage.getItem('snaptest-project-storage'),
    steps: localStorage.getItem('snaptest-step-storage'),
    timestamp: Date.now()
  }
  localStorage.setItem('snaptest-data-backup-v1', JSON.stringify(backup))
  console.log('💾 Backed up V1 data')

  // 3. Read existing data
  const projectStore = JSON.parse(localStorage.getItem('snaptest-project-storage') || '{}')
  const stepStore = JSON.parse(localStorage.getItem('snaptest-step-storage') || '{}')

  const projects = projectStore.state?.projects || []
  const steps = stepStore.state?.steps || []

  console.log(`📦 Found ${projects.length} projects and ${steps.length} steps`)

  // 4. Migrate each project
  const migratedProjects = projects.map(project => {
    // Create default feature for legacy steps
    const legacyFeature: Feature = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: 'Legacy Flow',
      descriptionWeb: 'Migrated from previous version',
      stepsWeb: steps.filter(s => !s.featureId), // All orphaned steps
      stepsMobile: [],
      status: 'completed',
      createdAt: project.createdAt,
      lastEdited: project.lastEdited
    }

    return {
      ...project,
      webUrl: project.url, // Rename url → webUrl
      mobileApps: undefined, // No mobile config in V1
      currentPlatform: 'web' as const,
      features: [legacyFeature]
    }
  })

  // 5. Update localStorage
  projectStore.state.projects = migratedProjects
  localStorage.setItem('snaptest-project-storage', JSON.stringify(projectStore))

  // 6. Mark migration complete
  setDataVersion(2)
  console.log('✅ Migration complete!')

  return true
}

export function rollbackMigration() {
  console.log('⏪ Rolling back migration...')

  const backup = localStorage.getItem('snaptest-data-backup-v1')
  if (!backup) {
    throw new Error('No backup found')
  }

  const { projects, steps } = JSON.parse(backup)
  localStorage.setItem('snaptest-project-storage', projects)
  localStorage.setItem('snaptest-step-storage', steps)
  setDataVersion(1)

  console.log('✅ Rollback complete')
}
```

### Migration UI

**Prompt on first load after upgrade:**
```
┌─────────────────────────────────────────────────────────┐
│  Welcome to SnapTest 2.0!                               │
│                                                         │
│  We've rebuilt the application with multi-platform     │
│  support. Your existing data will be migrated to the   │
│  new format.                                           │
│                                                         │
│  What will happen:                                      │
│  • Your projects will be preserved                      │
│  • Your steps will be grouped into a "Legacy Flow"     │
│    feature                                             │
│  • A backup will be created automatically               │
│                                                         │
│  You can rollback if needed from Settings.              │
│                                                         │
│  [Migrate Now] [Learn More]                            │
└─────────────────────────────────────────────────────────┘
```

**Rollback option in Settings:**
```
┌─────────────────────────────────────┐
│ Settings                            │
│                                     │
│ Data Management:                    │
│ Current version: V2                 │
│ Backup available: Yes (Jan 15)      │
│                                     │
│ [⏪ Rollback to V1]                  │
│ (Restores previous version)         │
└─────────────────────────────────────┘
```

---

## 📊 File Changes Summary

### Files to Create (NEW)
1. `src/types/feature.ts` - Feature type definitions
2. `src/types/project.ts` - Enhanced project types
3. `src/store/featureStore.ts` - Feature state management
4. `src/store/settingsStore.ts` - App settings (advanced mode)
5. `src/components/FeatureList.tsx` - Main feature UI
6. `src/components/FeatureCreationDialog.tsx` - Feature creation modal
7. `src/components/FeatureDetailView.tsx` - Step editing view
8. `src/components/PlatformDescriptionInput.tsx` - Description input with 3 methods
9. `src/components/MobileAppConfigDialog.tsx` - iOS/Android config
10. `src/components/PlatformToggle.tsx` - Web/Mobile switcher
11. `src/components/PlatformIndicator.tsx` - Platform badges
12. `src/components/ProjectCard.tsx` - Extract from Dashboard
13. `src/components/SimulationProgress.tsx` - Simulation overlay
14. `src/services/stepGenerationService.ts` - AI step generation
15. `src/services/simulationService.ts` - Step simulation
16. `src/utils/webdriverioGenerator.ts` - Mobile code generation
17. `src/utils/dataMigration.ts` - V1 → V2 migration
18. `src/utils/dataVersion.ts` - Version management

### Files to Modify (MODIFY)
1. `src/store/projectStore.ts` - Add mobile config, platform toggle
2. `src/store/stepStore.ts` - Add featureId, platform
3. `src/pages/Dashboard.tsx` - Enhanced project creation
4. `src/pages/ProjectView.tsx` - Major refactor for features
5. `src/components/Sidebar.tsx` - Conditional advanced tabs
6. `src/components/CodeModal.tsx` - Multi-platform tabs
7. `src/components/WebView.tsx` - Simulation overlay
8. `src/components/MobileWebView.tsx` - Simulation overlay
9. `src/utils/codeGenerator.ts` - Feature-based generation
10. `src/types/journey.ts` - Platform-aware types

### Files to Delete (REMOVE)
1. `src/components/StepPanel.tsx` - Replaced by FeatureList
2. `src/components/StepList.tsx` - Replaced by FeatureDetailView
3. `src/components/ActionList.tsx` - Merged into FeatureDetailView

---

## 🎯 Success Metrics

### User Experience
- ✅ New users can create first feature in < 2 minutes
- ✅ Platform toggle is instantly understood
- ✅ Advanced mode successfully hides complexity
- ✅ Step generation accuracy > 85%
- ✅ Simulation success rate > 90%

### Technical
- ✅ Zero data loss during migration
- ✅ Performance: Feature list with 100 items loads in < 1s
- ✅ Code coverage > 80%
- ✅ Zero TypeScript errors
- ✅ Bundle size increase < 15%

### Business
- ✅ Support for all 3 platforms (Web, iOS, Android)
- ✅ Backward compatible with existing projects
- ✅ Scalable architecture for future platforms

---

## 🚧 Risks & Mitigation

### Risk 1: Complex Migration
**Impact:** High - Could lose user data
**Mitigation:**
- Comprehensive backup before migration
- Rollback functionality
- Gradual rollout with feature flag
- Extensive testing with real user data

### Risk 2: AI Step Generation Accuracy
**Impact:** Medium - Users may not trust generated steps
**Mitigation:**
- Allow manual editing of all generated steps
- Provide "Regenerate" option
- Show AI reasoning/confidence
- Fall back to manual creation

### Risk 3: Performance with Large Datasets
**Impact:** Medium - Slow UI with many features
**Mitigation:**
- Virtualized lists
- Lazy loading
- Pagination
- Optimistic UI updates

### Risk 4: Breaking Existing Workflows
**Impact:** High - Users resist change
**Mitigation:**
- Preserve all existing features in "Advanced Mode"
- Gradual migration with user consent
- In-app tutorials and tooltips
- Release notes and migration guide

---

## 📝 Next Steps

1. **Review & Approve Plan** - Stakeholder sign-off
2. **Create Project Board** - Track all tasks in Sprint backlog
3. **Set Up Feature Flag** - Enable gradual rollout
4. **Begin Sprint 1** - Data layer restructuring
5. **Weekly Demos** - Show progress to stakeholders

---

## 🤝 Team Roles

- **Product Owner** - Define requirements, prioritize features
- **Tech Lead** - Architectural decisions, code reviews
- **Frontend Developer** - UI/UX implementation
- **AI/ML Engineer** - Step generation service
- **QA Engineer** - Testing, migration validation
- **Designer** - UI/UX mockups, user flows

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** Awaiting Approval