import UIKit

/// Executes UI actions programmatically
/// Finds elements and simulates taps, typing, and swipes
class ActionExecutor {

    // MARK: - XPath Support

    /// Represents a component in an XPath expression
    struct XPathComponent {
        let viewType: String      // e.g., "UIButton", "UIView", "_UIHostingView"
        let index: Int?           // e.g., 0, 1, 2 from [0], [1], [2]
        let isDescendant: Bool    // true if preceded by //, false if preceded by /
    }

    /// Parse XPath string into components
    /// Example: "//UIWindow[0]/UIView[1]/Button[2]" -> [(UIWindow, 0, true), (UIView, 1, false), (Button, 2, false)]
    private static func parseXPath(_ xpath: String) -> [XPathComponent]? {
        print("🔍 [XPath] Parsing xpath: \(xpath)")

        // Remove leading // if present
        var path = xpath
        var isDescendantStart = false

        if path.hasPrefix("//") {
            path = String(path.dropFirst(2))
            isDescendantStart = true
        } else if path.hasPrefix("/") {
            path = String(path.dropFirst(1))
        }

        // Split by / but keep track of whether each part was preceded by //
        var components: [XPathComponent] = []
        let parts = path.split(separator: "/", omittingEmptySubsequences: false)

        for (idx, part) in parts.enumerated() {
            if part.isEmpty {
                // Empty part means we had // (descendant)
                continue
            }

            let partStr = String(part)

            // Check if previous part was empty (meaning this follows //)
            let isDescendant = (idx == 0 && isDescendantStart) || (idx > 0 && parts[idx - 1].isEmpty)

            // Extract type and index from "UIButton[2]"
            if let bracketStart = partStr.firstIndex(of: "["),
               let bracketEnd = partStr.firstIndex(of: "]") {
                let viewType = String(partStr[..<bracketStart])
                let indexStr = String(partStr[partStr.index(after: bracketStart)..<bracketEnd])

                if let index = Int(indexStr) {
                    components.append(XPathComponent(viewType: viewType, index: index, isDescendant: isDescendant))
                } else {
                    print("❌ [XPath] Failed to parse index: \(indexStr)")
                    return nil
                }
            } else {
                // No index specified
                components.append(XPathComponent(viewType: partStr, index: nil, isDescendant: isDescendant))
            }
        }

        print("✅ [XPath] Parsed \(components.count) components")
        for (idx, comp) in components.enumerated() {
            print("  [\(idx)] \(comp.isDescendant ? "//" : "/")\(comp.viewType)\(comp.index.map { "[\($0)]" } ?? "")")
        }

        return components
    }

    /// Find element by XPath with strict traversal
    private static func findElementByXPath(_ xpath: String, in window: UIWindow) -> UIView? {
        print("🎯 [XPath] Finding element by xpath: \(xpath)")

        guard let components = parseXPath(xpath) else {
            print("❌ [XPath] Failed to parse xpath")
            return nil
        }

        // Start traversal from window
        return traverseXPath(components: components, currentIndex: 0, currentView: window, depth: 0)
    }

    /// Recursively traverse view hierarchy following XPath components
    private static func traverseXPath(components: [XPathComponent], currentIndex: Int, currentView: UIView, depth: Int) -> UIView? {
        let indent = String(repeating: "  ", count: depth)

        // Base case: we've matched all components
        if currentIndex >= components.count {
            print("\(indent)✅ [XPath] Matched all components, found element: \(type(of: currentView))")
            return currentView
        }

        let component = components[currentIndex]
        print("\(indent)🔍 [XPath] Looking for: \(component.viewType)\(component.index.map { "[\($0)]" } ?? "") (descendant: \(component.isDescendant))")

        // CRITICAL FIX: Check if current view matches the component we're looking for
        // This handles the case where XPath starts with the root element (e.g., //UIWindow[0]/...)
        if viewTypeMatches(view: currentView, expectedType: component.viewType) {
            print("\(indent)✓ [XPath] Current view matches! Type: \(type(of: currentView))")
            // If an index is specified, we need to find multiple matches and select by index
            // If no index or index is 0 and we match, continue to next component
            if component.index == nil || component.index == 0 {
                print("\(indent)→ [XPath] Using current view, moving to next component")
                return traverseXPath(components: components, currentIndex: currentIndex + 1, currentView: currentView, depth: depth + 1)
            }
            // If index > 0, we need to find sibling matches
        }

        // Collect matching views
        var matchingViews: [UIView] = []

        if component.isDescendant {
            // Descendant axis: search entire subtree
            collectMatchingViews(in: currentView, viewType: component.viewType, into: &matchingViews, depth: depth + 1)
        } else {
            // Child axis: search only direct children
            for subview in currentView.subviews {
                if viewTypeMatches(view: subview, expectedType: component.viewType) {
                    matchingViews.append(subview)
                    print("\(indent)  ✓ Found child: \(type(of: subview))")
                }
            }
        }

        print("\(indent)📊 [XPath] Found \(matchingViews.count) matching views")

        // If index is specified, select that specific occurrence
        if let index = component.index {
            guard index < matchingViews.count else {
                print("\(indent)❌ [XPath] Index \(index) out of bounds (only \(matchingViews.count) matches)")
                return nil
            }

            let selectedView = matchingViews[index]
            print("\(indent)✓ [XPath] Selected view at index \(index): \(type(of: selectedView))")

            // Continue to next component
            return traverseXPath(components: components, currentIndex: currentIndex + 1, currentView: selectedView, depth: depth + 1)
        } else {
            // No index specified, try each matching view
            for matchingView in matchingViews {
                if let result = traverseXPath(components: components, currentIndex: currentIndex + 1, currentView: matchingView, depth: depth + 1) {
                    return result
                }
            }

            print("\(indent)❌ [XPath] No matching path found")
            return nil
        }
    }

    /// Collect all views matching the specified type in the view hierarchy
    private static func collectMatchingViews(in view: UIView, viewType: String, into matches: inout [UIView], depth: Int) {
        let indent = String(repeating: "  ", count: depth)

        for subview in view.subviews {
            let actualType = String(describing: type(of: subview))

            if viewTypeMatches(view: subview, expectedType: viewType) {
                matches.append(subview)
                print("\(indent)✓ Found descendant: \(actualType)")
            }

            // Recursively search subviews
            collectMatchingViews(in: subview, viewType: viewType, into: &matches, depth: depth + 1)
        }
    }

    /// Check if a view's type matches the expected type string
    /// Handles generic types like "_UIHostingView<ModifiedContent<...>>"
    private static func viewTypeMatches(view: UIView, expectedType: String) -> Bool {
        let actualType = String(describing: type(of: view))

        // Exact match
        if actualType == expectedType {
            return true
        }

        // Handle generic types: extract base type before <
        // e.g., "_UIHostingView<ModifiedContent<...>>" matches "_UIHostingView"
        if let genericStart = actualType.firstIndex(of: "<") {
            let baseType = String(actualType[..<genericStart])
            if baseType == expectedType {
                return true
            }
        }

        // Also check if expected type has generics and matches base
        if let genericStart = expectedType.firstIndex(of: "<") {
            let expectedBase = String(expectedType[..<genericStart])
            if actualType.hasPrefix(expectedBase) {
                return true
            }
        }

        return false
    }

    // MARK: - Element Finding

    /// Find element by selector (accessibilityId or xpath) with retry logic
    /// Returns nil if not found. Call getAvailableIdentifiers() to get diagnostic info.
    static func findElement(by selector: String, in window: UIWindow, actionId: String? = nil) -> UIView? {
        print("🎯 [ActionExecutor] Finding element with selector: \(selector)")

        // Log subprocess step 1: Finding element
        if let actionId = actionId {
            SnapTest.shared.sendExecutionLog(
                actionId: actionId,
                step: "find_element",
                message: "Searching for element with selector: \(selector)"
            )
        }

        // Store the window for diagnostic purposes
        lastSearchedWindow = window

        // Detect selector type
        let isXPath = selector.hasPrefix("/")

        if isXPath {
            print("📍 [ActionExecutor] Detected XPath selector")

            // For XPath, use retry logic but call XPath finder
            let maxRetries = 10
            let retryDelay: TimeInterval = 0.2

            for attempt in 0..<maxRetries {
                // Force UI layout refresh
                window.setNeedsLayout()
                window.layoutIfNeeded()
                Thread.sleep(forTimeInterval: 0.05)

                print("🔄 [ActionExecutor] XPath search attempt \(attempt + 1)")

                if let element = findElementByXPath(selector, in: window) {
                    let elementType = String(describing: type(of: element))
                    print("✅ [ActionExecutor] Found element by XPath: \(elementType)")
                    print("   - Frame: \(element.frame)")
                    print("   - Is UIControl: \(element is UIControl)")
                    print("   - User interaction enabled: \(element.isUserInteractionEnabled)")

                    // Log subprocess step: Element found with bounds
                    if let actionId = actionId {
                        SnapTest.shared.sendExecutionLog(
                            actionId: actionId,
                            step: "element_found",
                            message: "Element found by XPath",
                            elementType: elementType,
                            bounds: element.frame
                        )
                    }

                    // VISUAL DEBUG: Flash the found element GREEN using window-level overlay
                    let frameInWindow = element.convert(element.bounds, to: window)
                    let greenOverlay = UIView(frame: frameInWindow)
                    greenOverlay.backgroundColor = UIColor.green.withAlphaComponent(0.7)
                    greenOverlay.isUserInteractionEnabled = false
                    greenOverlay.tag = 99998
                    window.addSubview(greenOverlay)
                    window.bringSubviewToFront(greenOverlay)
                    print("🟢 [ActionExecutor] Element highlighted GREEN with window-level overlay")

                    // Wait 2 seconds so user can see the highlight
                    Thread.sleep(forTimeInterval: 2.0)

                    // CRITICAL FIX: If XPath found a container view, search for actual button inside
                    var targetElement = element
                    if !(element is UIControl) && element.isUserInteractionEnabled {
                        print("🔍 [ActionExecutor] XPath found container, searching for UIButton inside...")
                        if let button = findFirstButton(in: element) {
                            print("✅ [ActionExecutor] Found UIButton inside container: \(type(of: button))")

                            // Highlight the actual button in BLUE at window level
                            let buttonFrameInWindow = button.convert(button.bounds, to: window)
                            let blueOverlay = UIView(frame: buttonFrameInWindow)
                            blueOverlay.backgroundColor = UIColor.blue.withAlphaComponent(0.7)
                            blueOverlay.isUserInteractionEnabled = false
                            blueOverlay.tag = 99997
                            window.addSubview(blueOverlay)
                            window.bringSubviewToFront(blueOverlay)
                            print("🔵 [ActionExecutor] Actual button highlighted BLUE with window-level overlay")
                            Thread.sleep(forTimeInterval: 1.0)
                            blueOverlay.removeFromSuperview()

                            targetElement = button
                        }
                    }

                    // Remove green overlay
                    greenOverlay.removeFromSuperview()

                    return targetElement
                }

                if attempt < maxRetries - 1 {
                    print("⏳ [ActionExecutor] XPath element not found (attempt \(attempt + 1)/\(maxRetries)), retrying...")
                    Thread.sleep(forTimeInterval: retryDelay)
                }
            }

            print("❌ [ActionExecutor] Element not found by XPath after \(maxRetries) retries: \(selector)")
            print("📋 [ActionExecutor] Dumping actual view hierarchy for debugging:")
            dumpViewHierarchyWithTypes(in: window, depth: 0, maxDepth: 5)
            return nil

        } else {
            print("📍 [ActionExecutor] Detected accessibilityIdentifier selector")

            // On first attempt, dump all available accessibilityIds to help debug
            print("📋 [ActionExecutor] Available accessibilityIds in view hierarchy:")
            dumpAllAccessibilityIds(in: window)

            // Retry configuration
            let maxRetries = 10
            let retryDelay: TimeInterval = 0.2

            for attempt in 0..<maxRetries {
                // CRITICAL FIX: Force UI layout refresh before each search attempt
                // This ensures SwiftUI sheets and other lazy-rendered UI elements are fully rendered
                window.setNeedsLayout()
                window.layoutIfNeeded()
                Thread.sleep(forTimeInterval: 0.05)

                print("🔄 [ActionExecutor] Forced UI layout refresh on attempt \(attempt + 1)")

                // Try to find by accessibilityIdentifier
                if let element = findElementByAccessibilityId(selector, in: window) {
                    let elementType = String(describing: type(of: element))
                    if attempt > 0 {
                        print("✅ [ActionExecutor] Found element on retry #\(attempt): \(selector)")
                    } else {
                        print("✅ [ActionExecutor] Found element by accessibilityId: \(selector)")
                    }

                    // Log subprocess step: Element found with bounds
                    if let actionId = actionId {
                        SnapTest.shared.sendExecutionLog(
                            actionId: actionId,
                            step: "element_found",
                            message: "Element found by accessibilityId: \(selector)",
                            elementType: elementType,
                            bounds: element.frame
                        )
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

            print("❌ [ActionExecutor] Element not found by accessibilityId after \(maxRetries) retries: \(selector)")
            print("📋 [ActionExecutor] Final dump of available accessibilityIds:")
            dumpAllAccessibilityIds(in: window)
            return nil
        }
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

    /// Dump view hierarchy with type names (for XPath debugging)
    private static func dumpViewHierarchyWithTypes(in view: UIView, depth: Int = 0, maxDepth: Int = 10) {
        guard depth < maxDepth else { return }

        let indent = String(repeating: "  ", count: depth)
        let viewType = String(describing: type(of: view))
        let subviewCount = view.subviews.count

        print("\(indent)[\(depth)] \(viewType) (\(subviewCount) children)")

        for (index, subview) in view.subviews.enumerated() {
            let subviewType = String(describing: type(of: subview))
            print("\(indent)  [\(index)] -> \(subviewType)")
            dumpViewHierarchyWithTypes(in: subview, depth: depth + 1, maxDepth: maxDepth)
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
    static func executeTap(on element: UIView, actionId: String? = nil) -> (success: Bool, error: String?) {
        // CRITICAL: Log entry to function first
        NSLog("🚀 [ActionExecutor] ENTERED executeTap - Element type: \(type(of: element))")

        if let actionId = actionId {
            SnapTest.shared.sendExecutionLog(
                actionId: actionId,
                step: "executeTap_start",
                message: "Starting tap execution",
                elementType: String(describing: type(of: element))
            )
        }

        print("👆 [ActionExecutor] Executing tap on: \(type(of: element))")

        // Log subprocess step: Calculate center point
        NSLog("🧮 [ActionExecutor] Calculating center point...")
        // CRITICAL FIX: Convert bounds center to window coordinates (absolute position)
        // bounds gives RELATIVE coordinates (always from 0,0), we need ABSOLUTE screen position
        let boundsCenter = CGPoint(x: element.bounds.midX, y: element.bounds.midY)
        let viewCenter = element.convert(boundsCenter, to: element.window)
        NSLog("🧮 [ActionExecutor] Center calculated (absolute): (\(viewCenter.x), \(viewCenter.y))")

        if let actionId = actionId {
            NSLog("📤 [ActionExecutor] Sending calculate_center log...")
            SnapTest.shared.sendExecutionLog(
                actionId: actionId,
                step: "calculate_center",
                message: "Calculated tap center point from bounds",
                bounds: element.frame,
                centerPoint: viewCenter
            )
            NSLog("✅ [ActionExecutor] calculate_center log sent")
        }

        guard element.isUserInteractionEnabled else {
            print("❌ [ActionExecutor] Element is not user interaction enabled")
            if let actionId = actionId {
                SnapTest.shared.sendExecutionLog(
                    actionId: actionId,
                    step: "tap_failed",
                    message: "Element is not user interaction enabled"
                )
            }
            return (false, "Element is not user interaction enabled")
        }

        guard !element.isHidden else {
            print("❌ [ActionExecutor] Element is hidden")
            if let actionId = actionId {
                SnapTest.shared.sendExecutionLog(
                    actionId: actionId,
                    step: "tap_failed",
                    message: "Element is hidden"
                )
            }
            return (false, "Element is hidden")
        }

        // Check if element is a UIControl and if it's enabled
        if let control = element as? UIControl {
            if !control.isEnabled {
                print("❌ [ActionExecutor] UIControl is disabled")
                if let actionId = actionId {
                    SnapTest.shared.sendExecutionLog(
                        actionId: actionId,
                        step: "tap_failed",
                        message: "UIControl is disabled"
                    )
                }
                return (false, "Element is disabled")
            }
        }

        // NOTE: This function is now called via DispatchQueue.main.sync from SnapTest.swift
        // to ensure UIKit thread safety

        var tapSucceeded = false
        var tapStrategyUsed = ""

        // PRIORITY 1: If this is a UIButton, call sendActions directly (most reliable)
        if let button = element as? UIButton {
            tapStrategyUsed = "Priority 1: UIButton.sendActions"
            print("🔘 [ActionExecutor] Found UIButton, using sendActions")
            if let actionId = actionId {
                SnapTest.shared.sendExecutionLog(
                    actionId: actionId,
                    step: "execute_tap",
                    message: "Executing tap using sendActions (UIButton)",
                    tapStrategy: tapStrategyUsed
                )
            }
            button.sendActions(for: .touchUpInside)
            tapSucceeded = true
        }
        // PRIORITY 2: If this is another UIControl, use sendActions
        else if let control = element as? UIControl {
            tapStrategyUsed = "Priority 2: UIControl.sendActions"
            print("🔘 [ActionExecutor] Found UIControl, using sendActions")
            if let actionId = actionId {
                SnapTest.shared.sendExecutionLog(
                    actionId: actionId,
                    step: "execute_tap",
                    message: "Executing tap using sendActions (UIControl)",
                    tapStrategy: tapStrategyUsed
                )
            }
            control.sendActions(for: .touchUpInside)
            tapSucceeded = true
        }
        // PRIORITY 3: For container UIViews with gesture recognizers (e.g., SwiftUI cards)
        else if let tapGestures = element.gestureRecognizers?.compactMap({ $0 as? UITapGestureRecognizer }),
                !tapGestures.isEmpty,
                tapGestures.contains(where: { $0.isEnabled }) {
            tapStrategyUsed = "Priority 3: Container tap gesture recognizer"
            print("🎯 [ActionExecutor] Container has tap gesture recognizer, using it instead of child button")
            if let actionId = actionId {
                SnapTest.shared.sendExecutionLog(
                    actionId: actionId,
                    step: "execute_tap",
                    message: "Container has tap gesture recognizer",
                    elementType: String(describing: type(of: element)),
                    tapStrategy: tapStrategyUsed
                )
            }

            // Trigger gesture recognizer targets directly
            var foundGesture = false
            for gesture in tapGestures where gesture.isEnabled {
                print("🎯 [ActionExecutor] Triggering tap gesture targets")
                let targets = gesture.value(forKey: "targets") as? [NSObject] ?? []
                for target in targets {
                    if let targetObject = target.value(forKey: "target"),
                       let action = target.value(forKey: "action") as? Selector {
                        _ = (targetObject as AnyObject).perform(action, with: gesture)
                        foundGesture = true
                        print("✅ [ActionExecutor] Triggered gesture target successfully")
                    }
                }
            }
            tapSucceeded = foundGesture
        }
        // PRIORITY 4: For container UIViews without gestures, search for UIButton/UIControl inside
        else if let tappableChild = findFirstButton(in: element) {
            tapStrategyUsed = "Priority 4: Tap child button in container"
            print("🔍 [ActionExecutor] Found tappable child in container: \(type(of: tappableChild))")
            if let actionId = actionId {
                SnapTest.shared.sendExecutionLog(
                    actionId: actionId,
                    step: "execute_tap",
                    message: "Found tappable child element inside container",
                    elementType: String(describing: type(of: tappableChild)),
                    tapStrategy: tapStrategyUsed
                )
            }

            // Tap the child element
            if let button = tappableChild as? UIButton {
                button.sendActions(for: .touchUpInside)
            } else if let control = tappableChild as? UIControl {
                control.sendActions(for: .touchUpInside)
            }
            tapSucceeded = true
        }
        // PRIORITY 5: Try accessibility activation
        else if element.accessibilityActivate() {
            tapStrategyUsed = "Priority 5: accessibilityActivate"
            print("✅ [ActionExecutor] Tapped element via accessibility activation")
            if let actionId = actionId {
                SnapTest.shared.sendExecutionLog(
                    actionId: actionId,
                    step: "execute_tap",
                    message: "Executing tap using accessibilityActivate",
                    elementType: String(describing: type(of: element)),
                    tapStrategy: tapStrategyUsed
                )
            }
            tapSucceeded = true
        }
        // PRIORITY 6: Fallback - search for gesture recognizers (avoid broken simulateTouchEvents)
        else {
            tapStrategyUsed = "Priority 6: Gesture recognizer targets"
            print("🎯 [ActionExecutor] Searching for tap gesture recognizers")
            if let actionId = actionId {
                SnapTest.shared.sendExecutionLog(
                    actionId: actionId,
                    step: "execute_tap",
                    message: "Attempting to trigger gesture recognizers",
                    elementType: String(describing: type(of: element)),
                    tapStrategy: tapStrategyUsed
                )
            }

            // Only use the gesture recognizer part, NOT simulateTouchEvents
            if let tapGestures = element.gestureRecognizers?.compactMap({ $0 as? UITapGestureRecognizer }) {
                var foundGesture = false
                for gesture in tapGestures where gesture.isEnabled {
                    print("🎯 [ActionExecutor] Found tap gesture, triggering targets")
                    let targets = gesture.value(forKey: "targets") as? [NSObject] ?? []
                    for target in targets {
                        if let targetObject = target.value(forKey: "target"),
                           let action = target.value(forKey: "action") as? Selector {
                            _ = (targetObject as AnyObject).perform(action, with: gesture)
                            foundGesture = true
                        }
                    }
                }
                tapSucceeded = foundGesture
            }

            if !tapSucceeded {
                print("❌ [ActionExecutor] No tap method worked for element")
                return (false, "Element is not tappable - no UIControl, button, or gesture recognizer found")
            }
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

        // Log final success
        if let actionId = actionId {
            SnapTest.shared.sendExecutionLog(
                actionId: actionId,
                step: "tap_completed",
                message: "Tap completed successfully using: \(tapStrategyUsed)",
                tapStrategy: tapStrategyUsed
            )
        }

        return (true, nil)
    }

    /// Find first UIButton or UIControl in view hierarchy (for XPath container workaround)
    private static func findFirstButton(in view: UIView) -> UIView? {
        // Check if current view is a UIButton or UIControl
        if view is UIButton {
            print("  → Found UIButton: \(type(of: view))")
            return view
        }
        if view is UIControl, !(view is UITextField), !(view is UITextView) {
            print("  → Found UIControl: \(type(of: view))")
            return view
        }

        // Recursively search subviews
        for subview in view.subviews {
            if let button = findFirstButton(in: subview) {
                return button
            }
        }

        return nil
    }

    /// Execute type action on text field
    static func executeType(on element: UIView, text: String) -> (success: Bool, error: String?) {
        print("⌨️ [ActionExecutor] Executing type with text: '\(text)'")

        // NOTE: This function is now called via DispatchQueue.main.sync from SnapTest.swift
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

        // NOTE: This function is now called via DispatchQueue.main.sync from SnapTest.swift
        self.simulateSwipe(from: startPoint, to: endPoint, in: window)
        print("✅ [ActionExecutor] Swipe executed successfully")

        return (true, nil)
    }

    // MARK: - Private Helpers

    // NOTE: simulateTouchOnView() and simulateTouchEvents() removed
    // These methods created invalid UIEvent() objects which crashed iOS
    // Replaced with findFirstButton() to find tappable children in container views

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
