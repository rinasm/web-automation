# iOS WebSocket Connection Fix

**Date**: 2026-01-08
**Issue**: Screenshot timeouts due to iOS app not connecting to desktop WebSocket server

---

## Root Cause Identified

The desktop app logs showed:
```
⚠️ [WebSocket Server] Device not found: ios-usb-00008110-001E38A834C3801E
⚠️ [WebSocket Server] Connected devices: []
```

**The iOS app was NOT connecting to the WebSocket server**, even though:
- ✅ Desktop app is running and listening on `ws://192.168.1.64:8080`
- ✅ Bonjour service is published: `_snaptest._tcp.local`
- ✅ iOS app has SDK initialization code: `SnapTest.shared.start()`
- ✅ iOS app is built in Debug mode (so `#if DEBUG` is active)

**Conclusion**: Bonjour auto-discovery is failing on the iOS device. The device cannot find or connect to the desktop app via mDNS.

---

## Fix Applied

Updated `/Users/rinasmusthafa/works/IOS/MyTodoApp/MyTodoApp/AppDelegate.swift` to use **manual WebSocket connection** instead of Bonjour discovery:

```swift
// BEFORE (Bonjour auto-discovery):
SnapTest.shared.start()

// AFTER (Manual connection with known IP):
let desktopIP = "192.168.1.64"
let serverURL = "ws://\(desktopIP):8080"
SnapTest.shared.start(serverURL: serverURL)
```

This bypasses Bonjour and connects directly to the desktop app.

---

## Installation Required

The app has been **successfully built** with the fix, but needs to be installed manually due to expired provisioning profile:

### Manual Installation Steps:

1. **Open Xcode**:
   ```bash
   open /Users/rinasmusthafa/works/IOS/MyTodoApp/MyTodoApp.xcodeproj
   ```

2. **Ensure Debug configuration**:
   - In Xcode, go to: Product → Scheme → Edit Scheme
   - Under "Run" tab, verify "Build Configuration" is set to **Debug**

3. **Select your device**:
   - At the top of Xcode, select your iPhone from the device dropdown

4. **Build and Run**:
   - Press `Cmd + R` (or click the Play button)
   - Xcode will handle provisioning profile updates automatically
   - The app will install and launch on your device

---

## Expected Behavior After Installation

### On iOS Device (in Xcode Console):
```
🔵 [MyTodoApp] Initializing SnapTest SDK...
🔧 [MyTodoApp] Connecting to desktop at: ws://192.168.1.64:8080
⚠️ [SnapTest SDK] Starting with manual server URL: ws://192.168.1.64:8080
🔵 [SnapTest SDK] Initialized with manual connection
🟢 [SnapTest SDK] Connected to desktop app
```

### On Desktop App (in Terminal):
```
✅ [WebSocket Server] New client connected: <device-id>
📥 [WebSocket Server] Received handshake from device: Rinas's iPhone
🔵 [SDKManager] Device registered: ios-usb-00008110-001E38A834C3801E
```

### In Desktop UI:
- The **"SDK Connected"** badge should appear in green
- Screenshots should now work without timeouts (200-500ms response time)
- Touch events should be captured during recording

---

## Verification Steps

After installing and launching the app:

1. **Check Desktop App Connection**:
   - Look for green "SDK Connected" badge in the desktop UI
   - Terminal should show device connected message

2. **Test Screenshot**:
   - In the desktop app, click the Mobile tab
   - The device preview should show a live screenshot of the iOS app
   - No timeout errors should appear

3. **Test Recording**:
   - Click "Start Recording" in desktop app
   - Interact with the iOS app (tap buttons, type text)
   - Desktop app should capture and display the touch events

---

## Troubleshooting

### If Connection Still Fails:

1. **Verify WiFi Network**:
   - Ensure both Mac and iPhone are on the **same WiFi network**
   - Check iPhone Settings → WiFi → Verify network name
   - iPhone should NOT be using cellular data

2. **Check Desktop IP**:
   - The fix assumes desktop IP is `192.168.1.64`
   - Verify with: `ifconfig en0 | grep "inet "`
   - If IP is different, update `AppDelegate.swift` line 17

3. **Check Firewall**:
   - macOS System Settings → Network → Firewall
   - Ensure Firewall is OFF or allows connections to the Electron app

4. **Restart Desktop App**:
   - Stop the dev server (Ctrl+C)
   - Restart: `npm run dev`
   - Wait for "WebSocket Server Listening" message

---

## Why Bonjour Failed

Possible reasons for Bonjour auto-discovery failure:

1. **mDNS Blocked**: Corporate WiFi networks often block mDNS/Bonjour traffic
2. **Network Isolation**: Some WiFi routers isolate devices (AP isolation)
3. **iOS Restrictions**: iOS may restrict Bonjour in certain scenarios
4. **Service Not Published**: Desktop app's Bonjour service may not be broadcasting correctly

**Manual connection bypasses all these issues** by connecting directly via IP address.

---

## Future Improvements

For Phase 4, we should add:

1. **Manual IP Entry UI**: Allow users to enter desktop IP in app settings
2. **QR Code Connection**: Desktop shows QR code with WebSocket URL, iOS scans to connect
3. **Bonjour + Manual Fallback**: Try Bonjour first, fall back to manual if fails
4. **Connection Status UI**: Show connection status visually in iOS app (not just logs)

---

## Files Modified

- **AppDelegate.swift** (`/Users/rinasmusthafa/works/IOS/MyTodoApp/MyTodoApp/AppDelegate.swift`)
  - Lines 15-25: Changed from `SnapTest.shared.start()` to manual connection
  - Desktop IP hardcoded: `192.168.1.64`
  - WebSocket port: `8080`

---

## Next Steps

1. **Install the app** via Xcode (Cmd+R)
2. **Verify connection** in desktop app logs
3. **Test screenshots** - should work immediately
4. **Test recording and playback** - should capture touch events
5. **Document results** - add to Phase 2 validation checklist

---

**Status**: Fix applied, awaiting manual installation
**Expected Result**: WebSocket connection established, screenshots working
**Rollback**: Revert AppDelegate.swift to use `SnapTest.shared.start()` for Bonjour
