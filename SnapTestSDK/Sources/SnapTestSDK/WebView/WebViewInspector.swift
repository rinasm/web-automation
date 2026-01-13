import UIKit
import WebKit

/// Inspects and detects WKWebView elements within the app
/// Provides JavaScript-based element detection and information extraction
public class WebViewInspector {

    // MARK: - WebView Detection

    /// Check if a view is a WKWebView
    /// - Parameter view: The view to check
    /// - Returns: True if the view is a WKWebView
    public static func isWebView(_ view: UIView) -> Bool {
        return view is WKWebView
    }

    /// Find the first WKWebView in the view hierarchy starting from a window
    /// - Parameter window: The window to search in
    /// - Returns: The first WKWebView found, or nil
    public static func findWebView(in window: UIWindow) -> WKWebView? {
        return findWebView(in: window as UIView)
    }

    /// Find all WKWebViews in the view hierarchy
    /// - Parameter window: The window to search in
    /// - Returns: Array of all WKWebViews found
    public static func findAllWebViews(in window: UIWindow) -> [WKWebView] {
        var webViews: [WKWebView] = []
        collectWebViews(in: window, into: &webViews)
        return webViews
    }

    /// Recursively find WKWebView in view hierarchy
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

    /// Recursively collect all WKWebViews
    private static func collectWebViews(in view: UIView, into webViews: inout [WKWebView]) {
        if let webView = view as? WKWebView {
            webViews.append(webView)
        }
        for subview in view.subviews {
            collectWebViews(in: subview, into: &webViews)
        }
    }

    // MARK: - Coordinate Conversion

    /// Convert screen coordinates to web view coordinates
    /// - Parameters:
    ///   - screenPoint: Point in screen coordinate space
    ///   - webView: The target webView
    ///   - window: The window containing the webView
    /// - Returns: Point in webView's coordinate space
    public static func screenToWebCoordinates(
        screenPoint: CGPoint,
        webView: WKWebView,
        window: UIWindow
    ) -> CGPoint {
        // Convert from window coordinates to webView coordinates
        let pointInWebView = webView.convert(screenPoint, from: window)

        // Account for scroll offset
        let scrollView = webView.scrollView
        let adjustedPoint = CGPoint(
            x: pointInWebView.x + scrollView.contentOffset.x,
            y: pointInWebView.y + scrollView.contentOffset.y
        )

        print("🌐 [WebViewInspector] Coordinate conversion:")
        print("   Screen: (\(screenPoint.x), \(screenPoint.y))")
        print("   WebView: (\(pointInWebView.x), \(pointInWebView.y))")
        print("   Adjusted for scroll: (\(adjustedPoint.x), \(adjustedPoint.y))")

        return adjustedPoint
    }

    // MARK: - Element Detection

    /// Find DOM element at given coordinates in webView
    /// - Parameters:
    ///   - point: Point in webView's coordinate space
    ///   - webView: The WKWebView to search in
    ///   - completion: Callback with found WebElement or nil
    public static func findElementAtPoint(
        _ point: CGPoint,
        in webView: WKWebView,
        completion: @escaping (WebElement?) -> Void
    ) {
        print("🌐 [WebViewInspector] Finding element at point: (\(point.x), \(point.y))")

        let js = """
        (function() {
            var element = document.elementFromPoint(\(point.x), \(point.y));
            if (!element) return null;

            // Helper: Generate XPath for element
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

            // Helper: Generate CSS selector for element
            function getCSSSelector(el) {
                if (el.id) return '#' + el.id;

                var path = [];
                while (el && el.nodeType === Node.ELEMENT_NODE) {
                    var selector = el.nodeName.toLowerCase();

                    if (el.className && typeof el.className === 'string') {
                        var classes = el.className.trim().split(/\\s+/);
                        if (classes.length > 0 && classes[0]) {
                            selector += '.' + classes.join('.');
                        }
                    }

                    // Make selector more specific if needed
                    if (el.parentNode) {
                        var siblings = Array.from(el.parentNode.children).filter(function(sibling) {
                            return sibling.nodeName === el.nodeName;
                        });
                        if (siblings.length > 1) {
                            var index = siblings.indexOf(el) + 1;
                            selector += ':nth-of-type(' + index + ')';
                        }
                    }

                    path.unshift(selector);

                    // Stop at ID or if we have enough specificity
                    if (el.id || path.length > 3) break;

                    el = el.parentNode;
                }

                return path.join(' > ');
            }

            // Helper: Get visible text content
            function getVisibleText(el) {
                var text = '';

                // For input elements, get value or placeholder
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    text = el.value || el.placeholder || '';
                }
                // For buttons and links, get text content
                else if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                    text = el.textContent || el.innerText || '';
                }
                // For other elements, get inner text
                else {
                    text = el.innerText || el.textContent || '';
                }

                // Trim and limit length
                text = text.trim();
                if (text.length > 100) {
                    text = text.substring(0, 100) + '...';
                }

                return text;
            }

            // Helper: Check if element is clickable
            function isClickable(el) {
                // Standard clickable elements
                if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
                    return true;
                }

                // Elements with click handlers
                if (el.onclick !== null) {
                    return true;
                }

                // Elements with role=button
                if (el.getAttribute('role') === 'button') {
                    return true;
                }

                // Elements with cursor:pointer
                var style = window.getComputedStyle(el);
                if (style.cursor === 'pointer') {
                    return true;
                }

                return false;
            }

            // Helper: Check if element is editable
            function isEditable(el) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    return true;
                }
                if (el.isContentEditable) {
                    return true;
                }
                return false;
            }

            // Get bounding rectangle
            var rect = element.getBoundingClientRect();

            // Build element info object
            return {
                tagName: element.tagName.toLowerCase(),
                id: element.id || '',
                className: element.className || '',
                name: element.name || '',
                text: getVisibleText(element),
                value: element.value || '',
                placeholder: element.placeholder || '',
                type: element.type || '',
                href: element.href || '',
                ariaLabel: element.getAttribute('aria-label') || '',
                xpath: getXPath(element),
                cssSelector: getCSSSelector(element),
                bounds: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                },
                isClickable: isClickable(element),
                isEditable: isEditable(element),
                isVisible: rect.width > 0 && rect.height > 0 &&
                          window.getComputedStyle(element).visibility !== 'hidden' &&
                          window.getComputedStyle(element).display !== 'none'
            };
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            guard error == nil,
                  let dict = result as? [String: Any] else {
                if let error = error {
                    print("❌ [WebViewInspector] JavaScript error: \(error.localizedDescription)")
                }
                completion(nil)
                return
            }

            let element = WebElement(from: dict)
            print("✅ [WebViewInspector] Found element: \(element.tagName) - \(element.cssSelector)")
            print("   Text: \(element.text)")
            print("   XPath: \(element.xpath)")
            completion(element)
        }
    }

    // MARK: - Page Information

    /// Get full page source HTML from webView
    /// - Parameters:
    ///   - webView: The WKWebView to extract HTML from
    ///   - completion: Callback with HTML string or nil
    public static func getPageSource(
        from webView: WKWebView,
        completion: @escaping (String?) -> Void
    ) {
        let js = "document.documentElement.outerHTML"
        webView.evaluateJavaScript(js) { result, error in
            if let html = result as? String {
                print("✅ [WebViewInspector] Retrieved page source (\(html.count) characters)")
                completion(html)
            } else {
                if let error = error {
                    print("❌ [WebViewInspector] Failed to get page source: \(error.localizedDescription)")
                }
                completion(nil)
            }
        }
    }

    /// Get page URL from webView
    /// - Parameter webView: The WKWebView
    /// - Returns: Current page URL or nil
    public static func getPageURL(from webView: WKWebView) -> String? {
        return webView.url?.absoluteString
    }

    /// Get page title from webView
    /// - Parameters:
    ///   - webView: The WKWebView
    ///   - completion: Callback with title string or nil
    public static func getPageTitle(
        from webView: WKWebView,
        completion: @escaping (String?) -> Void
    ) {
        let js = "document.title"
        webView.evaluateJavaScript(js) { result, error in
            completion(result as? String)
        }
    }

    /// Get all interactable elements in the page
    /// - Parameters:
    ///   - webView: The WKWebView to search
    ///   - completion: Callback with array of WebElements
    public static func getAllInteractableElements(
        from webView: WKWebView,
        completion: @escaping ([WebElement]) -> Void
    ) {
        let js = """
        (function() {
            var elements = [];
            var selectors = [
                'a', 'button', 'input', 'select', 'textarea',
                '[onclick]', '[role="button"]', '[tabindex]'
            ];

            selectors.forEach(function(selector) {
                var found = document.querySelectorAll(selector);
                found.forEach(function(el) {
                    if (elements.indexOf(el) === -1) {
                        elements.push(el);
                    }
                });
            });

            return elements.map(function(el, index) {
                var rect = el.getBoundingClientRect();
                return {
                    index: index,
                    tagName: el.tagName.toLowerCase(),
                    id: el.id || '',
                    className: el.className || '',
                    text: (el.innerText || el.textContent || '').trim().substring(0, 50),
                    bounds: {
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height
                    }
                };
            });
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            guard error == nil,
                  let array = result as? [[String: Any]] else {
                print("❌ [WebViewInspector] Failed to get interactable elements")
                completion([])
                return
            }

            let elements = array.compactMap { dict -> WebElement? in
                return WebElement(from: dict)
            }

            print("✅ [WebViewInspector] Found \(elements.count) interactable elements")
            completion(elements)
        }
    }
}

// MARK: - WebElement Model

/// Represents a DOM element in a WKWebView
public struct WebElement {
    public let tagName: String
    public let id: String
    public let className: String
    public let name: String
    public let text: String
    public let value: String
    public let placeholder: String
    public let type: String
    public let href: String
    public let ariaLabel: String
    public let xpath: String
    public let cssSelector: String
    public let bounds: CGRect
    public let isClickable: Bool
    public let isEditable: Bool
    public let isVisible: Bool

    /// Initialize from JavaScript result dictionary
    init(from dict: [String: Any]) {
        self.tagName = dict["tagName"] as? String ?? ""
        self.id = dict["id"] as? String ?? ""
        self.className = dict["className"] as? String ?? ""
        self.name = dict["name"] as? String ?? ""
        self.text = dict["text"] as? String ?? ""
        self.value = dict["value"] as? String ?? ""
        self.placeholder = dict["placeholder"] as? String ?? ""
        self.type = dict["type"] as? String ?? ""
        self.href = dict["href"] as? String ?? ""
        self.ariaLabel = dict["ariaLabel"] as? String ?? ""
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
        self.isVisible = dict["isVisible"] as? Bool ?? true
    }

    /// Get preferred selector (ID > class > XPath)
    public var preferredSelector: String {
        if !id.isEmpty {
            return "#\(id)"
        } else if !className.isEmpty && !className.contains(" ") {
            return ".\(className)"
        } else if !cssSelector.isEmpty {
            return cssSelector
        } else {
            return xpath
        }
    }
}
