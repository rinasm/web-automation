import UIKit

/// Utility for inspecting UIView hierarchy and extracting element information
class ViewHierarchyInspector {

    /// Get element info for a given view
    /// Walks up the view hierarchy to find a parent with accessibilityIdentifier if the hit view doesn't have one
    static func getElementInfo(for view: UIView) -> ElementInfo {
        // Try to find a view with accessibilityIdentifier by walking up the hierarchy
        let viewWithId = findViewWithAccessibilityId(startingFrom: view) ?? view

        // IMPORTANT: Only generate xpath if NO accessibilityIdentifier was found
        // This forces tests to use accessibilityId (much faster and more reliable!)
        let xpath: String?
        if viewWithId.accessibilityIdentifier != nil && !viewWithId.accessibilityIdentifier!.isEmpty {
            xpath = nil // Don't generate xpath when we have accessibilityId
            print("✅ [SDK] Using accessibilityId: \(viewWithId.accessibilityIdentifier!) (no xpath)")
        } else {
            xpath = generateXPath(for: viewWithId)
            print("⚠️ [SDK] No accessibilityId found, using xpath: \(xpath ?? "nil")")
        }

        return ElementInfo(view: viewWithId, xpath: xpath)
    }

    /// Walk up the view hierarchy to find a view with an accessibilityIdentifier
    /// This is crucial for SwiftUI where taps often hit child views, not the parent with the identifier
    private static func findViewWithAccessibilityId(startingFrom view: UIView) -> UIView? {
        var currentView: UIView? = view

        print("🔍 [SDK DEBUG] Starting view hierarchy walk-up from: \(String(describing: type(of: view)))")

        // Walk up maximum 5 levels to avoid going too far up the hierarchy
        for level in 0..<5 {
            guard let view = currentView else {
                print("🔍 [SDK DEBUG] Level \(level): currentView is nil, stopping")
                break
            }

            let className = String(describing: type(of: view))
            let accessibilityId = view.accessibilityIdentifier

            print("🔍 [SDK DEBUG] Level \(level): \(className), accessibilityId: \(accessibilityId ?? "nil")")

            if let accessibilityId = view.accessibilityIdentifier, !accessibilityId.isEmpty {
                print("✅ [SDK DEBUG] Found accessibilityId '\(accessibilityId)' at level \(level) on \(className)")
                return view
            }

            currentView = view.superview
        }

        print("❌ [SDK DEBUG] No accessibilityId found after walking up 5 levels")
        return nil
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
