# WebDriverAgent Manual Setup Guide

## Your Team Information
- **Team ID**: `7MFG6W6M8G`
- **Certificate**: Apple Development: rinasmusthafa@gmail.com (C454HTNZN2) ✅
- **Device**: Rinas's iPhone (UDID: 00008110-001E38A834C3801E)

## Quick Setup (Manual in Xcode)

### Step 1: Open WebDriverAgent Project
```bash
open ~/works/ui-test-automation/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent/WebDriverAgent.xcodeproj
```

### Step 2: Configure Signing for WebDriverAgentLib
1. In Xcode, select **WebDriverAgentLib** target (left sidebar)
2. Go to **Signing & Capabilities** tab
3. Check **"Automatically manage signing"**
4. Select Team: **Rinas Musthafa (7MFG6W6M8G)**

### Step 3: Configure Signing for WebDriverAgentRunner
1. Select **WebDriverAgentRunner** target
2. Go to **Signing & Capabilities** tab
3. Check **"Automatically manage signing"**
4. Select Team: **Rinas Musthafa (7MFG6W6M8G)**
5. Change **Bundle Identifier** to something unique like:
   - `com.rinasmusthafa.WebDriverAgentRunner`

### Step 4: Build the Project
1. Select your device **Rinas's iPhone** from the device dropdown
2. Select scheme: **WebDriverAgentRunner**
3. Press **⌘ + B** to build
4. Wait for build to complete

### Step 5: Trust on iPhone
1. iPhone: Settings → General → VPN & Device Management
2. Trust "Rinas Musthafa"

### Step 6: Enable UI Automation
1. iPhone: Settings → Developer → Enable UI Automation

## Then restart your app:
```bash
npm run dev
```
