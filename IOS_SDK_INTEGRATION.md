# SnapTest SDK Integration Guide for iOS

## 🎯 Overview

The SnapTest SDK allows your iOS app to communicate with the SnapTest Desktop application in real-time, enabling automated test recording without the limitations of traditional Appium-based approaches.

### Key Benefits

✅ **Real-time Event Capture** - No delays, events captured instantly as they happen
✅ **No Page Source Delays** - Bypasses iOS's slow page source API (10s+ → instant)
✅ **Seamless Integration** - 5-minute setup with Swift Package Manager
✅ **Zero Performance Impact** - Only active during recording sessions
✅ **No Code Signing Issues** - Unlike injection methods, this uses standard integration

---

## 📦 Installation

### Method 1: Swift Package Manager (Recommended)

1. Open your iOS project in Xcode
2. Go to **File → Add Package Dependencies...**
3. Enter the SDK repository URL or local path:
   ```
   file:///path/to/ui-test-automation/SnapTestSDK
   ```
4. Click **Add Package**
5. Select **SnapTestSDK** and click **Add Package**

### Method 2: Manual Integration

1. Drag the `SnapTestSDK` folder into your Xcode project
2. Ensure "Copy items if needed" is checked
3. Add to your app target

---

## 🚀 Quick Start

### Step 1: Import the SDK

```swift
import SnapTestSDK
```

### Step 2: Initialize in Your App Delegate

```swift
import UIKit
import SnapTestSDK

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // Only enable SnapTest SDK in debug builds
        #if DEBUG
        SnapTest.shared.start(serverURL: "ws://localhost:8080")
        print("SnapTest SDK initialized")
        #endif

        return true
    }
}
```

### Step 3: Run Your App

1. **Start SnapTest Desktop App**
   ```bash
   cd /path/to/ui-test-automation
   npm run dev
   ```

2. **Build and Run Your iOS App** in Xcode
   - The SDK will automatically connect to the desktop app
   - Look for: `🟢 [SnapTest SDK] Connected to desktop app`

3. **Start Recording** in SnapTest Desktop
   - You'll see: `📱 SDK Connected` badge in the UI
   - Interact with your app normally
   - All touches are captured automatically!

---

## 🎨 Integration Examples

### For SwiftUI Apps

```swift
import SwiftUI
import SnapTestSDK

@main
struct MyApp: App {

    init() {
        #if DEBUG
        SnapTest.shared.start(serverURL: "ws://localhost:8080")
        #endif
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

### For UIKit Apps (Scene Delegate)

```swift
import UIKit
import SnapTestSDK

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let _ = (scene as? UIWindowScene) else { return }

        // Initialize SnapTest SDK
        #if DEBUG
        SnapTest.shared.start(serverURL: "ws://localhost:8080")
        #endif
    }
}
```

### Conditional Integration (Only for QA Builds)

```swift
import UIKit
#if DEBUG || QA
import SnapTestSDK
#endif

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // Only enable in debug or QA builds
        #if DEBUG || QA
        let serverURL = ProcessInfo.processInfo.environment["SNAPTEST_SERVER"] ?? "ws://localhost:8080"
        SnapTest.shared.start(serverURL: serverURL)
        print("✅ SnapTest SDK enabled: \(serverURL)")
        #endif

        return true
    }
}
```

---

## 🔧 Configuration

### Custom Server URL

If your SnapTest desktop app is running on a different machine:

```swift
// Local network (find your Mac's IP address)
SnapTest.shared.start(serverURL: "ws://192.168.1.100:8080")

// Remote server
SnapTest.shared.start(serverURL: "ws://snaptest.company.com:8080")
```

### Programmatic Control

```swift
import SnapTestSDK

// Start SDK
SnapTest.shared.start(serverURL: "ws://localhost:8080")

// Check connection status
if SnapTest.shared.isConnected {
    print("Connected to SnapTest Desktop")
}

// Check recording status
if SnapTest.shared.isRecording {
    print("Currently recording")
}

// Manually stop SDK (usually not needed)
SnapTest.shared.stop()
```

---

## 📝 Element Identification Best Practices

The SDK automatically captures element information. To improve test reliability:

### 1. Use Accessibility Identifiers

```swift
// SwiftUI
Text("Login")
    .accessibilityIdentifier("loginButton")

Button("Submit") {
    // action
}
.accessibilityIdentifier("submitButton")

// UIKit
loginButton.accessibilityIdentifier = "loginButton"
submitButton.accessibilityIdentifier = "submitButton"
```

### 2. Use Accessibility Labels

```swift
// SwiftUI
Image("profile")
    .accessibilityLabel("Profile Picture")

// UIKit
profileImageView.accessibilityLabel = "Profile Picture"
```

### 3. Structure Your View Hierarchy

```swift
// Good: Logical hierarchy with identifiers
VStack {
    Text("Welcome")
        .accessibilityIdentifier("welcomeTitle")

    TextField("Email", text: $email)
        .accessibilityIdentifier("emailInput")

    Button("Login") { }
        .accessibilityIdentifier("loginButton")
}

// Avoid: Deeply nested anonymous views
VStack {
    VStack {
        VStack {
            Text("Welcome") // Hard to identify
        }
    }
}
```

---

## 🐛 Troubleshooting

### SDK Not Connecting

**Symptom:** No "SDK Connected" badge appears in SnapTest Desktop

**Solutions:**

1. **Check Desktop App is Running**
   ```bash
   # You should see:
   # 🟢 [WebSocket Server] Listening on ws://localhost:8080
   npm run dev
   ```

2. **Check Network Connection**
   ```swift
   // Add logging in AppDelegate
   #if DEBUG
   print("🔵 [App] Starting SnapTest SDK...")
   SnapTest.shared.start(serverURL: "ws://localhost:8080")
   print("🔵 [App] SDK initialization complete")
   #endif
   ```

3. **Check Firewall Settings**
   - Ensure port 8080 is not blocked
   - Try disabling macOS firewall temporarily

4. **Verify iOS Simulator/Device Network**
   ```swift
   // iOS Simulator uses localhost directly
   SnapTest.shared.start(serverURL: "ws://localhost:8080")

   // Physical device needs Mac's IP address
   SnapTest.shared.start(serverURL: "ws://192.168.1.100:8080")
   ```

### Events Not Being Captured

**Symptom:** SDK connected but no events appear when tapping

**Solutions:**

1. **Check Recording Mode is Active**
   - Look for "RECORDING" indicator in desktop app
   - Verify recording was started in SnapTest UI

2. **Check Gesture Recognizers**
   ```swift
   // Ensure your views have user interaction enabled
   myView.isUserInteractionEnabled = true
   ```

3. **Check Console Logs**
   ```
   👆 [TouchEventCapture] Tap at (100, 200)
   📤 [WebSocketManager] Sent event: touch
   ```

### Element Information Missing

**Symptom:** Events captured but no element details

**Solutions:**

1. **Add Accessibility Identifiers**
   ```swift
   button.accessibilityIdentifier = "myButton"
   ```

2. **Add Accessibility Labels**
   ```swift
   button.accessibilityLabel = "Submit Form"
   ```

3. **Enable Accessibility**
   ```swift
   button.isAccessibilityElement = true
   ```

---

## 📊 How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│  Your iOS App (with SnapTest SDK)          │
│  ┌────────────────────────────────────┐    │
│  │  SnapTest.shared                   │    │
│  │  ├─ TouchEventCapture              │    │
│  │  │  └─ Gesture Recognizers         │    │
│  │  ├─ ViewHierarchyInspector         │    │
│  │  │  └─ Element Information         │    │
│  │  └─ WebSocketManager               │    │
│  │     └─ Starscream Client           │    │
│  └────────────────────────────────────┘    │
└──────────────┬──────────────────────────────┘
               │
               │ WebSocket (ws://localhost:8080)
               │ Real-time events
               │
┌──────────────▼──────────────────────────────┐
│  SnapTest Desktop App (Electron)           │
│  ┌────────────────────────────────────┐    │
│  │  WebSocket Server (port 8080)      │    │
│  │  ├─ Receives touch events          │    │
│  │  ├─ Forwards to UI                 │    │
│  │  └─ Stores in recording            │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Event Flow

1. **User Taps Element**
   - iOS app detects touch via gesture recognizer
   - `TouchEventCapture` captures coordinates and element info

2. **Element Identification**
   - `ViewHierarchyInspector` finds the tapped view
   - Extracts: accessibility ID, label, text, bounds, class

3. **WebSocket Transmission**
   - Event converted to JSON
   - Sent to desktop app via WebSocket
   - ~5-10ms latency

4. **Desktop Recording**
   - Desktop app receives event
   - Converts to `RecordedEvent` format
   - Displays in UI and stores in session

5. **Code Generation**
   - When recording stops, events converted to test code
   - XPath selectors generated from element info

---

## 🔐 Security & Privacy

### What the SDK Does

✅ Captures touch coordinates and gesture types
✅ Reads view hierarchy and element properties
✅ Sends data to localhost (your machine)
✅ Only active in debug builds (recommended)

### What the SDK Does NOT Do

❌ Does not access sensitive data (passwords, tokens, etc.)
❌ Does not send data to external servers
❌ Does not modify app behavior or logic
❌ Does not persist data or use analytics

### Recommended Security Practices

1. **Only Enable in Debug/QA Builds**
   ```swift
   #if DEBUG
   SnapTest.shared.start(serverURL: "ws://localhost:8080")
   #endif
   ```

2. **Never Ship SDK to Production**
   ```swift
   // In your Podfile or SPM config:
   // Only link SnapTestSDK for debug configurations
   ```

3. **Use Environment Variables**
   ```swift
   #if DEBUG
   if let serverURL = ProcessInfo.processInfo.environment["SNAPTEST_SERVER"] {
       SnapTest.shared.start(serverURL: serverURL)
   }
   #endif
   ```

---

## 📚 API Reference

### SnapTest (Main SDK Class)

```swift
class SnapTest {
    static let shared: SnapTest

    var isConnected: Bool { get }
    var isRecording: Bool { get }

    func start(serverURL: String)
    func stop()
    func startRecording()
    func stopRecording()
}
```

### Methods

#### `start(serverURL:)`
Initializes the SDK and connects to SnapTest Desktop.

```swift
SnapTest.shared.start(serverURL: "ws://localhost:8080")
```

**Parameters:**
- `serverURL`: WebSocket server URL (e.g., `ws://localhost:8080`)

---

#### `stop()`
Disconnects from desktop app and stops event capture.

```swift
SnapTest.shared.stop()
```

---

#### `startRecording()` / `stopRecording()`
Manually control recording (usually triggered by desktop app).

```swift
SnapTest.shared.startRecording()
// ... user interactions ...
SnapTest.shared.stopRecording()
```

---

## 💡 Advanced Usage

### Custom Event Filtering

You can modify the SDK to filter certain events:

```swift
// In your fork of TouchEventCapture.swift
@objc private func handleTap(_ recognizer: UITapGestureRecognizer) {
    guard isCapturing else { return }

    let location = recognizer.location(in: recognizer.view)
    let hitView = recognizer.view?.hitTest(location, with: nil)

    // Custom filtering
    if hitView is UIWebView {
        print("⚠️ [TouchEventCapture] Ignoring tap on web view")
        return
    }

    // Continue with normal capture...
}
```

### Multiple Devices

The desktop app can handle multiple SDK connections simultaneously:

```swift
// Device 1 (iPhone)
SnapTest.shared.start(serverURL: "ws://192.168.1.100:8080")

// Device 2 (iPad) - connects to same server
SnapTest.shared.start(serverURL: "ws://192.168.1.100:8080")
```

Each device shows up separately in the desktop UI.

---

## 🎉 Next Steps

1. ✅ **Integrate SDK** into your iOS app
2. ✅ **Start SnapTest Desktop** (`npm run dev`)
3. ✅ **Record Your First Flow**
4. ✅ **Generate Test Code**
5. ✅ **Replay in CI/CD**

---

## 📞 Support

### Issues & Questions

- **GitHub Issues**: https://github.com/yourusername/ui-test-automation/issues
- **Documentation**: See `SCREENSHOT_RECORDING_IMPLEMENTATION.md` for desktop app details

### Contributing

Contributions welcome! See `CONTRIBUTING.md` for guidelines.

---

## 📄 License

[Your License Here]

---

## 🙏 Acknowledgments

- **Starscream**: WebSocket library by Dalton Cherry
- **Appium Community**: Inspiration for element identification
- **iOS Automation Community**: Research and guidance

---

**Version:** 1.0.0
**Last Updated:** 2025-01-11
**Compatibility:** iOS 13.0+, Swift 5.9+
