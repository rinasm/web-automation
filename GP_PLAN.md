# GlobalProtect VPN Connection Guide

## Overview

This document explains how to connect your iOS device to the SnapTest Desktop app when both devices are on a GlobalProtect VPN with full tunnel mode (no split tunneling).

---

## Current Architecture

### How Connection Works Today

**Electron Desktop App:**
- Runs WebSocket server on port 8080
- Binds to `0.0.0.0` (all network interfaces)
- Publishes Bonjour/mDNS service `_snaptest._tcp.local`
- Logs all available IPs on startup

**iOS SDK:**
- Auto-discovers server via Bonjour (`SnapTest.shared.start()`)
- Falls back to manual connection (`SnapTest.shared.start(serverURL: "ws://...")`)
- Connects via WebSocket and sends handshake

**File Locations:**
- `electron/websocketServer.ts` - Server implementation
- `SnapTestSDK/Sources/SnapTestSDK/SnapTest.swift` - iOS SDK entry point
- `SnapTestSDK/Sources/SnapTestSDK/BonjourServiceDiscovery.swift` - Auto-discovery
- `SnapTestSDK/Sources/SnapTestSDK/WebSocketManager.swift` - WebSocket client

---

## The GlobalProtect Challenge

### Why Auto-Discovery Fails

**Bonjour/mDNS relies on:**
- UDP multicast packets on port 5353
- Local network broadcast (`.local` domain)
- Subnet-wide service announcements

**GlobalProtect VPN (full tunnel) blocks:**
- ❌ Multicast traffic (security policy)
- ❌ Local network access (all traffic routed through VPN)
- ❌ mDNS broadcasts between VPN clients

**Result:** iOS SDK cannot discover server automatically.

### What Still Works

✅ **Direct IP connections** - If VPN allows peer-to-peer, you can connect via IP
✅ **USB tethering** - Physical connection bypasses VPN entirely
✅ **Server is listening** - Already binds to VPN interface (`utun0`, `utun1`, etc.)

---

## Pre-Implementation: Test Your Network

**CRITICAL:** Test if your VPN allows peer-to-peer connections before implementing any solution.

### Step 1: Find Your Mac's VPN IP

```bash
# Run on Mac terminal
ifconfig | grep -A 5 "utun" | grep "inet "
```

Look for output like:
```
utun2: inet 10.123.45.67 --> 10.123.45.1 netmask 0xffffffff
```

Your VPN IP is `10.123.45.67` (or similar `10.x.x.x` / `172.16.x.x` range).

### Step 2: Check Electron Logs

When you run `npm run dev`, look for:
```
🟢 [WebSocket Server] Available connection addresses:
⭐   ws://192.168.1.100:8080 (en0)
     ws://10.123.45.67:8080 (utun2)  <-- This is your VPN IP
```

### Step 3: Test Connectivity from iOS

**Option A - Safari Test:**
1. Connect iOS device to GlobalProtect VPN
2. Open Safari on iOS
3. Navigate to: `http://10.123.45.67:8080` (use your VPN IP)

**Expected Results:**
- ✅ **"Upgrade Required" or WebSocket error** → Port is reachable, proceed with solutions!
- ❌ **Connection timeout** → VPN blocks P2P, use USB connection instead

**Option B - Ping Test (if you have terminal app):**
```bash
ping 10.123.45.67
```
- Replies → ✅ Basic connectivity works
- Timeout → ❌ Blocked by VPN

---

## Solution Options

### Option 1: Manual IP Entry (Immediate Fix)

**Best For:** Quick testing, temporary workaround

**Implementation:**
1. Find your Mac's VPN IP (from Step 1 above)
2. Edit your iOS app code:

```swift
// In AppDelegate.swift or SceneDelegate.swift
#if DEBUG
// Replace auto-discovery with manual connection
SnapTest.shared.start(serverURL: "ws://10.123.45.67:8080")  // Use your VPN IP
#endif
```

3. Rebuild and deploy iOS app

**Pros:**
- ✅ Works immediately (5 minutes to implement)
- ✅ No UI changes needed
- ✅ Simple and reliable

**Cons:**
- ❌ Must rebuild app when VPN IP changes
- ❌ Hardcoded IP address
- ❌ Not suitable for production

---

### Option 2: iOS Settings UI (User-Friendly)

**Best For:** Internal testing teams, QA environments

**Implementation:**

**iOS Changes:**

1. Create `ConnectionSettings.swift`:
```swift
import Foundation

class ConnectionSettings {
    static let shared = ConnectionSettings()

    private let defaults = UserDefaults.standard
    private let serverURLKey = "snaptest_server_url"

    var savedServerURL: String? {
        get { defaults.string(forKey: serverURLKey) }
        set { defaults.set(newValue, forKey: serverURLKey) }
    }

    var shouldUseManualConnection: Bool {
        return savedServerURL != nil && !(savedServerURL ?? "").isEmpty
    }
}
```

2. Add settings screen UI (SwiftUI example):
```swift
import SwiftUI

struct ConnectionSettingsView: View {
    @State private var serverURL: String = ConnectionSettings.shared.savedServerURL ?? ""
    @State private var showSuccess = false

    var body: some View {
        Form {
            Section(header: Text("SnapTest Server")) {
                TextField("ws://10.123.45.67:8080", text: $serverURL)
                    .keyboardType(.URL)
                    .autocapitalization(.none)

                Button("Save & Connect") {
                    ConnectionSettings.shared.savedServerURL = serverURL
                    SnapTest.shared.stop()
                    SnapTest.shared.start(serverURL: serverURL)
                    showSuccess = true
                }
            }

            Section(header: Text("Instructions")) {
                Text("Check your Electron app console for the WebSocket URL (ws://...).")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .alert("Connected", isPresented: $showSuccess) {
            Button("OK", role: .cancel) { }
        }
    }
}
```

3. Update initialization logic:
```swift
#if DEBUG
if ConnectionSettings.shared.shouldUseManualConnection {
    SnapTest.shared.start(serverURL: ConnectionSettings.shared.savedServerURL!)
} else {
    SnapTest.shared.start()  // Auto-discovery fallback
}
#endif
```

**Pros:**
- ✅ User can change IP without rebuilding
- ✅ Stored for future sessions
- ✅ Fallback to auto-discovery

**Cons:**
- ❌ Requires typing on phone keyboard
- ❌ Moderate development effort
- ❌ Adds UI complexity

---

### Option 3: QR Code Connection (Best UX)

**Best For:** Production apps, frequent network changes, professional deployment

**Implementation:**

**Electron App Changes:**

1. Install QR code library:
```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

2. Add QR generation to `electron/websocketServer.ts`:
```typescript
import QRCode from 'qrcode'

class SnapTestWebSocketServer {
  private async generateQRCode(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
    } catch (err) {
      console.error('Failed to generate QR code:', err)
      return ''
    }
  }

  private async announceServerAddresses() {
    const allAddresses = getAllLocalIPAddresses()
    const primaryIP = getLocalIPAddress()

    // Generate QR code for primary IP
    const wsURL = `ws://${primaryIP}:${this.port}`
    const qrCodeDataURL = await this.generateQRCode(wsURL)

    console.log(`🟢 [WebSocket Server] Listening on ws://0.0.0.0:${this.port}`)
    console.log(`🟢 [WebSocket Server] Primary URL: ${wsURL}`)
    console.log(`📱 [WebSocket Server] Scan QR code to connect`)

    // Notify renderer with QR code
    this.notifyRenderer('server-started', {
      port: this.port,
      ip: primaryIP,
      allIPs: allAddresses,
      qrCode: qrCodeDataURL,
      wsURL: wsURL
    })
  }
}
```

3. Add QR display in React UI (`src/components/MobileWebView.tsx` or new component):
```tsx
import React, { useState, useEffect } from 'react'

export const ConnectionQRCode: React.FC = () => {
  const [qrCode, setQRCode] = useState<string>('')
  const [wsURL, setWsURL] = useState<string>('')

  useEffect(() => {
    window.electronAPI.onServerStarted((data: any) => {
      setQRCode(data.qrCode)
      setWsURL(data.wsURL)
    })
  }, [])

  if (!qrCode) return null

  return (
    <div className="bg-gray-900 p-4 rounded">
      <h3 className="text-white mb-2">iOS Connection</h3>
      <img src={qrCode} alt="Connection QR Code" />
      <p className="text-gray-400 text-sm mt-2">{wsURL}</p>
    </div>
  )
}
```

**iOS Changes:**

1. Add AVFoundation framework for QR scanning
2. Create `QRScannerView.swift`:
```swift
import SwiftUI
import AVFoundation

struct QRScannerView: UIViewControllerRepresentable {
    @Binding var scannedURL: String?
    @Environment(\.presentationMode) var presentationMode

    func makeUIViewController(context: Context) -> QRScannerViewController {
        let vc = QRScannerViewController()
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ uiViewController: QRScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, QRScannerDelegate {
        let parent: QRScannerView

        init(_ parent: QRScannerView) {
            self.parent = parent
        }

        func didScanQRCode(url: String) {
            parent.scannedURL = url
            parent.presentationMode.wrappedValue.dismiss()
        }
    }
}

protocol QRScannerDelegate: AnyObject {
    func didScanQRCode(url: String)
}

class QRScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    weak var delegate: QRScannerDelegate?
    private var captureSession: AVCaptureSession?

    override func viewDidLoad() {
        super.viewDidLoad()
        setupCamera()
    }

    private func setupCamera() {
        captureSession = AVCaptureSession()

        guard let captureSession = captureSession,
              let videoCaptureDevice = AVCaptureDevice.default(for: .video),
              let videoInput = try? AVCaptureDeviceInput(device: videoCaptureDevice) else {
            return
        }

        if captureSession.canAddInput(videoInput) {
            captureSession.addInput(videoInput)
        }

        let metadataOutput = AVCaptureMetadataOutput()
        if captureSession.canAddOutput(metadataOutput) {
            captureSession.addOutput(metadataOutput)
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.qr]
        }

        let previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
        previewLayer.frame = view.layer.bounds
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)

        captureSession.startRunning()
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        if let metadataObject = metadataObjects.first,
           let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject,
           let stringValue = readableObject.stringValue,
           stringValue.hasPrefix("ws://") {
            captureSession?.stopRunning()
            delegate?.didScanQRCode(url: stringValue)
        }
    }
}
```

3. Add to your settings/connection screen:
```swift
struct ConnectionView: View {
    @State private var showScanner = false
    @State private var scannedURL: String?

    var body: some View {
        VStack {
            Button("Scan QR Code") {
                showScanner = true
            }
            .sheet(isPresented: $showScanner) {
                QRScannerView(scannedURL: $scannedURL)
            }
        }
        .onChange(of: scannedURL) { url in
            if let url = url {
                ConnectionSettings.shared.savedServerURL = url
                SnapTest.shared.start(serverURL: url)
            }
        }
    }
}
```

4. Update `Info.plist` with camera permission:
```xml
<key>NSCameraUsageDescription</key>
<string>Scan QR code to connect to SnapTest Desktop</string>
```

**Pros:**
- ✅ Professional, production-ready
- ✅ Fast connection (1-2 seconds)
- ✅ No manual typing
- ✅ Auto-detects VPN IP changes

**Cons:**
- ❌ Requires camera permission
- ❌ Moderate-high development effort
- ❌ Changes to both apps

---

### Option 4: Cloud Relay Server (Enterprise)

**Best For:** Remote testing, distributed teams, production at scale

**Architecture:**
```
[Mac Desktop] <-- WSS --> [Cloud Relay] <-- WSS --> [iOS Device]
                           (AWS/Azure)
```

**Implementation:**

1. Deploy WebSocket relay server (Node.js example):
```javascript
// relay-server.js
const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 8080 })

const desktopClients = new Map()
const mobileClients = new Map()

wss.on('connection', (ws, req) => {
  ws.on('message', (data) => {
    const message = JSON.parse(data)

    if (message.type === 'register') {
      if (message.role === 'desktop') {
        desktopClients.set(message.sessionId, ws)
      } else if (message.role === 'mobile') {
        mobileClients.set(message.sessionId, ws)
      }
    } else if (message.type === 'relay') {
      // Forward message to paired client
      const targetClient = message.from === 'desktop'
        ? mobileClients.get(message.sessionId)
        : desktopClients.get(message.sessionId)

      if (targetClient) {
        targetClient.send(JSON.stringify(message.payload))
      }
    }
  })
})
```

2. Update Electron app to connect to relay
3. Update iOS SDK to connect to relay
4. Deploy to cloud (AWS EC2, Heroku, Azure)

**Pros:**
- ✅ Works in ANY network scenario
- ✅ Remote testing possible
- ✅ Scalable to multiple teams

**Cons:**
- ❌ Infrastructure costs ($5-50/month)
- ❌ Increased latency (100-300ms)
- ❌ Deployment complexity
- ❌ Requires TLS certificates (WSS)

---

### Option 5: USB Connection (VPN Bypass)

**Best For:** Guaranteed to work, no network dependencies

**How It Works:**
- Connect iPhone to Mac via Lightning/USB-C cable
- Mac sees device as `bridge100` interface
- Server already detects this automatically
- Works regardless of VPN configuration

**Implementation:**
```swift
// In your iOS app - no code changes needed!
// Auto-discovery will work when connected via USB

#if DEBUG
SnapTest.shared.start()  // Keep using auto-discovery
#endif
```

**Why It Works:**
- USB creates direct network bridge
- Bonjour works over USB interface
- VPN policies don't affect USB tethering
- Server prioritizes bridge interfaces (already implemented)

**From `electron/websocketServer.ts`:**
```typescript
// Prioritize iPhone hotspot (bridge interfaces)
const hotspotInterface = allAddresses.find(addr => addr.interface.startsWith('bridge'))
if (hotspotInterface) {
  console.log(`🌐 [Network] Found iPhone Hotspot interface: ${hotspotInterface.address}`)
  return hotspotInterface.address
}
```

**Pros:**
- ✅ **Zero code changes required**
- ✅ Guaranteed to work
- ✅ No VPN restrictions
- ✅ Fast and reliable
- ✅ Already implemented

**Cons:**
- ❌ Requires physical cable
- ❌ Less convenient for testing
- ❌ Device must stay connected

---

## Decision Tree

```
Start: Need to connect iOS to Mac on GlobalProtect VPN
│
├─> Test Connectivity (see "Step 3: Test Connectivity")
│   │
│   ├─> ✅ VPN allows P2P connections
│   │   │
│   │   ├─> Need immediate fix → Option 1 (Manual IP)
│   │   ├─> Internal testing → Option 2 (Settings UI)
│   │   ├─> Production ready → Option 3 (QR Code)
│   │   └─> Remote teams → Option 4 (Cloud Relay)
│   │
│   └─> ❌ VPN blocks P2P connections
│       │
│       ├─> Can use cable → Option 5 (USB Connection) ⭐ RECOMMENDED
│       └─> Cannot use cable → Option 4 (Cloud Relay)
│
└─> Want safest option without testing → Option 5 (USB)
```

---

## Recommendations

### For Your Scenario (Corporate VPN, Full Tunnel):

**First Choice:** 🔌 **Option 5 - USB Connection**
- Zero code changes
- Guaranteed to work
- Already implemented

**Second Choice:** 📱 **Option 3 - QR Code** (if P2P connectivity works)
- Professional solution
- Best long-term UX
- Handles IP changes gracefully

**Quick Fix:** ⚡ **Option 1 - Manual IP**
- Test immediately
- Decide on permanent solution later

### Implementation Order:

1. **Test connectivity first** (5 minutes)
2. **Try USB connection** (1 minute - just plug in cable)
3. If USB not feasible and P2P works → **Implement QR Code** (2-4 hours)
4. If VPN blocks everything → **Contact IT** or **Deploy Relay** (1 day)

---

## Additional Resources

### Troubleshooting

**"Cannot find device" error:**
- Check Electron logs for available IPs
- Verify iOS device on same VPN
- Test with Safari (http://[vpn-ip]:8080)

**"Connection refused" error:**
- Dev server not running → `npm run dev`
- Firewall blocking port 8080 → Check Mac Security settings
- VPN blocking port → Contact IT

**"Connection timeout" error:**
- VPN blocks P2P → Use USB or Cloud Relay
- Wrong IP address → Check Electron logs
- Port 8080 in use → Change port in code

### Network Commands

```bash
# Find VPN interfaces
ifconfig | grep -E "utun|ppp|tap|tun"

# Check what's listening on port 8080
lsof -i :8080

# Test WebSocket from iOS Safari console
var ws = new WebSocket('ws://10.123.45.67:8080');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
```

---

## Questions or Issues?

If you encounter issues:
1. Check Electron console logs for server startup messages
2. Verify iOS device logs (Xcode → Window → Devices → View logs)
3. Test basic connectivity with Safari or ping
4. Try USB connection as fallback

For feature requests or bug reports:
- Review `CLAUDE.md` for architecture details
- Check `PHASE_*.md` for implementation notes
