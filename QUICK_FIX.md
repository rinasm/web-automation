# Quick Fix for WebDriverAgent Code Signing

I've opened WebDriverAgent in Xcode for you. Follow these steps:

## ✅ Step-by-Step Fix (2 minutes)

### 1. In Xcode, Select WebDriverAgentLib Target
- Look at the left sidebar under "TARGETS"
- Click on **WebDriverAgentLib**

### 2. Go to Signing & Capabilities Tab
- Click the "Signing & Capabilities" tab at the top

### 3. Enable Automatic Signing
- ✅ Check "Automatically manage signing"
- **Team**: Select **7MFG6W6M8G** from dropdown
- **Bundle Identifier**: Change to `com.rinasmusthafa.WebDriverAgentLib`
  (Must be unique, not `com.facebook.WebDriverAgentLib`)

### 4. Repeat for WebDriverAgentRunner Target
- Click on **WebDriverAgentRunner** in the left sidebar
- ✅ Check "Automatically manage signing"
- **Team**: Select **7MFG6W6M8G**
- **Bundle Identifier**: Change to `com.rinasmusthafa.WebDriverAgentRunner`

### 5. Select Your iPhone
- At the top left, click the device dropdown
- Select your iPhone: **Rinas's iPhone** (not Simulator!)

### 6. Build & Run
- Press **Cmd + B** to build
- Or press **Cmd + R** to build and run
- Watch for any errors in the bottom panel

### 7. On Your iPhone - Trust the Developer
- Settings > General > VPN & Device Management
- Find your developer certificate
- Tap **"Trust"**

## What You Should See

- ✅ Build Succeeded in Xcode
- ✅ WebDriverAgent appears on your iPhone (blank white screen is normal)
- ✅ In Settings, developer cert is trusted

## Then Come Back to the App

Once you see "Build Succeeded" in Xcode:
1. Leave WebDriverAgent running on your phone
2. Come back to the SnapTest app
3. Try connecting to your device again

The app should now connect successfully via Appium!

## Troubleshooting

**"Signing for requires a development team"**
→ Make sure you selected Team 7MFG6W6M8G for BOTH targets

**"No profiles matching were found"**
→ Make sure you checked "Automatically manage signing" for BOTH targets

**"Device locked"**
→ Unlock your iPhone

**Bundle ID conflicts**
→ Try different Bundle IDs like `com.yourname.WebDriverAgentLib`
