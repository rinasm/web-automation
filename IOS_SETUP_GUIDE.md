# iOS Device Connection Troubleshooting Guide

## Common Errors and Solutions

### Error 1: "xcodebuild failed with code 65"

This is the most common error and indicates code signing issues.

**Solution:**

1. **Open WebDriverAgent in Xcode:**
   ```bash
   open ./node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent/WebDriverAgent.xcodeproj
   ```

2. **Configure Signing for WebDriverAgentLib:**
   - Select `WebDriverAgentLib` target in the left sidebar
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Team (7MFG6W6M8G or your Apple Developer team)
   - Change Bundle Identifier if needed (e.g., `com.rinasmusthafa.WebDriverAgentLib`)

3. **Configure Signing for WebDriverAgentRunner:**
   - Select `WebDriverAgentRunner` target
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Team
   - Change Bundle Identifier (e.g., `com.rinasmusthafa.WebDriverAgentRunner`)

4. **Build the project:**
   - Select your iPhone from the device dropdown (top left)
   - Press Cmd+B to build
   - Fix any signing errors that appear

5. **Trust the Developer on your iPhone:**
   - On your iPhone: Settings > General > VPN & Device Management
   - Find your developer certificate
   - Tap "Trust"

### Error 2: "SDK not connected"

This means the iOS SDK (WebSocket connection) isn't established.

**Solutions:**

#### Option A: Use the Native SDK (Recommended)
1. Ensure the SnapTest SDK is integrated in your iOS app
2. Run your app on the device
3. It should auto-connect via Bonjour discovery

#### Option B: Use Appium Only
1. Make sure WebDriverAgent is properly signed (see Error 1)
2. Ensure your device is unlocked
3. Trust the developer certificate on device
4. Restart the app and try connecting again

## Quick Diagnostic Tool

Run the diagnostic script to automatically check your setup:

```bash
./ios-setup-diagnostic.sh
```

This will verify:
- ✅ Xcode installation
- ✅ Command line tools
- ✅ Connected devices
- ✅ Device UDID
- ✅ Team ID configuration
- ✅ WebDriverAgent location
- ✅ Build WebDriverAgent with proper signing

## Requirements Checklist

Before connecting:

- [ ] Xcode installed (with Command Line Tools)
- [ ] iPhone connected via USB
- [ ] iPhone is trusted on this Mac (popup on first connection)
- [ ] Device is unlocked
- [ ] Developer Mode enabled on iPhone (iOS 16+)
  - Settings > Privacy & Security > Developer Mode
- [ ] Valid Apple Developer account (free or paid)
- [ ] Team ID configured correctly
- [ ] WebDriverAgent built and signed
- [ ] Developer certificate trusted on iPhone

## Resources

- [Appium XCUITest Real Device Setup](https://github.com/appium/appium-xcuitest-driver/blob/master/docs/real-device-config.md)
- [WebDriverAgent Setup Guide](https://appium.github.io/appium-xcuitest-driver/latest/preparation/real-device-config/)
