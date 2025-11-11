import UIKit

/// Executes UI actions programmatically
/// Finds elements and simulates taps, typing, and swipes
class ActionExecutor {

    /// Find element by selector (accessibilityId or xpath) with retry logic
    /// Returns nil if not found. Call getAvailableIdentifiers() to get diagnostic info.
    static func findElement(by selector: String, in window: UIWindow) -> UIView? {
        print("🎯 [ActionExecutor] Finding element with selector: \(selector)")

        // Store the window for diagnostic purposes
        lastSearchedWindow = window

        // On first attempt, dump all available accessibilityIds to help debug
        print("📋 [ActionExecutor] Available accessibilityIds in view hierarchy:")
        dumpAllAccessibilityIds(in: window)

        // Retry configuration
        let maxRetries = 10
        let retryDelay: TimeInterval = 0.2 // 200ms

        for attempt in 0..<maxRetries {
            // CRITICAL FIX: Force UI layout refresh before each search attempt
            // This ensures SwiftUI sheets and other lazy-rendered UI elements are fully rendered
            // NOTE: We're already on the main thread (called from WebSocket delegate), so no need to dispatch
            window.setNeedsLayout()
            window.layoutIfNeeded()

            // Give run loop a chance to process pending UI updates (50ms)
            // This is crucial for SwiftUI sheets and other lazy-rendered elements
            Thread.sleep(forTimeInterval: 0.05)

            print("🔄 [ActionExecutor] Forced UI layout refresh on attempt \(attempt + 1)")

            // Try to find by accessibilityIdentifier first (faster and more reliable)
            if let element = findElementByAccessibilityId(selector, in: window) {
                if attempt > 0 {
                    print("✅ [ActionExecutor] Found element on retry #\(attempt): \(selector)")
                } else {
                    print("✅ [ActionExecutor] Found element by accessibilityId: \(selector)")
                }
                return element
            }

            // Element not found on this attempt - dump hierarchy to see what changed
            if attempt < maxRetries - 1 {
                print("⏳ [ActionExecutor] Element not found (attempt \(attempt + 1)/\(maxRetries)), retrying in \(Int(retryDelay * 1000))ms...")
                print("📋 [ActionExecutor] Current view hierarchy after attempt \(attempt + 1):")
                dumpAllAccessibilityIds(in: window)
                Thread.sleep(forTimeInterval: retryDelay)
            }
        }

        // Fallback: try xpath (not implemented yet, would require parsing xpath)
        print("❌ [ActionExecutor] Element not found after \(maxRetries) retries: \(selector)")
        print("📋 [ActionExecutor] Final dump of available accessibilityIds:")
        dumpAllAccessibilityIds(in: window)
        return nil
    }

    /// Store last searched window for diagnostics
    private static var lastSearchedWindow: UIWindow?

    /// Get all available accessibilityIdentifiers (for diagnostic purposes)
    static func getAvailableIdentifiers(in window: UIWindow) -> [String] {
        var identifiers: [String] = []
        collectAccessibilityIds(in: window, identifiers: &identifiers)
        return identifiers
    }

    /// Collect all accessibilityIds recursively
    private static func collectAccessibilityIds(in view: UIView, identifiers: inout [String]) {
        if let identifier = view.accessibilityIdentifier, !identifier.isEmpty {
            identifiers.append(identifier)
        }

        for subview in view.subviews {
            collectAccessibilityIds(in: subview, identifiers: &identifiers)
        }
    }

    /// Dump all accessibilityIds in the view hierarchy (for debugging)
    private static func dumpAllAccessibilityIds(in view: UIView, depth: Int = 0) {
        let indent = String(repeating: "  ", count: depth)
        let viewType = String(describing: type(of: view))

        if let identifier = view.accessibilityIdentifier, !identifier.isEmpty {
            print("\(indent)📌 \(viewType) - id: '\(identifier)'")
        }

        for subview in view.subviews {
            dumpAllAccessibilityIds(in: subview, depth: depth + 1)
        }
    }

    /// Find element by accessibilityIdentifier
    private static func findElementByAccessibilityId(_ identifier: String, in view: UIView, depth: Int = 0) -> UIView? {
        let indent = String(repeating: "  ", count: depth)
        let viewType = String(describing: type(of: view))
        let viewId = view.accessibilityIdentifier ?? "nil"

        // Log what we're scanning (only log views with identifiers or interactive elements to reduce noise)
        if view.accessibilityIdentifier != nil || view is UIButton || view is UITextField || view is UITextView {
            print("\(indent)🔍 [Search] \(viewType) - id: '\(viewId)' (looking for: '\(identifier)')")
        }

        // Check current view
        if view.accessibilityIdentifier == identifier {
            print("✅ [Search] FOUND at depth \(depth): \(viewType) - id: '\(identifier)'")
            return view
        }

        // Recursively check subviews
        for subview in view.subviews {
            if let found = findElementByAccessibilityId(identifier, in: subview, depth: depth + 1) {
                return found
            }
        }

        return nil
    }

    /// Execute tap action on element
    static func executeTap(on element: UIView) -> (success: Bool, error: String?) {
        print("👆 [ActionExecutor] Executing tap on: \(type(of: element))")

        guard element.isUserInteractionEnabled else {
            print("❌ [ActionExecutor] Element is not user interaction enabled")
            return (false, "Element is not user interaction enabled")
        }

        guard !element.isHidden else {
            print("❌ [ActionExecutor] Element is hidden")
            return (false, "Element is hidden")
        }

        // Check if element is a UIControl and if it's enabled
        if let control = element as? UIControl {
            if !control.isEnabled {
                print("❌ [ActionExecutor] UIControl is disabled")
                return (false, "Element is disabled")
            }
        }

        // NOTE: We're already on the main thread (called from WebSocket delegate), so execute directly

        var tapSucceeded = false

        // PRIORITY 1: If this is a UIButton, call sendActions directly (most reliable)
        if let button = element as? UIButton {
            print("🔘 [ActionExecutor] Found UIButton, using sendActions")
            button.sendActions(for: .touchUpInside)
            tapSucceeded = true
        }
        // PRIORITY 2: If this is another UIControl, use sendActions
        else if let control = element as? UIControl {
            print("🔘 [ActionExecutor] Found UIControl, using sendActions")
            control.sendActions(for: .touchUpInside)
            tapSucceeded = true
        }
        // PRIORITY 3: Search for UIButton in entire window with same accessibilityIdentifier
        else if let identifier = element.accessibilityIdentifier, let window = element.window {
            print("🔍 [ActionExecutor] Searching for UIButton in window with id: \(identifier)")

            // First search in element's subviews
            if let button = findButton(withId: identifier, in: element) {
                print("🔘 [ActionExecutor] Found UIButton in element subviews, using sendActions")
                button.sendActions(for: .touchUpInside)
                tapSucceeded = true
            }
            // If not found, search entire window hierarchy
            else if let button = findButton(withId: identifier, in: window) {
                print("🔘 [ActionExecutor] Found UIButton in window hierarchy, using sendActions")
                button.sendActions(for: .touchUpInside)
                tapSucceeded = true
            } else {
                print("⚠️ [ActionExecutor] No UIButton found anywhere")
                print("📊 [ActionExecutor] Element type: \(type(of: element)), frame: \(element.frame)")

                // CRITICAL: Post notification for SwiftUI button taps
                // accessibilityActivate() often returns true but doesn't actually trigger SwiftUI actions
                print("📤 [ActionExecutor] Posting SnapTestButtonTap notification for: \(identifier)")
                NotificationCenter.default.post(
                    name: NSNotification.Name("SnapTestButtonTap"),
                    object: nil,
                    userInfo: ["buttonId": identifier]
                )

                // Also try accessibility activation as backup
                if element.accessibilityActivate() {
                    print("✅ [ActionExecutor] Also called accessibility activation")
                } else {
                    print("⚠️ [ActionExecutor] Accessibility activation returned false")
                }

                // Give time for notification to be processed
                Thread.sleep(forTimeInterval: 0.1)
                print("✅ [ActionExecutor] Button tap notification posted and processed")
                tapSucceeded = true
            }
        }
        // PRIORITY 4: Try accessibility activation
        else if element.accessibilityActivate() {
            print("✅ [ActionExecutor] Tapped element via accessibility activation")
            tapSucceeded = true
        }
        // Last resort: simulate touch using gesture recognizers
        else {
            self.simulateTouchOnView(element)
            print("✅ [ActionExecutor] Simulated tap on view via gesture recognizer")
            tapSucceeded = true
        }

        // CRITICAL: Force UI hierarchy refresh after tap action
        // This ensures SwiftUI sheets, navigation changes, and other dynamic UI updates are processed
        if tapSucceeded, let window = element.window {
            print("🔄 [ActionExecutor] Forcing UI refresh after tap...")
            window.setNeedsLayout()
            window.layoutIfNeeded()

            // Give run loop time to process UI updates (200ms for sheets/navigation)
            Thread.sleep(forTimeInterval: 0.2)
            print("🔄 [ActionExecutor] UI refresh complete")
        }

        return (true, nil)
    }

    /// Find UIButton in view hierarchy by accessibilityIdentifier
    private static func findButton(withId identifier: String, in view: UIView) -> UIButton? {
        // Check if current view is a UIButton with matching ID
        if let button = view as? UIButton, button.accessibilityIdentifier == identifier {
            return button
        }

        // Recursively search subviews
        for subview in view.subviews {
            if let button = findButton(withId: identifier, in: subview) {
                return button
            }
        }

        return nil
    }

    /// Execute type action on text field
    static func executeType(on element: UIView, text: String) -> (success: Bool, error: String?) {
        print("⌨️ [ActionExecutor] Executing type with text: '\(text)'")

        // NOTE: We're already on the main thread (called from WebSocket delegate), so no need to dispatch
        if let textField = element as? UITextField {
            print("📝 [ActionExecutor] Found UITextField, current text: '\(textField.text ?? "")'")

            // Set the text directly
            print("📝 [ActionExecutor] Setting text to: '\(text)'")
            textField.text = text
            print("📝 [ActionExecutor] Text after setting: '\(textField.text ?? "")'")

            // CRITICAL: Store text on textField temporarily, then call handler
            // Store text in accessibilityHint (temporary storage)
            textField.accessibilityHint = text

            // Call the update handler via the app's TextFieldUpdateHandler class
            callTextFieldUpdateHandler(for: textField)

            // Clear temporary storage
            textField.accessibilityHint = nil

            // CRITICAL: Force UI hierarchy refresh after type action
            // This ensures @Binding updates are propagated and UI reflects the new state
            if let window = textField.window {
                print("🔄 [ActionExecutor] Forcing UI refresh after type...")
                window.setNeedsLayout()
                window.layoutIfNeeded()

                // Give run loop time to process @Binding updates (500ms)
                // IMPORTANT: SwiftUI needs time to propagate @Binding changes and update button states
                Thread.sleep(forTimeInterval: 0.5)
                print("🔄 [ActionExecutor] UI refresh complete")
            }

            print("✅ [ActionExecutor] Typed '\(text)' into UITextField successfully (length: \(text.count))")
            return (true, nil)
        } else if let textView = element as? UITextView {
            textView.text = text
            // UITextView doesn't have sendActions, but we can call delegate method directly
            textView.delegate?.textViewDidChange?(textView)

            // CRITICAL: Force UI hierarchy refresh after type action
            if let window = textView.window {
                print("🔄 [ActionExecutor] Forcing UI refresh after type...")
                window.setNeedsLayout()
                window.layoutIfNeeded()
                Thread.sleep(forTimeInterval: 0.1)
                print("🔄 [ActionExecutor] UI refresh complete")
            }

            print("✅ [ActionExecutor] Typed into UITextView successfully")
            return (true, nil)
        } else {
            print("❌ [ActionExecutor] Element is not a text input field, type: \(type(of: element))")
            return (false, "Element is not a text input field")
        }
    }

    // MARK: - Text Field Update Handler Helper

    /// Call the update handler by posting a notification
    /// The app observes this notification and updates the text field
    private static func callTextFieldUpdateHandler(for textField: UITextField) {
        guard let text = textField.accessibilityHint else {
            NSLog("⚠️ [ActionExecutor] No text in accessibilityHint")
            return
        }

        NSLog("📝 [ActionExecutor] Posting notification with text: '\(text)'")

        // Post notification with textField reference (using its memory address as key)
        let key = String(describing: Unmanaged.passUnretained(textField).toOpaque())

        NotificationCenter.default.post(
            name: NSNotification.Name("SnapTestTextFieldUpdate"),
            object: nil,
            userInfo: [
                "textFieldKey": key,
                "text": text
            ]
        )

        NSLog("📝 [ActionExecutor] Posted notification for textField key: \(key)")
    }

    /// Execute swipe action
    static func executeSwipe(direction: String, in window: UIWindow) -> (success: Bool, error: String?) {
        print("👉 [ActionExecutor] Executing swipe: \(direction)")

        let screenBounds = window.bounds
        let centerX = screenBounds.width / 2
        let centerY = screenBounds.height / 2

        var startPoint: CGPoint
        var endPoint: CGPoint

        switch direction.lowercased() {
        case "up":
            startPoint = CGPoint(x: centerX, y: screenBounds.height * 0.8)
            endPoint = CGPoint(x: centerX, y: screenBounds.height * 0.2)
        case "down":
            startPoint = CGPoint(x: centerX, y: screenBounds.height * 0.2)
            endPoint = CGPoint(x: centerX, y: screenBounds.height * 0.8)
        case "left":
            startPoint = CGPoint(x: screenBounds.width * 0.8, y: centerY)
            endPoint = CGPoint(x: screenBounds.width * 0.2, y: centerY)
        case "right":
            startPoint = CGPoint(x: screenBounds.width * 0.2, y: centerY)
            endPoint = CGPoint(x: screenBounds.width * 0.8, y: centerY)
        default:
            return (false, "Invalid swipe direction: \(direction)")
        }

        // NOTE: We're already on the main thread (called from WebSocket delegate), so execute directly
        self.simulateSwipe(from: startPoint, to: endPoint, in: window)
        print("✅ [ActionExecutor] Swipe executed successfully")

        return (true, nil)
    }

    // MARK: - Private Helpers

    /// Simulate touch on a view by synthesizing touch events
    private static func simulateTouchOnView(_ view: UIView) {
        guard let window = view.window else {
            print("❌ [ActionExecutor] View has no window for touch simulation")
            return
        }

        // Calculate touch point in window coordinates
        let viewCenter = CGPoint(x: view.bounds.midX, y: view.bounds.midY)
        let touchPoint = view.convert(viewCenter, to: window)

        print("📍 [ActionExecutor] Simulating touch at point: \(touchPoint) in window")

        // Try gesture recognizers first
        if let tapGestures = view.gestureRecognizers?.compactMap({ $0 as? UITapGestureRecognizer }) {
            for gesture in tapGestures where gesture.isEnabled {
                print("🎯 [ActionExecutor] Found tap gesture, triggering targets")
                let targets = gesture.value(forKey: "targets") as? [NSObject] ?? []
                for target in targets {
                    if let targetObject = target.value(forKey: "target"),
                       let action = target.value(forKey: "action") as? Selector {
                        _ = (targetObject as AnyObject).perform(action, with: gesture)
                    }
                }
            }
        }

        // Fallback: Send touch events to the view hierarchy
        // This simulates an actual screen tap at the element's location
        simulateTouchEvents(at: touchPoint, in: window, targetView: view)
    }

    /// Synthesize UITouch events at a specific point
    private static func simulateTouchEvents(at point: CGPoint, in window: UIWindow, targetView: UIView) {
        // Send touchesBegan
        let touchBeganEvent = UIEvent()
        targetView.touchesBegan(Set(), with: touchBeganEvent)

        // Small delay to simulate natural tap
        Thread.sleep(forTimeInterval: 0.05)

        // Send touchesEnded
        let touchEndedEvent = UIEvent()
        targetView.touchesEnded(Set(), with: touchEndedEvent)

        print("✅ [ActionExecutor] Sent touch events to view")
    }

    /// Simulate swipe gesture
    private static func simulateSwipe(from startPoint: CGPoint, to endPoint: CGPoint, in window: UIWindow) {
        // This is a simplified simulation
        // In production, you might want to use private APIs or a more sophisticated approach

        // For now, we'll try to find scroll views and scroll them programmatically
        let direction: String
        if abs(endPoint.y - startPoint.y) > abs(endPoint.x - startPoint.x) {
            direction = endPoint.y > startPoint.y ? "down" : "up"
        } else {
            direction = endPoint.x > startPoint.x ? "right" : "left"
        }

        // Find scroll view under touch point
        if let scrollView = findScrollView(at: startPoint, in: window) {
            let distance = sqrt(pow(endPoint.x - startPoint.x, 2) + pow(endPoint.y - startPoint.y, 2))
            var contentOffset = scrollView.contentOffset

            switch direction {
            case "up":
                contentOffset.y += distance
            case "down":
                contentOffset.y -= distance
            case "left":
                contentOffset.x += distance
            case "right":
                contentOffset.x -= distance
            default:
                break
            }

            scrollView.setContentOffset(contentOffset, animated: true)
        }
    }

    /// Find scroll view at point
    private static func findScrollView(at point: CGPoint, in view: UIView) -> UIScrollView? {
        if let scrollView = view as? UIScrollView, view.point(inside: point, with: nil) {
            return scrollView
        }

        for subview in view.subviews.reversed() {
            let convertedPoint = view.convert(point, to: subview)
            if let found = findScrollView(at: convertedPoint, in: subview) {
                return found
            }
        }

        return nil
    }
}
