# WebDriverAgent Setup Guide for iOS Automation

This guide will help you set up WebDriverAgent and Appium for full iOS Safari automation on your physical iPhone.

## Overview

Your application now uses **Appium 2.0 + XCUITest driver** for iOS automation instead of the limited `ios-webkit-debug-proxy`. This provides:

✅ **Real screenshots** from Safari browser
✅ **Element clicking/tapping** with coordinates
✅ **Text input/typing** into form fields
✅ **Swipe gestures** for scrolling and navigation
✅ **JavaScript execution** in Safari context
✅ **Full DOM inspection** for element selection

## Prerequisites (Already Installed ✅)

- [x] macOS with Xcode Command Line Tools
- [x] Homebrew
- [x] libimobiledevice (`idevice_id` command)
- [x] Node.js and npm
- [x] iPhone connected via USB

## New Requirements

### 1. Apple Developer Account (Free)

You need an Apple Developer account to sign WebDriverAgent. A **free account works fine** - no paid developer program needed!

**Create Free Account:**
1. Go to https://developer.apple.com/
2. Sign in with your Apple ID
3. Agree to terms - that's it!

### 2. Xcode (If Not Installed)

```bash
# Check if Xcode is installed
xcode-select -p

# If not installed, download from Mac App Store
# Search for "Xcode" and install (it's free)
```

## Setup Steps

### Step 1: Verify Appium Installation

```bash
# Check if Appium is installed (should show version 2.x)
npx appium --version

# Check if XCUITest driver is available
npx appium driver list --installed
```

You should see `xcuitest` in the installed drivers list. If not, run:

```bash
npx appium driver install xcuitest
```

### Step 2: Configure WebDriverAgent Signing

WebDriverAgent needs to be signed with your Apple Developer account to run on your iPhone.

#### Option A: Automatic Signing (Recommended - Easiest)

Appium will automatically handle WebDriverAgent signing when you first connect! Just make sure:

1. **Your iPhone is connected via USB**
2. **iPhone Settings → General → Device Management**: Trust your computer
3. **iPhone Settings → Safari → Advanced**: Enable "Web Inspector"

When you first start the app and connect to your iPhone, Appium will:
- Download WebDriverAgent
- Request your Apple ID for signing
- Install WebDriverAgent on your device
- Launch Safari browser

#### Option B: Manual Signing (If Automatic Fails)

If automatic signing doesn't work, you can manually configure it:

1. **Open WebDriverAgent project in Xcode:**

```bash
# Find WebDriverAgent location
WDA_PATH="$HOME/.appium/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent"

# Open in Xcode
open "$WDA_PATH/WebDriverAgent.xcodeproj"
```

2. **In Xcode:**
   - Select `WebDriverAgentRunner` target (left sidebar)
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Apple Developer team from dropdown
   - Xcode will create a provisioning profile automatically

3. **Change Bundle Identifier (if needed):**
   - If you see "Failed to create provisioning profile" error
   - Change Bundle ID to something unique: `com.yourname.WebDriverAgentRunner`
   - Try signing again

4. **Trust Developer on iPhone:**
   - iPhone Settings → General → Device Management
   - Tap your Apple ID / Developer App
   - Tap "Trust"

### Step 3: Get Your iPhone UDID

```bash
# List connected iOS devices
idevice_id -l

# Example output:
# 00008030-001A1C2E3B56789A
```

**Save this UDID** - you'll need it for automation!

### Step 4: Enable Web Inspector on iPhone

On your iPhone:
1. Open **Settings** app
2. Go to **Safari**
3. Go to **Advanced**
4. Turn ON **"Web Inspector"**

This allows Safari to be automated via Appium.

## Testing the Setup

### Test 1: Start Appium Server Manually

```bash
# Start Appium server in a terminal
npx appium

# You should see:
# [Appium] Welcome to Appium v2.x.x
# [Appium] Appium REST http interface listener started on 0.0.0.0:4723
```

Keep this terminal open.

### Test 2: Connect from Application

1. **Start your application:**
   ```bash
   npm run dev
   ```

2. **In the app:**
   - Click "Scan for Devices" button
   - Your iPhone should appear in the list
   - Click "Connect" on your iPhone
   - The Appium server will start automatically
   - Safari will launch on your iPhone
   - You should see the Safari screen in the app!

### Test 3: Try Basic Automation

Once connected:

1. **Navigate to a website:**
   - The app should load a test page in Safari
   - Screenshot should appear (real, not placeholder!)

2. **Try clicking:**
   - Enable "Capture Element" mode
   - Tap any element on your iPhone screen
   - Element selector should be captured

3. **Create a test flow:**
   - Add steps (click, type, etc.)
   - Execute the flow
   - Watch it run on your iPhone!

## Troubleshooting

### Issue: "xcodebuild: error: SDK "iphoneos" cannot be located"

**Solution:**
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

### Issue: "Could not find module 'WebDriverAgentLib'"

**Solution:** WebDriverAgent needs to be built first:
```bash
WDA_PATH="$HOME/.appium/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent"
cd "$WDA_PATH"
xcodebuild -project WebDriverAgent.xcodeproj -scheme WebDriverAgentRunner -destination 'id=YOUR_UDID' test
```

Replace `YOUR_UDID` with your device UDID from Step 3.

### Issue: "Failed to create Appium session"

**Possible causes:**
1. **Appium server not running** - Check terminal, should show "listener started on 0.0.0.0:4723"
2. **iPhone not trusted** - Settings → General → Device Management → Trust
3. **Web Inspector disabled** - Settings → Safari → Advanced → Enable Web Inspector
4. **WebDriverAgent not signed** - See Step 2 above
5. **USB cable issue** - Try different cable or USB port

**Debug steps:**
```bash
# Check if device is detected by libimobiledevice
idevice_id -l

# Check device info
ideviceinfo -u YOUR_UDID

# Check Appium logs for detailed error messages
```

### Issue: "Developer Mode required" (iOS 16+)

On iOS 16 and later, you need to enable Developer Mode:

1. Settings → Privacy & Security → Developer Mode
2. Toggle ON
3. Restart iPhone
4. Confirm when prompted

### Issue: Safari doesn't launch / App crashes

**Solution:**
1. Make sure Safari is installed (it's pre-installed, but check)
2. Try opening Safari manually first
3. Kill Safari and try again:
   ```bash
   # On iPhone, close Safari from app switcher
   # Then retry connection
   ```

### Issue: "Signing for "WebDriverAgentRunner" requires a development team"

**Solution:** You need to configure signing in Xcode (see Step 2, Option B above)

## Architecture Overview

Here's how the iOS automation works now:

```
Your App (Electron + React)
    ↓
Appium Connection Manager (src/utils/appiumConnection.ts)
    ↓
HTTP/REST calls to Appium Server (localhost:4723)
    ↓
XCUITest Driver
    ↓
WebDriverAgent (Running on iPhone)
    ↓
Safari Browser Automation
```

## What's Automated vs Manual

### ✅ Fully Automated:
- Appium server startup/shutdown (handled by app)
- WebDriver session creation
- Safari browser control
- Element interaction (click, type, swipe)
- Screenshots
- JavaScript execution
- Page navigation

### 🔧 One-Time Manual Setup:
- Xcode installation
- Apple Developer account creation
- WebDriverAgent signing (first time)
- iPhone trust settings
- Web Inspector enable

### ⚠️ Per-Device Setup:
- Each new iPhone needs WebDriverAgent installed once
- Trust developer certificate on device
- After that, it's fully automated!

## Next Steps

1. **Complete the setup steps** above
2. **Test the connection** with your iPhone
3. **Start automating!** Create test flows and generate Playwright code

## Need Help?

- **Appium Docs**: https://appium.io/docs/en/2.0/
- **XCUITest Driver**: https://appium.github.io/appium-xcuitest-driver/
- **WebDriverAgent**: https://github.com/appium/WebDriverAgent

## Summary

You now have **full iOS Safari automation** with:
- Real screenshots (not placeholders)
- Element interaction (clicking, typing)
- Swipe and gesture support
- Full feature parity with Android/Web platforms

The only limitation is that you can only automate **Safari browser** (web applications), not third-party App Store apps. This is an Apple security restriction, not a limitation of this tool.

**Ready to automate!** 🚀
