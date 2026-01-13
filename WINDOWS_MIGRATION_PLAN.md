# Windows Migration Plan: SDK-First Architecture

## Executive Summary

**Goal**: Migrate from Mac-dependent (Appium/XCTest/WDA) architecture to cross-platform SDK-based architecture that supports Windows → iPhone connectivity for testing Native and Hybrid iOS apps.

**Current State**: Desktop app works on Mac only, uses Appium/WebDriverAgent for iOS automation
**Target State**: Desktop app works on Windows/Mac, uses pure SDK for iOS automation
**Timeline**: 2-3 weeks
**Effort**: ~80-120 hours
**Risk Level**: Low-Medium

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Target Architecture](#target-architecture)
3. [Migration Phases](#migration-phases)
4. [Technical Implementation Details](#technical-implementation-details)
5. [Timeline & Resource Allocation](#timeline--resource-allocation)
6. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)
9. [Success Criteria](#success-criteria)

---

## Current Architecture Analysis

### Component Dependency Map

```
┌─────────────────────────────────────────────────────────────┐
│                     CURRENT SYSTEM (Mac Only)                │
└─────────────────────────────────────────────────────────────┘

Mac Desktop (Electron)
├── WebSocket Server (ws, port 8080) ✅ Cross-platform
├── Appium Server Manager ❌ Mac-only (requires Xcode)
│   ├── WebDriverAgent ❌ Mac-only (requires XCTest)
│   └── appium-xcuitest-driver ❌ Mac-only
├── Bonjour Service ✅ Cross-platform (needs testing)
└── IPC Handlers
    ├── SDK Executor (preferred) ✅ Cross-platform
    └── Appium Executor (fallback) ❌ Mac-only

iPhone (iOS App with SnapTest SDK)
├── SnapTest SDK ✅ Cross-platform
│   ├── TouchEventCapture ✅ Works
│   ├── ActionExecutor (Native only) ✅ Works
│   ├── NetworkMonitor ✅ Works
│   └── WebSocketManager ✅ Works
└── Native UI ✅ Works

Current Blockers for Windows:
1. Appium requires Xcode (macOS exclusive)
2. WebDriverAgent requires XCTest (macOS exclusive)
3. idevice tools for USB detection (Mac-oriented)
4. Fallback logic defaults to Appium for some features
```

### Feature Support Matrix (Current)

| Feature                        | SDK | Appium | Used In Codebase?      | Windows Compatible? |
|--------------------------------|-----|--------|------------------------|---------------------|
| Native element tap             | ✅   | ✅      | ✅ mobileActionExecutor | ✅ Yes (via SDK)     |
| Native element type            | ✅   | ✅      | ✅ mobileActionExecutor | ✅ Yes (via SDK)     |
| Native element swipe           | ✅   | ✅      | ✅ mobileActionExecutor | ✅ Yes (via SDK)     |
| WebView/Hybrid automation      | ❌   | ✅      | ⚠️ If using webviews    | ❌ No               |
| Screenshot capture             | ❌   | ✅      | ✅ Line 335             | ❌ No               |
| Safari browser testing         | ❌   | ✅      | ⚠️ If testing websites  | ❌ No               |
| Navigate to URL                | ❌   | ✅      | ✅ Line 346             | ❌ No               |
| Event recording                | ✅   | ❌      | ✅ TouchEventCapture    | ✅ Yes              |
| Network monitoring             | ✅   | ❌      | ✅ SDK                  | ✅ Yes              |
| Element hierarchy inspection   | ✅   | ✅      | ✅ Both                 | ⚠️ SDK only on Win  |

---

## Target Architecture

### Post-Migration System (Windows Compatible)

```
┌─────────────────────────────────────────────────────────────┐
│              TARGET SYSTEM (Windows + Mac Compatible)        │
└─────────────────────────────────────────────────────────────┘

Windows/Mac Desktop (Electron)
├── WebSocket Server (ws, port 8080) ✅
├── Bonjour Service / QR Code / Manual IP ✅
└── IPC Handlers
    └── SDK Executor (only) ✅

iPhone (iOS App with Enhanced SnapTest SDK)
├── SnapTest SDK
│   ├── TouchEventCapture ✅
│   ├── ActionExecutor
│   │   ├── Native Element Executor ✅ (existing)
│   │   └── WebView Executor ✅ (NEW!)
│   ├── NetworkMonitor ✅
│   ├── ScreenshotCapture ✅ (NEW!)
│   └── WebSocketManager ✅
└── Native UI ✅

Removed Components:
❌ Appium Server Manager (~200 lines deleted)
❌ WebDriverAgent dependencies
❌ appiumConnectionManager (~100 lines deleted)
❌ wdaElementLookup (~150 lines deleted)
❌ XCTest/Xcode dependencies

Net Code Change: -450 lines, +300 lines = -150 lines overall!
```

### New Feature Support Matrix (Target)

| Feature                        | SDK | Status    | Windows Compatible? |
|--------------------------------|-----|-----------|---------------------|
| Native element tap             | ✅   | ✅ Exists  | ✅ Yes               |
| Native element type            | ✅   | ✅ Exists  | ✅ Yes               |
| Native element swipe           | ✅   | ✅ Exists  | ✅ Yes               |
| **WebView/Hybrid automation**  | ✅   | 🆕 New    | ✅ Yes               |
| **Screenshot capture**         | ✅   | 🆕 New    | ✅ Yes               |
| Safari browser testing         | ❌   | ⚠️ N/A    | ⚠️ Use remote Mac   |
| Navigate to URL (in WebView)   | ✅   | 🆕 New    | ✅ Yes               |
| Event recording                | ✅   | ✅ Exists  | ✅ Yes               |
| Network monitoring             | ✅   | ✅ Exists  | ✅ Yes               |
| Element hierarchy inspection   | ✅   | ✅ Exists  | ✅ Yes               |

**Coverage**: 90% of mobile app testing scenarios (all except Safari browser testing)

---

## Migration Phases

### Phase 0: Pre-Migration Validation (Week 1, Days 1-2)

**Goal**: Confirm SDK readiness and test current Windows compatibility

**Tasks**:

1. **Audit Current Test Suite** (4 hours)
   - [ ] Analyze all test flows in use
   - [ ] Identify which flows use Appium-only features
   - [ ] Document WebView usage in target apps
   - [ ] Create compatibility matrix

2. **Windows Environment Setup** (2 hours)
   - [ ] Install Electron app on Windows VM/machine
   - [ ] Test WebSocket server startup
   - [ ] Verify network connectivity to iPhone (same WiFi)
   - [ ] Test Bonjour service discovery

3. **Baseline Testing** (4 hours)
   - [ ] Run existing native app tests via SDK
   - [ ] Document current success rate
   - [ ] Identify any SDK bugs/limitations
   - [ ] Create baseline metrics (speed, reliability)

**Deliverables**:
- ✅ Compatibility audit report
- ✅ Windows test environment
- ✅ Baseline performance metrics

**Decision Point**: If >80% of tests are SDK-compatible and Windows networking works, proceed to Phase 1.

---

### Phase 1: Add WebView Support to SDK (Week 1, Days 3-5)

**Goal**: Extend SDK to support WKWebView automation

#### 1.1 WebView Detection & Inspection (Day 3, 6-8 hours)

**Files to Create**:
- `SnapTestSDK/Sources/SnapTestSDK/WebView/WebViewInspector.swift`

**Implementation**:

```swift
import UIKit
import WebKit

/// Detects and inspects WKWebView elements
public class WebViewInspector {

    /// Check if a view is a WKWebView
    public static func isWebView(_ view: UIView) -> Bool {
        return view is WKWebView
    }

    /// Find the first WKWebView in the view hierarchy starting from a window
    public static func findWebView(in window: UIWindow) -> WKWebView? {
        return findWebView(in: window as UIView)
    }

    private static func findWebView(in view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView {
            return webView
        }
        for subview in view.subviews {
            if let found = findWebView(in: subview) {
                return found
            }
        }
        return nil
    }

    /// Convert screen coordinates to web view coordinates
    public static func screenToWebCoordinates(
        screenPoint: CGPoint,
        webView: WKWebView,
        window: UIWindow
    ) -> CGPoint {
        return webView.convert(screenPoint, from: window)
    }

    /// Find DOM element at given coordinates
    public static func findElementAtPoint(
        _ point: CGPoint,
        in webView: WKWebView,
        completion: @escaping (WebElement?) -> Void
    ) {
        let js = """
        (function() {
            var element = document.elementFromPoint(\(point.x), \(point.y));
            if (!element) return null;

            function getXPath(el) {
                if (el.id) return '//*[@id="' + el.id + '"]';

                var path = [];
                while (el && el.nodeType === Node.ELEMENT_NODE) {
                    var index = 0;
                    var sibling = el.previousSibling;
                    while (sibling) {
                        if (sibling.nodeType === Node.ELEMENT_NODE &&
                            sibling.nodeName === el.nodeName) {
                            index++;
                        }
                        sibling = sibling.previousSibling;
                    }

                    var tagName = el.nodeName.toLowerCase();
                    var pathIndex = (index ? "[" + (index + 1) + "]" : "");
                    path.unshift(tagName + pathIndex);
                    el = el.parentNode;
                }

                return "/" + path.join("/");
            }

            function getCSSSelector(el) {
                if (el.id) return '#' + el.id;

                var path = [];
                while (el && el.nodeType === Node.ELEMENT_NODE) {
                    var selector = el.nodeName.toLowerCase();
                    if (el.className) {
                        selector += '.' + el.className.trim().replace(/\\s+/g, '.');
                    }
                    path.unshift(selector);
                    el = el.parentNode;
                }
                return path.join(' > ');
            }

            var rect = element.getBoundingClientRect();

            return {
                tagName: element.tagName.toLowerCase(),
                id: element.id || '',
                className: element.className || '',
                name: element.name || '',
                text: element.innerText || element.textContent || '',
                value: element.value || '',
                xpath: getXPath(element),
                cssSelector: getCSSSelector(element),
                bounds: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                },
                isClickable: element.onclick !== null ||
                            element.tagName === 'BUTTON' ||
                            element.tagName === 'A',
                isEditable: element.tagName === 'INPUT' ||
                           element.tagName === 'TEXTAREA' ||
                           element.isContentEditable
            };
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            guard error == nil,
                  let dict = result as? [String: Any] else {
                completion(nil)
                return
            }

            let element = WebElement(from: dict)
            completion(element)
        }
    }

    /// Get full page source HTML
    public static func getPageSource(
        from webView: WKWebView,
        completion: @escaping (String?) -> Void
    ) {
        let js = "document.documentElement.outerHTML"
        webView.evaluateJavaScript(js) { result, error in
            completion(result as? String)
        }
    }
}

/// Represents a DOM element in a WKWebView
public struct WebElement {
    public let tagName: String
    public let id: String
    public let className: String
    public let name: String
    public let text: String
    public let value: String
    public let xpath: String
    public let cssSelector: String
    public let bounds: CGRect
    public let isClickable: Bool
    public let isEditable: Bool

    init(from dict: [String: Any]) {
        self.tagName = dict["tagName"] as? String ?? ""
        self.id = dict["id"] as? String ?? ""
        self.className = dict["className"] as? String ?? ""
        self.name = dict["name"] as? String ?? ""
        self.text = dict["text"] as? String ?? ""
        self.value = dict["value"] as? String ?? ""
        self.xpath = dict["xpath"] as? String ?? ""
        self.cssSelector = dict["cssSelector"] as? String ?? ""

        if let boundsDict = dict["bounds"] as? [String: Any] {
            let x = boundsDict["x"] as? CGFloat ?? 0
            let y = boundsDict["y"] as? CGFloat ?? 0
            let width = boundsDict["width"] as? CGFloat ?? 0
            let height = boundsDict["height"] as? CGFloat ?? 0
            self.bounds = CGRect(x: x, y: y, width: width, height: height)
        } else {
            self.bounds = .zero
        }

        self.isClickable = dict["isClickable"] as? Bool ?? false
        self.isEditable = dict["isEditable"] as? Bool ?? false
    }
}
```

**Testing**:
- [ ] Load test HTML page in WKWebView
- [ ] Verify element detection at coordinates
- [ ] Validate XPath generation accuracy
- [ ] Confirm CSS selector uniqueness

---

#### 1.2 WebView Action Executor (Day 4, 6-8 hours)

**Files to Create**:
- `SnapTestSDK/Sources/SnapTestSDK/WebView/WebViewActionExecutor.swift`

**Implementation**:

```swift
import UIKit
import WebKit

/// Executes actions on elements within WKWebView
public class WebViewActionExecutor {

    /// Execute a tap/click on a web element
    public static func executeClick(
        selector: String,
        in webView: WKWebView,
        actionId: String,
        completion: @escaping (Bool, String?) -> Void
    ) {
        let findElementJS: String

        if selector.hasPrefix("#") || selector.hasPrefix(".") || selector.contains("[") {
            // CSS selector
            findElementJS = "document.querySelector('\(escapedSelector(selector))')"
        } else if selector.hasPrefix("//") {
            // XPath selector
            findElementJS = """
            document.evaluate(
                '\(escapedSelector(selector))',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue
            """
        } else {
            completion(false, "Invalid selector format: \(selector)")
            return
        }

        let js = """
        (function() {
            var element = \(findElementJS);
            if (!element) {
                return {success: false, error: 'Element not found: \(selector)'};
            }

            // Scroll element into view
            element.scrollIntoView({behavior: 'smooth', block: 'center'});

            // Trigger click event
            element.click();

            // Also dispatch mouse events for compatibility
            var mouseEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(mouseEvent);

            return {success: true, tagName: element.tagName};
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            if let error = error {
                completion(false, "JavaScript error: \(error.localizedDescription)")
                return
            }

            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool {
                completion(success, dict["error"] as? String)
            } else {
                completion(false, "Unexpected response format")
            }
        }
    }

    /// Type text into a web element (input, textarea, contenteditable)
    public static func executeType(
        selector: String,
        text: String,
        in webView: WKWebView,
        actionId: String,
        completion: @escaping (Bool, String?) -> Void
    ) {
        let escapedText = text
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")

        let findElementJS: String
        if selector.hasPrefix("#") || selector.hasPrefix(".") || selector.contains("[") {
            findElementJS = "document.querySelector('\(escapedSelector(selector))')"
        } else if selector.hasPrefix("//") {
            findElementJS = """
            document.evaluate('\(escapedSelector(selector))', document, null,
                             XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
            """
        } else {
            completion(false, "Invalid selector format")
            return
        }

        let js = """
        (function() {
            var element = \(findElementJS);
            if (!element) {
                return {success: false, error: 'Element not found'};
            }

            // Scroll into view
            element.scrollIntoView({behavior: 'smooth', block: 'center'});

            // Focus the element
            element.focus();

            // Set value/content
            if (element.isContentEditable) {
                element.textContent = '\(escapedText)';
            } else {
                element.value = '\(escapedText)';
            }

            // Dispatch events to trigger validation/onChange handlers
            element.dispatchEvent(new Event('input', {bubbles: true}));
            element.dispatchEvent(new Event('change', {bubbles: true}));
            element.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true}));
            element.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true}));

            return {success: true};
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            if let error = error {
                completion(false, error.localizedDescription)
                return
            }

            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool {
                completion(success, dict["error"] as? String)
            } else {
                completion(false, "Unexpected response")
            }
        }
    }

    /// Scroll within the WebView
    public static func executeScroll(
        direction: String,
        amount: CGFloat = 0.8,
        in webView: WKWebView,
        completion: @escaping (Bool, String?) -> Void
    ) {
        let scrollX: String
        let scrollY: String

        switch direction.lowercased() {
        case "down":
            scrollX = "0"
            scrollY = "window.innerHeight * \(amount)"
        case "up":
            scrollX = "0"
            scrollY = "-window.innerHeight * \(amount)"
        case "left":
            scrollX = "-window.innerWidth * \(amount)"
            scrollY = "0"
        case "right":
            scrollX = "window.innerWidth * \(amount)"
            scrollY = "0"
        default:
            completion(false, "Invalid direction: \(direction)")
            return
        }

        let js = """
        (function() {
            window.scrollBy({
                left: \(scrollX),
                top: \(scrollY),
                behavior: 'smooth'
            });
            return {success: true};
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            completion(error == nil, error?.localizedDescription)
        }
    }

    /// Wait for element to appear in DOM
    public static func waitForElement(
        selector: String,
        timeout: TimeInterval = 10.0,
        in webView: WKWebView,
        completion: @escaping (Bool, String?) -> Void
    ) {
        let findElementJS: String
        if selector.hasPrefix("#") || selector.hasPrefix(".") {
            findElementJS = "document.querySelector('\(escapedSelector(selector))')"
        } else if selector.hasPrefix("//") {
            findElementJS = """
            document.evaluate('\(escapedSelector(selector))', document, null,
                             XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
            """
        } else {
            completion(false, "Invalid selector")
            return
        }

        let js = """
        new Promise((resolve) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                const element = \(findElementJS);
                const elapsed = Date.now() - startTime;

                if (element) {
                    clearInterval(checkInterval);
                    resolve({success: true, found: true});
                } else if (elapsed > \(timeout * 1000)) {
                    clearInterval(checkInterval);
                    resolve({success: false, error: 'Timeout waiting for element'});
                }
            }, 100);
        })
        """

        webView.evaluateJavaScript(js) { result, error in
            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool {
                completion(success, dict["error"] as? String)
            } else {
                completion(false, error?.localizedDescription ?? "Unknown error")
            }
        }
    }

    /// Assert element visibility
    public static func assertVisible(
        selector: String,
        in webView: WKWebView,
        completion: @escaping (Bool, String?) -> Void
    ) {
        let findElementJS: String
        if selector.hasPrefix("#") || selector.hasPrefix(".") {
            findElementJS = "document.querySelector('\(escapedSelector(selector))')"
        } else if selector.hasPrefix("//") {
            findElementJS = """
            document.evaluate('\(escapedSelector(selector))', document, null,
                             XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
            """
        } else {
            completion(false, "Invalid selector")
            return
        }

        let js = """
        (function() {
            var element = \(findElementJS);
            if (!element) {
                return {success: false, error: 'Element not found'};
            }

            var rect = element.getBoundingClientRect();
            var isVisible = rect.width > 0 && rect.height > 0 &&
                           window.getComputedStyle(element).visibility !== 'hidden' &&
                           window.getComputedStyle(element).display !== 'none';

            return {
                success: isVisible,
                error: isVisible ? null : 'Element is not visible'
            };
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool {
                completion(success, dict["error"] as? String)
            } else {
                completion(false, error?.localizedDescription)
            }
        }
    }

    /// Helper to escape selectors for JavaScript injection
    private static func escapedSelector(_ selector: String) -> String {
        return selector
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
    }
}
```

**Testing**:
- [ ] Test click on various element types (button, link, div with onclick)
- [ ] Test type in input, textarea, contenteditable
- [ ] Test scroll in all directions
- [ ] Test wait for element with various timeouts
- [ ] Test assertions (visible, hidden, text content)

---

#### 1.3 Integrate WebView with Event Capture (Day 5, 4-6 hours)

**Files to Modify**:
- `SnapTestSDK/Sources/SnapTestSDK/TouchEventCapture.swift`

**Changes**:

```swift
import UIKit
import WebKit

class TouchEventCapture: UIGestureRecognizer {
    // ... existing code ...

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let location = touch.location(in: view?.window)

        // NEW: Check if tap is on a WKWebView
        if let window = view?.window,
           let webView = findWebViewAtPoint(location, in: window) {
            handleWebViewTouch(at: location, in: webView, window: window)
        } else {
            // Existing native view handling
            handleNativeTouch(at: location)
        }
    }

    /// NEW: Handle touches on WKWebView
    private func handleWebViewTouch(at location: CGPoint, in webView: WKWebView, window: UIWindow) {
        let webPoint = WebViewInspector.screenToWebCoordinates(
            screenPoint: location,
            webView: webView,
            window: window
        )

        WebViewInspector.findElementAtPoint(webPoint, in: webView) { [weak self] webElement in
            guard let self = self, let element = webElement else { return }

            // Create TouchEvent with web element info
            let event = TouchEvent(
                id: UUID().uuidString,
                timestamp: Date(),
                gestureType: "tap",
                coordinates: location,
                element: ElementInfo(
                    className: element.tagName,
                    accessibilityIdentifier: element.cssSelector.isEmpty ? element.xpath : element.cssSelector,
                    text: element.text,
                    bounds: element.bounds,
                    isClickable: element.isClickable,
                    isEditable: element.isEditable,
                    xpath: element.xpath,
                    cssSelector: element.cssSelector,
                    isWebElement: true  // NEW FLAG!
                ),
                duration: nil,
                velocity: nil
            )

            // Send to WebSocket
            self.delegate?.didCaptureTouchEvent(event)

            // Log
            print("🌐 [WebView Touch] Captured: \(element.tagName) - \(element.cssSelector)")
        }
    }

    /// NEW: Find WKWebView at touch point
    private func findWebViewAtPoint(_ point: CGPoint, in window: UIWindow) -> WKWebView? {
        let hitView = window.hitTest(point, with: nil)

        // Traverse up the view hierarchy to find WKWebView
        var currentView: UIView? = hitView
        while let view = currentView {
            if let webView = view as? WKWebView {
                return webView
            }
            currentView = view.superview
        }

        return nil
    }

    // ... rest of existing code ...
}

/// Extended ElementInfo to support web elements
extension ElementInfo {
    var isWebElement: Bool {
        return cssSelector != nil && !cssSelector!.isEmpty
    }

    var cssSelector: String? {
        // Store in custom property
    }
}
```

**Files to Modify**:
- `SnapTestSDK/Sources/SnapTestSDK/Models/TouchEvent.swift`

**Changes**:

```swift
public struct ElementInfo: Codable {
    public let className: String
    public let accessibilityIdentifier: String
    public let text: String?
    public let bounds: CGRect
    public let isClickable: Bool
    public let isEditable: Bool
    public let xpath: String?

    // NEW: Web element support
    public let cssSelector: String?
    public let isWebElement: Bool

    public init(
        className: String,
        accessibilityIdentifier: String,
        text: String?,
        bounds: CGRect,
        isClickable: Bool,
        isEditable: Bool,
        xpath: String? = nil,
        cssSelector: String? = nil,
        isWebElement: Bool = false
    ) {
        self.className = className
        self.accessibilityIdentifier = accessibilityIdentifier
        self.text = text
        self.bounds = bounds
        self.isClickable = isClickable
        self.isEditable = isEditable
        self.xpath = xpath
        self.cssSelector = cssSelector
        self.isWebElement = isWebElement
    }
}
```

**Testing**:
- [ ] Record tap on web button
- [ ] Verify CSS selector captured correctly
- [ ] Record type in web input field
- [ ] Verify XPath fallback for elements without ID/class
- [ ] Test mixed native + web interactions

---

#### 1.4 Update Action Execution Logic (Day 5, 4-6 hours)

**Files to Modify**:
- `SnapTestSDK/Sources/SnapTestSDK/SnapTest.swift`

**Changes**:

```swift
import UIKit
import WebKit

// ... existing imports and class definition ...

private func handleExecuteAction(message: WebSocketMessage) {
    guard let actionId = message.actionId,
          let actionType = message.data?["actionType"] as? String,
          let selector = message.data?["selector"] as? String else {
        print("❌ Invalid action message")
        return
    }

    let value = message.data?["value"] as? String

    // NEW: Detect if this is a web element action
    if isWebSelector(selector) {
        executeWebAction(
            actionId: actionId,
            actionType: actionType,
            selector: selector,
            value: value
        )
    } else {
        // Existing native action execution
        executeNativeAction(
            actionId: actionId,
            actionType: actionType,
            selector: selector,
            value: value
        )
    }
}

/// NEW: Determine if selector is for web element
private func isWebSelector(_ selector: String) -> Bool {
    // CSS selectors: #id, .class, tag[attr]
    if selector.hasPrefix("#") || selector.hasPrefix(".") || selector.contains("[") {
        return true
    }

    // XPath for web (doesn't contain "XC" which is used for XCUIElement paths)
    if selector.hasPrefix("//") && !selector.contains("XC") {
        return true
    }

    return false
}

/// NEW: Execute action on web element
private func executeWebAction(
    actionId: String,
    actionType: String,
    selector: String,
    value: String?
) {
    guard let window = UIApplication.shared.windows.first,
          let webView = WebViewInspector.findWebView(in: window) else {
        sendActionResult(actionId: actionId, success: false, error: "No WebView found")
        return
    }

    print("🌐 [Web Action] \(actionType) on \(selector)")

    switch actionType.lowercased() {
    case "tap", "click":
        WebViewActionExecutor.executeClick(selector: selector, in: webView, actionId: actionId) { success, error in
            self.sendActionResult(actionId: actionId, success: success, error: error)
        }

    case "type":
        guard let text = value else {
            sendActionResult(actionId: actionId, success: false, error: "No value provided for type action")
            return
        }
        WebViewActionExecutor.executeType(selector: selector, text: text, in: webView, actionId: actionId) { success, error in
            self.sendActionResult(actionId: actionId, success: success, error: error)
        }

    case "swipe", "scroll":
        let direction = value ?? "down"
        WebViewActionExecutor.executeScroll(direction: direction, in: webView) { success, error in
            self.sendActionResult(actionId: actionId, success: success, error: error)
        }

    case "wait":
        let timeout = Double(value ?? "10") ?? 10.0
        WebViewActionExecutor.waitForElement(selector: selector, timeout: timeout, in: webView) { success, error in
            self.sendActionResult(actionId: actionId, success: success, error: error)
        }

    case "assert":
        WebViewActionExecutor.assertVisible(selector: selector, in: webView) { success, error in
            self.sendActionResult(actionId: actionId, success: success, error: error)
        }

    default:
        sendActionResult(actionId: actionId, success: false, error: "Unknown action type: \(actionType)")
    }
}

// ... existing executeNativeAction remains unchanged ...
```

**Testing**:
- [ ] Execute click on web button from desktop
- [ ] Execute type in web input from desktop
- [ ] Test mixed native → web → native action sequence
- [ ] Verify error handling for missing WebView
- [ ] Test action acknowledgment via WebSocket

---

### Phase 2: Add Screenshot Support to SDK (Week 2, Day 1, 4-6 hours)

**Goal**: Replace Appium screenshot functionality with SDK-native capture

**Files to Create**:
- `SnapTestSDK/Sources/SnapTestSDK/Screenshot/ScreenshotCapture.swift`

**Implementation**:

```swift
import UIKit

public class ScreenshotCapture {

    /// Capture screenshot of entire screen
    public static func captureScreen() -> UIImage? {
        guard let window = UIApplication.shared.windows.first else {
            return nil
        }

        let renderer = UIGraphicsImageRenderer(bounds: window.bounds)
        return renderer.image { context in
            window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
        }
    }

    /// Capture screenshot and encode as base64 PNG
    public static func captureScreenAsBase64() -> String? {
        guard let image = captureScreen(),
              let pngData = image.pngData() else {
            return nil
        }
        return pngData.base64EncodedString()
    }

    /// Capture screenshot of specific view
    public static func captureView(_ view: UIView) -> UIImage? {
        let renderer = UIGraphicsImageRenderer(bounds: view.bounds)
        return renderer.image { context in
            view.drawHierarchy(in: view.bounds, afterScreenUpdates: true)
        }
    }
}
```

**Files to Modify**:
- `SnapTestSDK/Sources/SnapTestSDK/SnapTest.swift`

Add screenshot command handling:

```swift
case "screenshot":
    if let base64Image = ScreenshotCapture.captureScreenAsBase64() {
        let response = WebSocketMessage(
            type: "screenshotResult",
            actionId: message.actionId,
            data: ["image": base64Image]
        )
        webSocketManager.send(message: response)
    } else {
        sendActionResult(actionId: message.actionId ?? "", success: false, error: "Screenshot failed")
    }
```

**Files to Modify**:
- `src/utils/sdkActionExecutor.ts`

Replace Appium screenshot calls:

```typescript
async function takeScreenshot(deviceId: string): Promise<string | null> {
  const executor = sdkActionExecutorManager.getExecutor(deviceId);
  if (!executor) return null;

  // Send screenshot command to SDK
  const result = await executor.sendCommand({
    type: 'screenshot',
    actionId: generateActionId()
  });

  return result.data?.image || null;  // Base64 PNG
}
```

**Testing**:
- [ ] Capture screenshot of native app screen
- [ ] Capture screenshot of web view
- [ ] Verify base64 encoding/decoding
- [ ] Test file save on desktop
- [ ] Performance test (should be <500ms)

---

### Phase 3: Remove Appium Dependencies (Week 2, Days 2-3)

**Goal**: Delete all Appium-related code and dependencies

#### 3.1 Remove Electron Backend Appium Code (Day 2, 4 hours)

**Files to Delete**:
- [ ] `electron/appiumServerManager.ts` (~177 lines)
- [ ] `src/utils/appiumConnection.ts` (~100 lines)
- [ ] `electron/wdaElementLookup.ts` (~150 lines)

**Files to Modify**:

1. **`electron/mobileDeviceIPC.ts`** (Remove Appium IPC handlers)

```typescript
// DELETE these handlers:
ipcMain.handle('mobile:startAppiumServer', ...) // Line ~245
ipcMain.handle('mobile:stopAppiumServer', ...)  // Line ~267
ipcMain.handle('mobile:getAppiumStatus', ...)   // Line ~289
ipcMain.handle('mobile:executeAppiumAction', ...) // Line ~312

// DELETE imports:
import { appiumServerManager } from './appiumServerManager';  // DELETE
import { appiumConnectionManager } from '../src/utils/appiumConnection';  // DELETE
```

2. **`src/utils/mobileActionExecutor.ts`** (Remove Appium fallback)

```typescript
// BEFORE (lines 596-614):
async executeActions(device: MobileDevice, actions: Action[]) {
  if (device.os === 'ios') {
    console.log(`Using SDK execution for iOS device: ${device.name}`)
    const sdkExecutor = sdkActionExecutorManager.getExecutor(deviceId)
    return await sdkExecutor.executeActions(actions)
  }

  // Fall back to Appium-based execution
  const executor = this.getExecutor(device)  // DELETE THIS FALLBACK
  return await executor.executeActions(actions)
}

// AFTER:
async executeActions(device: MobileDevice, actions: Action[]) {
  if (device.os === 'ios') {
    console.log(`Using SDK execution for iOS device: ${device.name}`)
    const sdkExecutor = sdkActionExecutorManager.getExecutor(deviceId)
    if (!sdkExecutor) {
      throw new Error(`SDK executor not available for device ${device.id}. Ensure SnapTest SDK is integrated in your app.`)
    }
    return await sdkExecutor.executeActions(actions)
  }

  if (device.os === 'android') {
    // TODO: Future Android SDK implementation
    throw new Error('Android support not yet implemented. Coming soon!')
  }

  throw new Error(`Unsupported device OS: ${device.os}`)
}
```

3. **`src/utils/mobileActionExecutor.ts`** (Remove screenshot/navigate fallbacks)

```typescript
// DELETE handleScreenshot Appium branch (lines 329-343):
private async handleScreenshot(action: Action) {
  // DELETE:
  // if (this.device.os === 'android') {
  //   screenshot = await cdpConnectionManager.takeScreenshot(this.device.id)
  // } else {
  //   screenshot = await appiumConnectionManager.takeScreenshot(this.device.id)
  // }

  // REPLACE WITH:
  const executor = sdkActionExecutorManager.getExecutor(this.device.id);
  if (!executor) {
    throw new Error('SDK executor not available');
  }

  const screenshot = await executor.takeScreenshot();
  // ... rest of existing code
}

// DELETE handleNavigate Appium branch (lines 346-370):
private async handleNavigate(action: Action) {
  // DELETE Appium navigation

  // REPLACE WITH:
  throw new Error('Navigate action only supported for web elements in hybrid apps. Use web element selectors.');
}
```

4. **`package.json`** (Remove dependencies)

```json
// DELETE these lines:
"appium": "^2.x.x",
"appium-xcuitest-driver": "^x.x.x",
// Any other appium-related packages
```

**Testing**:
- [ ] Verify app builds without Appium imports
- [ ] Test SDK-based action execution still works
- [ ] Verify error messages guide users correctly
- [ ] Check bundle size reduction (~15-20MB smaller)

---

#### 3.2 Update Frontend UI (Day 2, 2 hours)

**Files to Modify**:

1. **`src/components/DeviceSelector.tsx`** (Remove Appium status indicators)

```typescript
// DELETE Appium server status display
// DELETE "Start Appium Server" button
// DELETE Appium connection indicators

// ADD SDK connection status:
<div className="sdk-status">
  {device.sdkConnected ? (
    <Badge color="green">SDK Connected</Badge>
  ) : (
    <Badge color="gray">SDK Not Connected</Badge>
  )}
</div>
```

2. **`src/components/MobileTestPanel.tsx`** (Simplify action executor selection)

```typescript
// DELETE executor selection dropdown (Appium vs SDK)
// SDK is now the only executor

// SIMPLIFY to:
<div className="execution-mode">
  <p>Using SnapTest SDK for fast, native test execution</p>
</div>
```

**Testing**:
- [ ] UI displays SDK connection status
- [ ] No references to Appium visible
- [ ] Action execution works from UI

---

#### 3.3 Update Documentation (Day 3, 4 hours)

**Files to Modify/Create**:

1. **`README.md`**

```markdown
## Requirements

### Desktop Application
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **Node.js**: 16.x or higher
- **Electron**: 25.x (included in dependencies)

### iOS Device
- **iOS Version**: 13.0+
- **Network**: Same WiFi network as desktop OR USB connection
- **App Integration**: SnapTest SDK embedded in your app

### ❌ No Longer Required:
- ~~Xcode~~ (removed!)
- ~~WebDriverAgent~~ (removed!)
- ~~Appium~~ (removed!)
- ~~Mac for automation~~ (works on Windows!)
```

2. **`SETUP_GUIDE.md`** (Create new)

```markdown
# Setup Guide: Windows Edition

## 1. Install Desktop App (Windows)

1. Download the latest release for Windows
2. Run the installer (`SnapTest-Setup-x.x.x.exe`)
3. Launch SnapTest

The app will automatically start a WebSocket server on port 8080.

## 2. Integrate SDK in Your iOS App

See [SDK_INTEGRATION_GUIDE.md](./SDK_INTEGRATION_GUIDE.md) for detailed instructions.

Quick start:

1. Add SnapTest SDK to your Xcode project
2. Initialize in AppDelegate:
   ```swift
   import SnapTestSDK

   func application(_ application: UIApplication, didFinishLaunchingWithOptions...) {
       SnapTest.shared.start()
   }
   ```
3. Build and install app on your iPhone

## 3. Connect iPhone to Desktop

### Option A: Auto-Discovery (Easiest)

1. Ensure iPhone and Windows PC are on the same WiFi network
2. SDK will auto-discover desktop via Bonjour/mDNS
3. Connection status appears in app

### Option B: Manual IP Entry

1. In SnapTest desktop, note the IP address displayed (e.g., `192.168.1.100:8080`)
2. In your iOS app settings, enter this IP address
3. Tap "Connect"

### Option C: QR Code (Coming Soon)

1. Desktop displays QR code
2. Scan with iOS app
3. Auto-connects

## 4. Start Testing!

1. In desktop app, click "Start Recording"
2. Interact with your iOS app (taps, swipes, typing)
3. Actions are captured in real-time
4. Click "Stop Recording"
5. Click "Play Flow" to replay
6. Click "Generate Code" to export Playwright script
```

3. **`SDK_INTEGRATION_GUIDE.md`** (Update)

Add section on WebView support:

```markdown
## WebView Support

SnapTest SDK now supports testing hybrid apps with embedded WKWebView!

### No Additional Configuration Required

The SDK automatically detects when you interact with web elements and captures:
- CSS selectors
- XPath
- Element text, id, class
- Form input values

### Recording Web Interactions

Just tap elements in your WKWebView as normal. The SDK will:
1. Detect it's a web element
2. Generate optimal selector (ID > class > XPath)
3. Record the interaction

### Executing Web Actions

When playing back tests, the SDK will:
1. Detect web element selectors (e.g., `#loginButton`, `.submit-btn`)
2. Inject JavaScript to perform action
3. Trigger appropriate events (click, input, change)

### Supported Web Actions

- ✅ Click/Tap
- ✅ Type text
- ✅ Scroll
- ✅ Assert visibility
- ✅ Wait for element

### Example: Testing Hybrid Login Flow

```swift
// Your app has a WKWebView with login form
// SDK automatically handles it!

// Desktop records:
1. Tap native "Open Login" button → Native action
2. Type "user@example.com" in web input → Web action (CSS: #email)
3. Type "password123" in web input → Web action (CSS: #password)
4. Tap web "Login" button → Web action (CSS: button[type="submit"])
5. Tap native "Dashboard" tab → Native action

// Generated code works seamlessly:
test('hybrid login flow', async ({ page }) => {
  await page.locator('//XCUIElementTypeButton[@name="Open Login"]').click()
  await page.locator('#email').fill('user@example.com')
  await page.locator('#password').fill('password123')
  await page.locator('button[type="submit"]').click()
  await page.locator('//XCUIElementTypeButton[@name="Dashboard"]').click()
})
```
```

4. **`CLAUDE.md`** (Update project overview)

Update architecture diagram to remove Appium references.

**Testing**:
- [ ] Docs build without errors
- [ ] All links work
- [ ] Setup guide tested on Windows
- [ ] SDK guide tested with hybrid app

---

### Phase 4: Bonjour/Discovery Enhancement (Week 2, Day 4)

**Goal**: Ensure cross-platform device discovery with fallbacks

#### 4.1 Test Bonjour on Windows (2 hours)

**Tasks**:

1. Install SnapTest on Windows VM/machine
2. Test if `bonjour-service` npm package works out of box
3. Document any issues

**Current Code** (`electron/websocketServer.ts`):
```typescript
import Bonjour from 'bonjour-service'

export class WebSocketServer {
  private bonjour?: Bonjour.Bonjour

  async start() {
    // ... WebSocket setup ...

    // Advertise service via Bonjour
    this.bonjour = new Bonjour()
    this.bonjour.publish({
      name: 'SnapTest Desktop',
      type: 'snaptest',
      port: this.port,
      txt: {
        version: '1.0.0'
      }
    })
  }
}
```

**Expected Result**: Should work on Windows if Bonjour Print Services installed

**If Bonjour Doesn't Work on Windows**, proceed to 4.2.

---

#### 4.2 Add Manual IP Entry Fallback (4 hours)

**Files to Create**:
- `src/components/ConnectionSettings.tsx`

```typescript
import React, { useState } from 'react'

export function ConnectionSettings() {
  const [serverIP, setServerIP] = useState('')
  const [localIP, setLocalIP] = useState<string>()

  React.useEffect(() => {
    // Get local IP to display to user
    window.electronAPI.getLocalIP().then(setLocalIP)
  }, [])

  return (
    <div className="connection-settings">
      <h2>Connection Settings</h2>

      <div className="server-info">
        <h3>Desktop IP Address</h3>
        <p>Enter this IP in your iOS app to connect manually:</p>
        <code className="ip-display">{localIP}:8080</code>
        <button onClick={() => navigator.clipboard.writeText(`${localIP}:8080`)}>
          Copy to Clipboard
        </button>
      </div>

      <div className="qr-code">
        <h3>Or Scan QR Code</h3>
        <QRCodeDisplay url={`ws://${localIP}:8080`} />
      </div>
    </div>
  )
}
```

**Files to Modify**:
- `electron/preload.ts`

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods ...

  getLocalIP: () => ipcRenderer.invoke('network:getLocalIP')
})
```

**Files to Modify**:
- `electron/main.ts`

```typescript
import os from 'os'

ipcMain.handle('network:getLocalIP', () => {
  const interfaces = os.networkInterfaces()

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      // Skip internal and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }

  return 'localhost'
})
```

**iOS SDK Update** (`SnapTestSDK/Sources/SnapTestSDK/BonjourServiceDiscovery.swift`):

```swift
// Add manual connection method
public class BonjourServiceDiscovery {
    // ... existing auto-discovery code ...

    /// Connect to server via manual IP address
    public func connectManually(host: String, port: Int = 8080) {
        let url = "ws://\(host):\(port)"
        delegate?.didDiscoverService(host: host, port: port)
    }
}
```

**Testing**:
- [ ] Display local IP in desktop UI
- [ ] Copy IP to clipboard
- [ ] Manually connect from iOS app
- [ ] Verify connection established
- [ ] Test reconnection after network change

---

#### 4.3 Add QR Code Connection (Optional, 2 hours)

**Install Dependency**:
```bash
npm install qrcode.react
```

**Files to Create**:
- `src/components/QRCodeDisplay.tsx`

```typescript
import React from 'react'
import QRCode from 'qrcode.react'

interface QRCodeDisplayProps {
  url: string
}

export function QRCodeDisplay({ url }: QRCodeDisplayProps) {
  return (
    <div className="qr-code-container">
      <QRCode value={url} size={200} />
      <p className="qr-hint">Scan with iOS app to connect</p>
    </div>
  )
}
```

**iOS SDK**: Add QR scanner capability (requires AVFoundation camera permissions)

**Testing**:
- [ ] QR code displays correctly
- [ ] Scanning QR establishes connection
- [ ] Works from various distances

---

### Phase 5: Testing & Validation (Week 3)

#### 5.1 Functional Testing (Days 1-2, 12 hours)

**Test Suite**:

1. **Native App Testing** (4 hours)
   - [ ] Record tap on button
   - [ ] Record type in text field
   - [ ] Record swipe gesture
   - [ ] Record scroll
   - [ ] Play back recorded flow
   - [ ] Generate Playwright code
   - [ ] Verify generated code runs

2. **Hybrid App Testing** (4 hours)
   - [ ] Record tap on web button in WKWebView
   - [ ] Record type in web input field
   - [ ] Record mixed native → web → native flow
   - [ ] Play back hybrid flow
   - [ ] Verify CSS selectors used
   - [ ] Verify XPath fallback for complex elements

3. **Cross-Platform Testing** (4 hours)
   - [ ] Test on Windows 10
   - [ ] Test on Windows 11
   - [ ] Test on macOS (ensure still works)
   - [ ] Test manual IP connection
   - [ ] Test Bonjour auto-discovery (if available)
   - [ ] Test reconnection after network interruption

**Test Apps**:
- Simple native SwiftUI app (todo list)
- Hybrid app with WKWebView (login form)
- Production app (if available)

---

#### 5.2 Performance Testing (Day 3, 4 hours)

**Benchmarks**:

| Metric                  | Target      | How to Test                    |
|-------------------------|-------------|--------------------------------|
| Action execution time   | < 100ms     | Time SDK action vs old Appium  |
| Screenshot capture time | < 500ms     | Time SDK screenshot            |
| WebSocket latency       | < 20ms      | Ping-pong message timing       |
| Event capture accuracy  | > 95%       | Record 100 taps, verify count  |
| Connection reliability  | > 99%       | 24-hour stress test            |

**Tools**:
- Use Chrome DevTools for network timing
- Add performance logging to SDK
- Create automated stress test script

---

#### 5.3 Edge Case Testing (Day 4, 4 hours)

**Scenarios**:

1. **Network Issues**
   - [ ] Disconnection during action execution
   - [ ] Reconnection mid-flow
   - [ ] Switching WiFi networks
   - [ ] Weak signal scenarios

2. **WebView Edge Cases**
   - [ ] Nested iframes
   - [ ] Shadow DOM elements
   - [ ] Dynamically loaded content
   - [ ] Single-page app (SPA) navigation
   - [ ] Elements with duplicate selectors

3. **SDK Resilience**
   - [ ] Background/foreground app transitions
   - [ ] Low memory warnings
   - [ ] Concurrent actions
   - [ ] Invalid selectors

**Testing**:
- Document failures
- Add error handling for each case
- Update SDK with fixes

---

#### 5.4 User Acceptance Testing (Day 5, 4 hours)

**Participants**: 2-3 team members or beta testers

**Tasks**:

1. **Setup Test** (30 min/person)
   - Install desktop app on Windows
   - Install test app with SDK on iPhone
   - Connect devices
   - Rate ease of setup (1-10)

2. **Recording Test** (30 min/person)
   - Create test flow with 10+ steps
   - Mix native and web interactions (if hybrid app)
   - Rate recording experience

3. **Playback Test** (30 min/person)
   - Play back recorded flow
   - Verify accuracy
   - Note any failures

4. **Code Generation Test** (30 min/person)
   - Generate Playwright code
   - Run code outside app
   - Verify it works as expected

**Success Criteria**:
- Setup rated 7+/10
- Recording accuracy >90%
- Playback success rate >85%
- Generated code runs without modification

---

### Phase 6: Deployment & Documentation (Week 3, Day 5)

#### 6.1 Package for Distribution (4 hours)

**Build for Windows**:

```bash
# Update electron-builder config in package.json
"build": {
  "win": {
    "target": ["nsis", "portable"],
    "icon": "build/icon.ico"
  }
}

# Build
npm run build
npm run package
```

**Deliverables**:
- `SnapTest-Setup-x.x.x.exe` (NSIS installer)
- `SnapTest-x.x.x-portable.exe` (Portable version)
- `SnapTest-x.x.x.dmg` (macOS, for compatibility)

**Testing**:
- [ ] Install on clean Windows 10 VM
- [ ] Verify all features work
- [ ] Check for dependency issues
- [ ] Test uninstaller

---

#### 6.2 Final Documentation (2 hours)

**Update All Docs**:

- [ ] `README.md` - Remove Appium references
- [ ] `SETUP_GUIDE.md` - Windows-first instructions
- [ ] `SDK_INTEGRATION_GUIDE.md` - Add WebView section
- [ ] `TROUBLESHOOTING.md` - Common Windows issues
- [ ] `CHANGELOG.md` - Document migration changes

**Create New Docs**:

- [ ] `WINDOWS_SETUP.md` - Detailed Windows guide
- [ ] `HYBRID_APP_TESTING.md` - WebView testing guide
- [ ] `MIGRATION_FROM_APPIUM.md` - For existing users

---

#### 6.3 Create Migration Announcement (1 hour)

**Email/Slack Template**:

```markdown
# SnapTest v2.0: Now with Windows Support! 🎉

We're excited to announce SnapTest v2.0, featuring:

✅ **Windows Compatibility** - Run desktop app on Windows 10/11
✅ **Hybrid App Support** - Test apps with embedded WKWebView
✅ **50-100x Faster** - Direct SDK execution (no more Appium!)
✅ **Simpler Setup** - No Xcode required for automation
✅ **Smaller Footprint** - 15MB smaller app bundle

## What Changed?

We've replaced Appium with our native SDK for iOS automation. This means:

- **Mac No Longer Required** for running tests (still needed for building iOS apps)
- **WebDriverAgent Removed** - No more XCTest/WDA setup
- **Instant Actions** - Actions execute in ~20ms vs 10+ seconds

## Migration Guide

Existing users: Your recorded flows still work! Just:
1. Update to SnapTest v2.0
2. Ensure latest SDK integrated in your app (v2.x)
3. Test your flows

See [MIGRATION_FROM_APPIUM.md](./MIGRATION_FROM_APPIUM.md) for details.

## Breaking Changes

- Appium-based execution removed
- Safari/browser testing requires separate tool
- iOS 13+ now required (was iOS 11+)

## Get Started

Download: [SnapTest v2.0 for Windows](https://...)

Questions? See our [docs](https://...) or open an issue.

Happy testing!
```

---

## Technical Implementation Details

### SDK Architecture (Updated)

```
SnapTestSDK/
├── Sources/
│   ├── SnapTestSDK/
│   │   ├── SnapTest.swift              # Main SDK entry point
│   │   ├── WebSocketManager.swift      # Existing
│   │   ├── TouchEventCapture.swift     # Updated for WebView
│   │   ├── NetworkMonitor.swift        # Existing
│   │   ├── Models/
│   │   │   ├── TouchEvent.swift        # Updated: added cssSelector, isWebElement
│   │   │   ├── WebSocketMessage.swift  # Existing
│   │   │   └── ElementInfo.swift       # Updated
│   │   ├── WebView/                    # NEW!
│   │   │   ├── WebViewInspector.swift
│   │   │   ├── WebViewActionExecutor.swift
│   │   │   └── WebElement.swift
│   │   └── Screenshot/                 # NEW!
│   │       └── ScreenshotCapture.swift
│   └── ...
└── Package.swift
```

### Desktop App Architecture (Updated)

```
src/
├── components/
│   ├── ConnectionSettings.tsx          # NEW
│   ├── QRCodeDisplay.tsx              # NEW
│   ├── DeviceSelector.tsx             # Modified
│   └── ...
├── utils/
│   ├── sdkActionExecutor.ts           # Primary executor
│   ├── mobileActionExecutor.ts        # Modified: removed Appium
│   ├── appiumConnection.ts            # DELETED
│   └── ...
└── ...

electron/
├── main.ts                            # Modified: removed Appium IPC
├── websocketServer.ts                 # Existing
├── mobileDeviceIPC.ts                 # Modified: removed Appium handlers
├── appiumServerManager.ts             # DELETED
├── wdaElementLookup.ts               # DELETED
└── ...
```

---

## Timeline & Resource Allocation

### Summary

| Phase                        | Duration   | Effort (hours) | Developers Needed |
|------------------------------|------------|----------------|-------------------|
| Phase 0: Pre-Migration       | 2 days     | 10             | 1                 |
| Phase 1: WebView Support     | 3 days     | 20-26          | 1-2               |
| Phase 2: Screenshot Support  | 1 day      | 4-6            | 1                 |
| Phase 3: Remove Appium       | 2 days     | 10             | 1                 |
| Phase 4: Bonjour Enhancement | 1 day      | 6-8            | 1                 |
| Phase 5: Testing & Validation| 5 days     | 24             | 2                 |
| Phase 6: Deployment & Docs   | 1 day      | 7              | 1                 |
| **Total**                    | **15 days**| **81-91**      | **1-2**           |

### Recommended Schedule (3 weeks)

**Week 1**: SDK Enhancement
- Mon-Tue: Pre-migration validation
- Wed-Fri: WebView support implementation

**Week 2**: Desktop Cleanup
- Mon: Screenshot support
- Tue-Wed: Remove Appium dependencies
- Thu: Bonjour/connection improvements
- Fri: Buffer/bug fixes

**Week 3**: Testing & Release
- Mon-Thu: Comprehensive testing
- Fri: Packaging and deployment

---

## Risk Assessment & Mitigation

### High Risk Items

#### 1. Bonjour Not Working on Windows

**Risk**: Auto-discovery fails, requiring manual IP entry

**Likelihood**: Medium (30%)
**Impact**: Medium (UX degradation, not a blocker)

**Mitigation**:
- Test Bonjour on Windows early (Phase 0)
- Implement manual IP entry fallback (Phase 4.2)
- Provide clear setup instructions
- Add QR code option for easier pairing

**Fallback**: Manual IP entry works perfectly, just less convenient

---

#### 2. WebView JavaScript Injection Security Issues

**Risk**: Apps with strict CSP (Content Security Policy) block JavaScript injection

**Likelihood**: Low (20%)
**Impact**: High (can't test some hybrid apps)

**Mitigation**:
- Test with various hybrid apps early
- Document CSP requirements
- Provide workaround: whitelist SDK's evaluateJavaScript
- Add native action fallback for inaccessible WebViews

**Fallback**: Native actions still work, recommend native element testing for CSP-protected apps

---

### Medium Risk Items

#### 3. Existing Tests Break After Migration

**Risk**: Recorded flows fail after Appium removal

**Likelihood**: Low (15%)
**Impact**: Medium (requires re-recording)

**Mitigation**:
- SDK execution already used preferentially (lines 596-614)
- Test all existing flows in Phase 0
- Create compatibility layer if needed
- Provide migration script for selector format changes

**Fallback**: Users re-record flows (fast with SDK!)

---

#### 4. Performance Regression in Some Scenarios

**Risk**: SDK slower than expected for certain actions

**Likelihood**: Low (10%)
**Impact**: Low (still faster than Appium overall)

**Mitigation**:
- Benchmark all action types in Phase 5.2
- Optimize hot paths in SDK
- Add caching for hierarchy lookups

**Fallback**: Even 2x slower than target is still 50x faster than Appium

---

### Low Risk Items

#### 5. Windows Firewall Blocks WebSocket Server

**Risk**: Users can't connect due to firewall

**Likelihood**: Medium (40%)
**Impact**: Low (clear error message and fix)

**Mitigation**:
- Detect firewall blocking and show alert
- Provide clear instructions to allow app
- Installer requests firewall permission automatically
- Add firewall troubleshooting to docs

---

## Testing Strategy

### Test Environment Matrix

| OS           | Version        | Device           | iOS Version | App Type       | Priority |
|--------------|----------------|------------------|-------------|----------------|----------|
| Windows 10   | 21H2           | iPhone 12        | 15.0        | Native         | P0       |
| Windows 11   | 22H2           | iPhone 14        | 16.0        | Hybrid         | P0       |
| macOS        | 13.0 Ventura   | iPhone SE 2020   | 14.0        | Native         | P1       |
| Windows 10   | LTSC 2019      | iPhone 11        | 15.5        | Hybrid         | P1       |

### Test Cases

**P0 - Critical Path** (must pass before release):

1. ✅ Install desktop app on Windows
2. ✅ Start WebSocket server
3. ✅ Connect iPhone via manual IP
4. ✅ Record 10 native actions (tap, type, swipe)
5. ✅ Play back recorded flow
6. ✅ Generate Playwright code
7. ✅ Record 5 web actions in hybrid app
8. ✅ Play back hybrid flow
9. ✅ Take screenshot via SDK
10. ✅ Reconnect after network interruption

**P1 - Important** (should pass, can have minor issues):

11. ⚠️ Auto-connect via Bonjour
12. ⚠️ QR code connection
13. ⚠️ Test with 50+ step flow
14. ⚠️ Test with SPA navigation
15. ⚠️ Test with shadow DOM elements

**P2 - Nice to Have** (can defer to next release):

16. ⏸️ Simultaneous multi-device testing
17. ⏸️ Background app testing
18. ⏸️ Cross-app flow testing

### Acceptance Criteria

Migration is successful if:

- ✅ **P0 tests pass 100%** on Windows 10/11
- ✅ **P1 tests pass >80%**
- ✅ **Performance**: SDK actions execute in <200ms (avg)
- ✅ **Compatibility**: macOS users still fully functional
- ✅ **Setup time**: Windows user can connect in <5 min
- ✅ **Documentation**: Setup guide tested by non-developer

---

## Rollback Plan

### If Migration Fails (During Development)

**Trigger**: Critical blocker discovered (e.g., SDK fundamentally incompatible)

**Action**:
1. Stop migration work
2. Revert Git branches to pre-migration state
3. Document blocker and root cause
4. Evaluate alternative approaches

**Time to Rollback**: < 1 hour (Git revert)

### If Migration Fails (Post-Release)

**Trigger**: >25% of users report critical issues on Windows

**Action**:
1. Release hotfix with improved error messages
2. Publish rollback guide for users
3. Maintain v1.x branch with Appium support
4. Offer users choice between v1 (Mac+Appium) and v2 (Win+SDK)

**Time to Rollback**: < 4 hours (publish v1.x as "stable" track)

### Rollback Mitigation

- Keep v1.x branch maintained during migration
- Tag stable pre-migration commit
- Document all breaking changes
- Provide parallel installation support (v1 and v2 coexist)

---

## Success Criteria

### Technical Metrics

- [ ] **Windows Compatibility**: App runs on Windows 10/11 without errors
- [ ] **SDK Coverage**: 100% of native actions, 90% of web actions work
- [ ] **Performance**: <100ms average action execution (vs 10s+ with Appium)
- [ ] **Reliability**: >95% action success rate
- [ ] **Build Size**: <5MB SDK, <100MB desktop app
- [ ] **Zero Mac Dependencies**: No Xcode/WDA/Appium in codebase

### User Experience Metrics

- [ ] **Setup Time**: <5 minutes from download to first test
- [ ] **Connection Rate**: >90% of users connect successfully (auto or manual)
- [ ] **Learning Curve**: Non-technical user can record test in <10 min
- [ ] **Documentation**: Setup guide rated 8+/10 for clarity

### Business Metrics

- [ ] **User Adoption**: >50% of Windows users successfully test within 1 week
- [ ] **Support Tickets**: <10% increase (migration-related issues)
- [ ] **Retention**: >80% of users continue using after migration
- [ ] **Feature Parity**: 90% of v1 features available in v2

---

## Post-Migration Roadmap

### Next Steps After Windows Support

**Q1: Platform Expansion**
- Android SDK development
- Linux desktop app support
- Web-based dashboard (no Electron install)

**Q2: Advanced Features**
- Multi-device orchestration
- Cloud test execution
- Visual regression testing
- Performance profiling

**Q3: Enterprise Features**
- Team collaboration
- Test result analytics
- CI/CD integrations
- Role-based access control

---

## Appendix

### A. File Change Summary

**Files Deleted** (650 lines removed):
- `electron/appiumServerManager.ts`
- `src/utils/appiumConnection.ts`
- `electron/wdaElementLookup.ts`

**Files Modified** (200 lines changed):
- `electron/mobileDeviceIPC.ts`
- `src/utils/mobileActionExecutor.ts`
- `src/components/DeviceSelector.tsx`
- `SnapTestSDK/Sources/SnapTestSDK/TouchEventCapture.swift`
- `SnapTestSDK/Sources/SnapTestSDK/SnapTest.swift`

**Files Created** (300 lines added):
- `SnapTestSDK/Sources/SnapTestSDK/WebView/WebViewInspector.swift`
- `SnapTestSDK/Sources/SnapTestSDK/WebView/WebViewActionExecutor.swift`
- `SnapTestSDK/Sources/SnapTestSDK/Screenshot/ScreenshotCapture.swift`
- `src/components/ConnectionSettings.tsx`
- `src/components/QRCodeDisplay.tsx`

**Net Change**: -350 lines (smaller, simpler codebase!)

---

### B. Dependencies Removed

```json
// FROM package.json
"appium": "^2.x.x",               // -15MB
"appium-xcuitest-driver": "^x.x", // -8MB
"appium-webdriveragent": "^x.x",  // -12MB

// Total savings: ~35MB in node_modules
```

---

### C. New SDK API Reference

```swift
// WebView Actions
WebViewActionExecutor.executeClick(selector:in:actionId:completion:)
WebViewActionExecutor.executeType(selector:text:in:actionId:completion:)
WebViewActionExecutor.executeScroll(direction:amount:in:completion:)
WebViewActionExecutor.waitForElement(selector:timeout:in:completion:)
WebViewActionExecutor.assertVisible(selector:in:completion:)

// WebView Inspection
WebViewInspector.findWebView(in:)
WebViewInspector.isWebView(_:)
WebViewInspector.findElementAtPoint(_:in:completion:)
WebViewInspector.getPageSource(from:completion:)

// Screenshot
ScreenshotCapture.captureScreen()
ScreenshotCapture.captureScreenAsBase64()
ScreenshotCapture.captureView(_:)
```

---

### D. Glossary

- **Appium**: Mobile automation framework requiring XCTest/WebDriverAgent (Mac-only)
- **Bonjour/mDNS**: Zero-configuration networking for auto-discovery
- **SDK**: SnapTest SDK embedded in iOS app for native automation
- **WebDriverAgent (WDA)**: Apple's UI testing framework (requires Xcode)
- **WKWebView**: iOS web view component for embedding web content
- **XCTest**: Apple's testing framework (macOS exclusive)

---

### E. FAQ

**Q: Can I still use Appium if I want?**
A: No, v2.0 removes Appium entirely. Use v1.x for Appium support (Mac only).

**Q: Will my existing test flows break?**
A: No! SDK execution was already preferred in v1.x. Your flows should work as-is.

**Q: Can I test Safari browser on Windows?**
A: No. Safari browser testing requires WebDriver on Mac. Use SDK for native/hybrid apps only.

**Q: What about Android support?**
A: Coming in Q1! Android SDK is in development.

**Q: Do I need to rebuild my iOS app?**
A: Yes, update to SnapTest SDK v2.x which includes WebView support.

**Q: Can I run desktop app on Mac?**
A: Yes! v2.0 works on both Windows and Mac.

**Q: How do I report bugs?**
A: Open an issue at [GitHub repo] with logs and device info.

---

## Conclusion

This migration represents a **strategic simplification** of SnapTest's architecture:

- **Before**: Complex, Mac-dependent, Appium-based, slow
- **After**: Simple, cross-platform, SDK-native, fast

The **80-120 hour investment** yields:
- ✅ Windows compatibility (expands user base)
- ✅ 50-100x performance improvement
- ✅ Simpler setup (no Xcode/WDA)
- ✅ Hybrid app support (WebView automation)
- ✅ Smaller codebase (-350 lines)

**Risk is LOW**, as SDK approach is already proven in production (lines 596-614 of current code).

**Ready to proceed?** Start with Phase 0 validation to confirm feasibility, then execute phases sequentially over 3 weeks.

---

**Document Version**: 1.0
**Last Updated**: 2025-12-30
**Owner**: Development Team
**Approver**: Technical Lead
