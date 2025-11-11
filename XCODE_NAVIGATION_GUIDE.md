# How to Find Targets in Xcode

## Step-by-Step Visual Guide

### 1. Look at the LEFT SIDEBAR (Project Navigator)
When you open WebDriverAgent.xcodeproj, you should see:

```
📁 WebDriverAgent (blue icon) ← This is the PROJECT
  📱 WebDriverAgentLib ← Target 1
  📱 WebDriverAgentRunner ← Target 2  
  📱 IntegrationApp ← Target 3
  📁 WebDriverAgentLib (folder)
  📁 WebDriverAgentRunner (folder)
  ...
```

### 2. Click on the BLUE PROJECT ICON at the very top
- At the very top of the left sidebar
- It's called "WebDriverAgent" with a blue app icon
- This opens the project settings in the main area

### 3. You'll see TWO SECTIONS in the main area:
- **PROJECT** section (just "WebDriverAgent")
- **TARGETS** section (this is what you need!)
  - WebDriverAgentLib
  - WebDriverAgentRunner
  - IntegrationApp

### 4. Click on Each Target to Configure:

#### For WebDriverAgentLib:
1. Click "WebDriverAgentLib" under TARGETS section
2. Click "Signing & Capabilities" tab (top of main area)
3. You'll see signing options there

#### For WebDriverAgentRunner:
1. Click "WebDriverAgentRunner" under TARGETS section
2. Click "Signing & Capabilities" tab
3. Configure signing + change Bundle Identifier here

## Visual Layout:

```
┌─────────────────────────────────────────────────────────────┐
│ Xcode Window                                                │
├──────────────┬──────────────────────────────────────────────┤
│ LEFT SIDEBAR │ MAIN AREA                                    │
│              │                                              │
│ 📁 WebDriver │ ← Click this blue icon                      │
│   Agent      │                                              │
│   (BLUE)     │ PROJECT                                      │
│              │   WebDriverAgent                             │
│ PROJECT      │                                              │
│   WebDriver  │ TARGETS ← This section!                      │
│   Agent      │   📱 WebDriverAgentLib ← Click here          │
│              │   📱 WebDriverAgentRunner ← Then here        │
│ TARGETS      │   📱 IntegrationApp                          │
│   📱 WebDriv │                                              │
│   erAgentLib │ Tabs: General | Signing & Capabilities | ... │
│   📱 WebDriv │      ↑ Click this tab                        │
│   erAgentRu  │                                              │
│   nner       │ [Signing configuration options appear here]  │
│   📱 Integr  │                                              │
│   ationApp   │                                              │
│              │                                              │
│ 📁 WebDriver │                                              │
│   AgentLib   │                                              │
│   (folder)   │                                              │
│ 📁 WebDriver │                                              │
│   AgentRunn  │                                              │
│   er (folder)│                                              │
└──────────────┴──────────────────────────────────────────────┘
```

## Quick Steps:

1. **Top-left**: Click the blue "WebDriverAgent" icon (very first item)
2. **Main area**: Look for "TARGETS" section
3. **Click**: "WebDriverAgentLib" in TARGETS
4. **Top tabs**: Click "Signing & Capabilities"
5. **Configure**: Check "Automatically manage signing", select Team
6. **Repeat**: For "WebDriverAgentRunner"

## Still Can't Find It?

Try this alternative method:

### Method 2: Use the Dropdown at Top
1. Look at the TOP of Xcode window
2. You'll see a dropdown that says "WebDriverAgentRunner > Rinas's iPhone"
3. Click on "WebDriverAgentRunner" text
4. This opens a menu showing all targets
5. Select "Edit Scheme" → Manage Schemes
6. Or use Product → Scheme → WebDriverAgentRunner

### Method 3: Use Menu Bar
1. Menu: Editor → Add Target (don't actually add, just shows where they are)
2. Or: Product → Scheme → Select scheme shows targets

## What You're Looking For:

In the "Signing & Capabilities" tab, you should see:

```
✓ Automatically manage signing

Team: [Dropdown - Select: Rinas Musthafa (7MFG6W6M8G)]

Bundle Identifier: com.facebook.WebDriverAgentRunner.xctrunner
                   ↑ Change this to: com.rinasmusthafa.WebDriverAgentRunner

Signing Certificate: Apple Development
Provisioning Profile: [Will auto-generate]
```

## Screenshot Locations:

The layout should look like standard Xcode:
- Navigator area (left): 0-260px width
- Editor area (center): Main workspace
- Inspector area (right): Optional, can be hidden

If you don't see TARGETS section at all:
- Make sure you clicked the blue project icon (not a folder)
- Try View → Navigators → Show Project Navigator (⌘+1)
- Try closing and reopening Xcode

