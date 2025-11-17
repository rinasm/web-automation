import UIKit

/// Utility for inspecting UIView hierarchy and extracting element information
class ViewHierarchyInspector {

    /// Get element info for a given view
    /// Uses NATIVE iOS recursive hierarchy traversal - NO HTTP calls!
    static func getElementInfo(for view: UIView) -> ElementInfo {
        print("📍 [SDK] Capturing element at view: \(String(describing: type(of: view)))")

        // Build ancestor chain from this view to root (for backwards compatibility)
        var hierarchy: [ElementInfo.HierarchyElement] = []
        var currentView: UIView? = view
        var level = 0

        while let v = currentView, level < 50 {
            let frame = v.frame
            let hierarchyElement = ElementInfo.HierarchyElement(
                className: String(describing: type(of: v)),
                accessibilityIdentifier: v.accessibilityIdentifier,
                bounds: ElementInfo.Bounds(
                    x: Double(frame.origin.x),
                    y: Double(frame.origin.y),
                    width: Double(frame.size.width),
                    height: Double(frame.size.height)
                ),
                isInteractive: v.isUserInteractionEnabled
            )

            hierarchy.append(hierarchyElement)
            currentView = v.superview
            level += 1
        }

        // NATIVE APPROACH: Build complete hierarchy from window root
        // This is INSTANT - no network calls!
        print("🌳 [SDK] Building complete page hierarchy using native iOS APIs...")
        let startTime = Date()

        // Find the root window
        let rootWindow = findRootWindow(from: view)
        let completeHierarchy = buildCompleteHierarchy(from: rootWindow, depth: 0)

        let elapsed = Date().timeIntervalSince(startTime)
        print("✅ [SDK] Built complete hierarchy (\(completeHierarchy.count) characters) in \(String(format: "%.3f", elapsed))s")

        // Return element info with COMPLETE page hierarchy
        return ElementInfo(view: view, xpath: nil, hierarchy: hierarchy, viewHierarchyDebugDescription: completeHierarchy)
    }

    /// Find the root window from a given view
    private static func findRootWindow(from view: UIView) -> UIView {
        var current: UIView = view
        while let superview = current.superview {
            current = superview
        }
        return current
    }

    /// Build complete view hierarchy string recursively
    /// This captures BOTH UIKit hierarchy AND accessibility elements (including SwiftUI!)
    private static func buildCompleteHierarchy(from view: UIView, depth: Int) -> String {
        var result = ""
        let indent = String(repeating: "  ", count: depth)

        // Get view details
        let className = String(describing: type(of: view))
        let frame = view.frame
        let memoryAddr = String(format: "%p", unsafeBitCast(view, to: Int.self))

        // Build element line with all properties
        result += "\(indent)<\(className): \(memoryAddr)>; "
        result += "frame = (\(frame.origin.x) \(frame.origin.y); \(frame.size.width) \(frame.size.height)); "

        // Add accessibility properties
        if let accessibilityId = view.accessibilityIdentifier, !accessibilityId.isEmpty {
            result += "accessibilityIdentifier = '\(accessibilityId)'; "
        }
        if let accessibilityLabel = view.accessibilityLabel, !accessibilityLabel.isEmpty {
            result += "accessibilityLabel = '\(accessibilityLabel)'; "
        }

        // Add accessibility traits
        let traits = view.accessibilityTraits
        var traitsArray: [String] = []
        if traits.contains(.button) { traitsArray.append("button") }
        if traits.contains(.staticText) { traitsArray.append("text") }
        if traits.contains(.image) { traitsArray.append("image") }
        if traits.contains(.searchField) { traitsArray.append("searchField") }
        if traits.contains(.link) { traitsArray.append("link") }
        if !traitsArray.isEmpty {
            result += "accessibilityTraits = [\(traitsArray.joined(separator: ", "))]; "
        }

        // Add interactive state
        if view.isUserInteractionEnabled {
            result += "userInteractionEnabled = YES; "
        }
        if view.isHidden {
            result += "hidden = YES; "
        }
        result += "alpha = \(view.alpha); "

        result += "\n"

        // ALSO enumerate accessibility elements (catches SwiftUI buttons!)
        // This is crucial for SwiftUI where button text is in accessibility tree
        if let accessibilityElements = view.accessibilityElements as? [Any] {
            for (index, element) in accessibilityElements.enumerated() {
                if let accView = element as? UIView {
                    let accFrame = accView.frame
                    let accLabel = accView.accessibilityLabel ?? ""
                    let accId = accView.accessibilityIdentifier ?? ""
                    let accTraits = accView.accessibilityTraits

                    var accTraitsStr = ""
                    if accTraits.contains(.button) { accTraitsStr += "button " }
                    if accTraits.contains(.staticText) { accTraitsStr += "text " }

                    result += "\(indent)  [ACCESSIBILITY-ELEMENT-\(index)] <\(String(describing: type(of: accView)))>; "
                    result += "frame = (\(accFrame.origin.x) \(accFrame.origin.y); \(accFrame.width) \(accFrame.height)); "
                    if !accLabel.isEmpty {
                        result += "accessibilityLabel = '\(accLabel)'; "
                    }
                    if !accId.isEmpty {
                        result += "accessibilityIdentifier = '\(accId)'; "
                    }
                    if !accTraitsStr.isEmpty {
                        result += "accessibilityTraits = [\(accTraitsStr.trimmingCharacters(in: .whitespaces))]; "
                    }
                    result += "\n"
                }
            }
        }

        // Recursively add all subviews
        for subview in view.subviews {
            result += buildCompleteHierarchy(from: subview, depth: depth + 1)
        }

        return result
    }

    /// Generate XPath-like selector for a view
    /// Similar to web XPath but adapted for iOS view hierarchy
    static func generateXPath(for view: UIView) -> String {
        var components: [String] = []
        var currentView: UIView? = view

        while let view = currentView {
            let className = String(describing: type(of: view))

            // Try to find unique identifier
            if let accessibilityId = view.accessibilityIdentifier, !accessibilityId.isEmpty {
                // Use accessibility ID as unique identifier
                components.insert("//\(className)[@accessibilityIdentifier='\(accessibilityId)']", at: 0)
                break // Accessibility ID should be unique, stop here
            }

            // Calculate index among siblings of same class
            let siblings = view.superview?.subviews.filter { type(of: $0) == type(of: view) } ?? []
            let index = siblings.firstIndex(where: { $0 === view }) ?? 0

            // Add component with index
            components.insert("\(className)[\(index)]", at: 0)

            // Move to parent
            currentView = view.superview
        }

        return "//" + components.joined(separator: "/")
    }

    /// Get all interactive elements in the view hierarchy
    static func getInteractiveElements(in window: UIWindow) -> [ElementInfo] {
        var elements: [ElementInfo] = []
        traverseViewHierarchy(view: window, elements: &elements)
        return elements
    }

    private static func traverseViewHierarchy(view: UIView, elements: inout [ElementInfo]) {
        // Only include interactive elements
        if view.isUserInteractionEnabled && !view.isHidden && view.alpha > 0.01 {
            // Check if it's an interactive element
            if view is UIButton ||
               view is UITextField ||
               view is UITextView ||
               view is UISwitch ||
               view is UISlider ||
               view is UISegmentedControl ||
               view.gestureRecognizers?.isEmpty == false {
                elements.append(getElementInfo(for: view))
            }
        }

        // Recurse into subviews
        for subview in view.subviews {
            traverseViewHierarchy(view: subview, elements: &elements)
        }
    }

    /// Get snapshot of current view hierarchy (for debugging)
    static func getViewHierarchySnapshot(window: UIWindow) -> String {
        var snapshot = ""
        printViewHierarchy(view: window, level: 0, snapshot: &snapshot)
        return snapshot
    }

    private static func printViewHierarchy(view: UIView, level: Int, snapshot: inout String) {
        let indent = String(repeating: "  ", count: level)
        let className = String(describing: type(of: view))
        let frame = view.frame
        let accessibility = view.accessibilityIdentifier ?? "nil"

        snapshot += "\(indent)\(className) frame=\(frame) id=\(accessibility)\n"

        for subview in view.subviews {
            printViewHierarchy(view: subview, level: level + 1, snapshot: &snapshot)
        }
    }
}
