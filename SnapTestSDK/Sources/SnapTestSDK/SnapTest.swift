import UIKit
import Foundation

/// Main SnapTest SDK entry point
///
/// **Recommended Usage (Auto-Discovery):**
/// ```swift
/// import SnapTestSDK
///
/// // In AppDelegate or SceneDelegate
/// #if DEBUG
/// SnapTest.shared.start()  // Automatically discovers SnapTest Desktop via Bonjour
/// #endif
/// ```
///
/// **Manual Connection (if needed):**
/// ```swift
/// // Only use if Bonjour is not available or connecting to remote server
/// SnapTest.shared.start(serverURL: "ws://192.168.1.100:8080")
/// ```
public class SnapTest {

    /// Shared singleton instance
    public static let shared = SnapTest()

    /// WebSocket manager for communication with desktop app
    private var webSocketManager: WebSocketManager?

    /// Touch event capture manager
    private var touchEventCapture: TouchEventCapture?

    /// Bonjour service discovery
    private var bonjourDiscovery: BonjourServiceDiscovery?

    /// Current connection status
    public private(set) var isConnected: Bool = false

    /// Current recording status
    public private(set) var isRecording: Bool = false

    private init() {}

    // MARK: - Public API

    /// Start SnapTest SDK with auto-discovery using Bonjour (RECOMMENDED)
    ///
    /// This will automatically discover SnapTest desktop app on the local network.
    /// No configuration needed - just call this method and it will connect automatically!
    ///
    /// This is the recommended way to start the SDK as it:
    /// - Works across different networks without code changes
    /// - No need to find or hardcode IP addresses
    /// - Automatically reconnects if server restarts
    ///
    /// Usage:
    /// ```swift
    /// #if DEBUG
    /// SnapTest.shared.start()  // Uses auto-discovery by default
    /// #endif
    /// ```
    public func start() {
        print("🔵 [SnapTest SDK] Starting with Bonjour auto-discovery...")

        // Initialize touch event capture
        touchEventCapture = TouchEventCapture()
        touchEventCapture?.delegate = self

        // Start Bonjour discovery
        bonjourDiscovery = BonjourServiceDiscovery()
        bonjourDiscovery?.delegate = self
        bonjourDiscovery?.startDiscovery()

        print("🔵 [SnapTest SDK] Auto-discovery started - searching for SnapTest Desktop...")
    }

    /// Start SnapTest SDK with auto-discovery using Bonjour
    ///
    /// Alias for `start()` - included for backward compatibility.
    /// Consider using `start()` instead.
    @available(*, deprecated, message: "Use start() instead for auto-discovery")
    public func startWithAutoDiscovery() {
        start()
    }

    /// Start SnapTest SDK with manual WebSocket connection to desktop app
    /// - Parameter serverURL: WebSocket server URL (e.g., "ws://192.168.1.100:8080")
    ///
    /// **⚠️ DEPRECATED - Use `start()` instead for automatic Bonjour discovery**
    ///
    /// This method is only needed if:
    /// - You're connecting to a remote server (not on local network)
    /// - Bonjour/mDNS is not available in your environment
    /// - You need to test with a specific server URL
    ///
    /// For most use cases, use `start()` with auto-discovery instead.
    public func start(serverURL: String) {
        print("⚠️ [SnapTest SDK] Starting with manual server URL: \(serverURL)")
        print("⚠️ [SnapTest SDK] Consider using start() with auto-discovery instead")

        // Initialize WebSocket manager
        webSocketManager = WebSocketManager(serverURL: serverURL)
        webSocketManager?.delegate = self
        webSocketManager?.connect()

        // Initialize touch event capture
        touchEventCapture = TouchEventCapture()
        touchEventCapture?.delegate = self

        print("🔵 [SnapTest SDK] Initialized with manual connection")
    }

    /// Stop SnapTest SDK and disconnect from desktop app
    public func stop() {
        print("🔵 [SnapTest SDK] Stopping...")

        touchEventCapture?.stopCapturing()
        webSocketManager?.disconnect()
        bonjourDiscovery?.stopDiscovery()

        isConnected = false
        isRecording = false

        print("🔵 [SnapTest SDK] Stopped")
    }

    /// Manually start recording (usually triggered by desktop app)
    public func startRecording() {
        guard isConnected else {
            print("⚠️ [SnapTest SDK] Cannot start recording: not connected to desktop app")
            return
        }

        print("🔴 [SnapTest SDK] Recording started")
        isRecording = true
        touchEventCapture?.startCapturing()
    }

    /// Manually stop recording
    public func stopRecording() {
        print("⚪️ [SnapTest SDK] Recording stopped")
        isRecording = false
        touchEventCapture?.stopCapturing()
    }

    /// Send execution log to desktop app (for subprocess visibility)
    public func sendExecutionLog(actionId: String, step: String, message: String, elementType: String? = nil, bounds: CGRect? = nil, centerPoint: CGPoint? = nil, tapStrategy: String? = nil) {
        let logEvent = ExecutionLogEvent(
            actionId: actionId,
            step: step,
            message: message,
            elementType: elementType,
            bounds: bounds,
            centerPoint: centerPoint,
            tapStrategy: tapStrategy
        )
        webSocketManager?.send(event: logEvent)
    }
}

// MARK: - WebSocketManagerDelegate

extension SnapTest: WebSocketManagerDelegate {
    func webSocketDidConnect() {
        print("🟢 [SnapTest SDK] Connected to desktop app")
        isConnected = true

        // Send initial handshake
        let handshake = HandshakeEvent(
            deviceName: UIDevice.current.name,
            deviceModel: UIDevice.current.model,
            systemVersion: UIDevice.current.systemVersion,
            bundleId: Bundle.main.bundleIdentifier ?? "unknown"
        )
        webSocketManager?.send(event: handshake)
    }

    func webSocketDidDisconnect(error: Error?) {
        print("🔴 [SnapTest SDK] Disconnected from desktop app")
        isConnected = false
        isRecording = false

        if let error = error {
            print("❌ [SnapTest SDK] Disconnection error: \(error.localizedDescription)")
        }

        // Auto-reconnect after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
            self?.webSocketManager?.connect()
        }
    }

    func webSocketDidReceiveCommand(_ command: SDKCommand) {
        print("📥 [SnapTest SDK] Received command: \(command.type)")

        switch command.type {
        case .startRecording:
            startRecording()
        case .stopRecording:
            stopRecording()
        case .ping:
            // Respond to ping
            let pong = PongEvent()
            webSocketManager?.send(event: pong)
        case .executeAction:
            handleExecuteAction(command)
        case .getViewHierarchy:
            handleGetViewHierarchy()
        }
    }

    /// Handle get view hierarchy command from desktop app
    private func handleGetViewHierarchy() {
        print("🌳 [SnapTest SDK] Getting view hierarchy...")

        // Execute on main thread since we're accessing UIKit
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            // Get main window
            guard let window = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .flatMap({ $0.windows })
                .first(where: { $0.isKeyWindow }) else {
                print("❌ [SnapTest SDK] No key window found")
                let errorResponse = ViewHierarchyResponseEvent(error: "No key window found")
                self.webSocketManager?.send(event: errorResponse)
                return
            }

            // Build complete view hierarchy using ViewHierarchyInspector
            let startTime = Date()
            let hierarchy = ViewHierarchyInspector.getViewHierarchySnapshot(window: window)
            let elapsed = Date().timeIntervalSince(startTime)

            print("✅ [SnapTest SDK] View hierarchy captured (\(hierarchy.count) characters) in \(String(format: "%.3f", elapsed))s")

            // Send response back to desktop
            let response = ViewHierarchyResponseEvent(hierarchy: hierarchy)
            self.webSocketManager?.send(event: response)
        }
    }

    /// Handle execute action command from desktop app
    private func handleExecuteAction(_ command: SDKCommand) {
        guard let payload = command.payload else {
            print("❌ [SnapTest SDK] Execute action command missing payload")
            return
        }

        guard let actionId = payload.actionId,
              let actionType = payload.actionType,
              let selector = payload.selector else {
            print("❌ [SnapTest SDK] Execute action command missing required fields")
            return
        }

        print("🎬 [SnapTest SDK] Executing action: \(actionType) on selector: \(selector)")

        let startTime = Date()
        var result: (success: Bool, error: String?)

        // Get main window
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow }) else {
            sendActionResult(actionId: actionId, success: false, error: "No key window found", duration: 0)
            return
        }

        // CRITICAL: Execute ALL UIKit operations on main thread to avoid crashes
        // This includes findElement (accesses UIView hierarchy) and executeTap
        func executeOnMainThread<T>(_ block: () -> T) -> T {
            if Thread.isMainThread {
                return block()
            } else {
                return DispatchQueue.main.sync { block() }
            }
        }

        // Execute action based on type
        switch actionType.lowercased() {
        case "tap", "click":
            result = executeOnMainThread {
                guard let element = ActionExecutor.findElement(by: selector, in: window, actionId: actionId) else {
                    let duration = Int(Date().timeIntervalSince(startTime) * 1000)
                    // Differentiate error message based on selector type
                    let errorMsg: String
                    if selector.hasPrefix("/") {
                        // XPath selector
                        errorMsg = "Element not found by XPath: \(selector)"
                    } else {
                        // AccessibilityId selector - include available IDs
                        let availableIds = ActionExecutor.getAvailableIdentifiers(in: window)
                        let idsString = availableIds.isEmpty ? "NONE" : availableIds.joined(separator: ", ")
                        errorMsg = "Element not found: \(selector). Available IDs: [\(idsString)]"
                    }
                    sendActionResult(actionId: actionId, success: false, error: errorMsg, duration: duration)
                    return (false, errorMsg)
                }

                return ActionExecutor.executeTap(on: element, actionId: actionId)
            }

        case "type":
            guard let text = payload.value else {
                sendActionResult(actionId: actionId, success: false, error: "Type action missing text value", duration: 0)
                return
            }
            result = executeOnMainThread {
                guard let element = ActionExecutor.findElement(by: selector, in: window) else {
                    let duration = Int(Date().timeIntervalSince(startTime) * 1000)
                    // Differentiate error message based on selector type
                    let errorMsg: String
                    if selector.hasPrefix("/") {
                        // XPath selector
                        errorMsg = "Element not found by XPath: \(selector)"
                    } else {
                        // AccessibilityId selector - include available IDs
                        let availableIds = ActionExecutor.getAvailableIdentifiers(in: window)
                        let idsString = availableIds.isEmpty ? "NONE" : availableIds.joined(separator: ", ")
                        errorMsg = "Element not found: \(selector). Available IDs: [\(idsString)]"
                    }
                    sendActionResult(actionId: actionId, success: false, error: errorMsg, duration: duration)
                    return (false, errorMsg)
                }

                return ActionExecutor.executeType(on: element, text: text)
            }

        case "swipe":
            guard let direction = payload.swipeDirection else {
                sendActionResult(actionId: actionId, success: false, error: "Swipe action missing direction", duration: 0)
                return
            }

            result = executeOnMainThread {
                return ActionExecutor.executeSwipe(direction: direction, in: window)
            }

        default:
            sendActionResult(actionId: actionId, success: false, error: "Unknown action type: \(actionType)", duration: 0)
            return
        }

        let duration = Int(Date().timeIntervalSince(startTime) * 1000)
        sendActionResult(actionId: actionId, success: result.success, error: result.error, duration: duration)
    }

    /// Send action result back to desktop app
    private func sendActionResult(actionId: String, success: Bool, error: String?, duration: Int) {
        let resultEvent = ActionResultEvent(
            actionId: actionId,
            success: success,
            error: error,
            duration: duration
        )

        webSocketManager?.send(event: resultEvent)

        if success {
            print("✅ [SnapTest SDK] Action \(actionId) completed successfully in \(duration)ms")
        } else {
            print("❌ [SnapTest SDK] Action \(actionId) failed: \(error ?? "Unknown error")")
        }
    }
}

// MARK: - TouchEventCaptureDelegate

extension SnapTest: TouchEventCaptureDelegate {
    func didCaptureTouchEvent(_ event: TouchEvent) {
        guard isRecording else { return }

        print("👆 [SnapTest SDK] Captured touch event: \(event.type)")
        webSocketManager?.send(event: event)
    }
}

// MARK: - BonjourServiceDiscoveryDelegate

extension SnapTest: BonjourServiceDiscoveryDelegate {
    func didDiscoverService(serverURL: String) {
        print("🎯 [SnapTest SDK] Auto-discovered server: \(serverURL)")

        // Stop discovery once we found a service
        bonjourDiscovery?.stopDiscovery()

        // Connect to discovered server
        webSocketManager = WebSocketManager(serverURL: serverURL)
        webSocketManager?.delegate = self
        webSocketManager?.connect()
    }

    func didFailToDiscover(error: Error?) {
        print("❌ [SnapTest SDK] Failed to discover service")

        // Retry discovery after 5 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
            print("🔄 [SnapTest SDK] Retrying discovery...")
            self?.bonjourDiscovery?.startDiscovery()
        }
    }
}
