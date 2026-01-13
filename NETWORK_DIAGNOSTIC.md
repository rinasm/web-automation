# Network Connection Diagnostic

**Status**: iOS app installed and running, but NOT connecting to WebSocket server

---

## Critical Issue: No WebSocket Connection

The desktop app consistently shows:
```
⚠️ [WebSocket Server] Connected devices: []
```

This means the iOS app is **NOT reaching the desktop WebSocket server** at all.

---

## Most Likely Cause: Network Mismatch

The **#1 most common reason** for this issue is that the iPhone and Mac are on different networks.

### ✅ CHECKLIST - Verify Same Network

1. **Check Mac WiFi Network**:
   ```bash
   ifconfig en0 | grep "inet "
   # Shows: inet 192.168.1.64
   ```
   - Mac is connected to WiFi with IP: `192.168.1.64`
   - This suggests network: `192.168.1.x`

2. **Check iPhone WiFi Network**:
   - On your iPhone: **Settings → WiFi**
   - **Verify the WiFi network name matches your Mac's network**
   - Tap the (i) button next to the connected network
   - Check the IP address - should be `192.168.1.xxx` (same subnet as Mac)

3. **Common Network Issues**:
   - ❌ iPhone using **cellular data** instead of WiFi
   - ❌ iPhone connected to **different WiFi network** (e.g., "Home" vs "Home-5G")
   - ❌ iPhone connected to **guest network** (often isolated from main network)
   - ❌ Mac connected to **Ethernet**, iPhone on WiFi (different subnets)

---

## Other Possible Causes

### 2. Firewall Blocking Port 8080

**macOS Firewall Check**:
- System Settings → Network → Firewall
- If enabled, make sure it allows connections to your Electron app

**Test connectivity**:
```bash
# On Mac, check if port 8080 is listening:
lsof -i :8080 | grep LISTEN
# Should show: Electron ... TCP *:http-alt (LISTEN)
```

### 3. App Not Initializing SDK

The app might be crashing before the SDK can connect. To verify:

**Open Xcode and view Console logs**:
1. Open Xcode
2. Window → Devices and Simulators
3. Select your iPhone
4. Click "Open Console" button
5. Launch MyTodoApp on your iPhone
6. Look for these logs:
   ```
   🔵 [MyTodoApp] Initializing SnapTest SDK...
   🔧 [MyTodoApp] Connecting to desktop at: ws://192.168.1.64:8080
   ⚠️ [SnapTest SDK] Starting with manual server URL: ws://192.168.1.64:8080
   🟢 [SnapTest SDK] Connected to desktop app
   ```

If you **DON'T see these logs**, the app is crashing or the SDK isn't initializing.

---

## Quick Network Test

To verify network connectivity between iPhone and Mac:

### On iPhone:
1. Open Safari
2. Navigate to: `http://192.168.1.64:8080`
3. You should see a "WebSocket server" message or error (proving iPhone can reach Mac)

### If Safari shows "Can't connect":
- ❌ **Devices are on different networks**
- ❌ **Firewall is blocking the connection**

---

## Detailed Verification Steps

### Step 1: Verify iPhone WiFi Network

**On iPhone**:
1. Settings → WiFi
2. Look at the connected network name (e.g., "MyHome")
3. Tap the (i) button
4. Note the IP address (e.g., `192.168.1.100`)

**Expected**:
- IP should start with `192.168.1.xxx`
- Same first 3 numbers as Mac's IP (`192.168.1.64`)

### Step 2: Test Connection from iPhone

**On iPhone Safari**:
1. Navigate to: `http://192.168.1.64:8080`
2. Expected result: Should connect (even if shows error page)
3. If shows "Cannot connect to server": **Network mismatch!**

### Step 3: Check iOS App Logs

**Using Xcode Console**:
1. Xcode → Window → Devices and Simulators
2. Select "Rinas's iPhone"
3. Click "Open Console"
4. Filter by: "MyTodoApp" or "SnapTest"
5. Launch the app on your iPhone
6. Check if you see SDK initialization logs

**Expected logs**:
```
MyTodoApp: 🔵 [MyTodoApp] Initializing SnapTest SDK...
MyTodoApp: 🔧 [MyTodoApp] Connecting to desktop at: ws://192.168.1.64:8080
MyTodoApp: 🔧 [MyTodoApp] Both iPhone and Mac MUST be on the same WiFi network!
SnapTest: ⚠️ [SnapTest SDK] Starting with manual server URL: ws://192.168.1.64:8080
SnapTest: 🔵 [SnapTest SDK] Initialized with manual connection
```

**If successful connection**:
```
SnapTest: 🟢 [SnapTest SDK] Connected to desktop app
```

### Step 4: Check Desktop Connection

**In the desktop app terminal**, you should see:
```
✅ [WebSocket Server] New client connected: <some-id>
📥 [WebSocket Server] Received handshake from device: Rinas's iPhone
🔵 [SDKManager] Device registered: ios-usb-00008110-001E38A834C3801E
```

---

## Resolution Steps

### If Same Network Confirmed, But Still Not Connecting:

1. **Restart the Desktop App**:
   ```bash
   # Stop the dev server (Ctrl+C in terminal)
   # Restart:
   npm run dev
   ```

2. **Restart the iOS App**:
   - Force quit MyTodoApp on iPhone (swipe up from app switcher)
   - Relaunch from home screen

3. **Disable Mac Firewall Temporarily**:
   - System Settings → Network → Firewall → Off
   - Test connection again
   - Re-enable after testing

4. **Try Manual IP Update** (if Mac IP changed):
   - Check current Mac IP: `ifconfig en0 | grep "inet "`
   - If different from `192.168.1.64`, update `AppDelegate.swift` line 17
   - Rebuild and reinstall app

### If Different Networks:

1. **Connect iPhone to Mac's WiFi network**:
   - iPhone Settings → WiFi
   - Select the same network as your Mac
   - Enter password if needed

2. **Verify connection with Safari test**:
   - Safari → `http://192.168.1.64:8080`
   - Should show connection (even if error page)

3. **Relaunch iOS app**:
   - Force quit MyTodoApp
   - Relaunch from home screen

---

## Success Indicators

When everything is working, you'll see:

### On iOS Device (Xcode Console):
```
🔵 [MyTodoApp] Initializing SnapTest SDK...
🔧 [MyTodoApp] Connecting to desktop at: ws://192.168.1.64:8080
🟢 [SnapTest SDK] Connected to desktop app
```

### On Desktop App (Terminal):
```
✅ [WebSocket Server] New client connected
📥 [WebSocket Server] Received handshake from device: Rinas's iPhone
```

### In Desktop UI:
- Green "SDK Connected" badge appears
- Screenshots work without timeouts
- Device shows in Mobile tab

---

## Files Modified

Current iOS app configuration:
- **AppDelegate.swift** (line 17): Hardcoded IP `192.168.1.64`
- **Desktop WebSocket**: Listening on `ws://0.0.0.0:8080` (port 8080)
- **SDK Initialization**: Removed `#if DEBUG` wrapper (always initializes)

---

## Next Steps

1. **✅ VERIFY**: iPhone and Mac on same WiFi network
2. **✅ TEST**: Safari on iPhone → `http://192.168.1.64:8080`
3. **✅ CHECK**: Xcode Console for SDK initialization logs
4. **✅ CONFIRM**: Desktop terminal shows "client connected"

If all checks pass and connection still fails, there may be a deeper issue with the Starscream WebSocket library or iOS security restrictions.

---

**Last Updated**: 2026-01-08 15:18
**Status**: Awaiting network verification
