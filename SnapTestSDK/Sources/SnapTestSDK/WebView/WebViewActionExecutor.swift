import UIKit
import WebKit

/// Executes actions on elements within WKWebView via JavaScript injection
/// Supports click, type, scroll, wait, and assertions
public class WebViewActionExecutor {

    // MARK: - Click/Tap Actions

    /// Execute a tap/click on a web element
    /// - Parameters:
    ///   - selector: CSS selector or XPath
    ///   - webView: The WKWebView containing the element
    ///   - actionId: Optional action ID for logging
    ///   - completion: Callback with success status and optional error message
    public static func executeClick(
        selector: String,
        in webView: WKWebView,
        actionId: String? = nil,
        completion: @escaping (Bool, String?) -> Void
    ) {
        print("🌐 [WebViewActionExecutor] Executing click on: \(selector)")

        let findElementJS = buildFindElementJS(selector: selector)

        let js = """
        (function() {
            var element = \(findElementJS);
            if (!element) {
                return {success: false, error: 'Element not found: \(escapeJavaScript(selector))'};
            }

            // Scroll element into view
            element.scrollIntoView({behavior: 'smooth', block: 'center'});

            // Wait a bit for scroll to complete
            return new Promise(function(resolve) {
                setTimeout(function() {
                    // Trigger click event
                    element.click();

                    // Also dispatch mouse events for compatibility
                    var mouseEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    element.dispatchEvent(mouseEvent);

                    resolve({
                        success: true,
                        tagName: element.tagName,
                        text: (element.innerText || element.textContent || '').trim().substring(0, 50)
                    });
                }, 300);
            });
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            if let error = error {
                let errorMsg = "JavaScript error: \(error.localizedDescription)"
                print("❌ [WebViewActionExecutor] \(errorMsg)")
                completion(false, errorMsg)
                return
            }

            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool {
                if success {
                    let tagName = dict["tagName"] as? String ?? "unknown"
                    let text = dict["text"] as? String ?? ""
                    print("✅ [WebViewActionExecutor] Click succeeded on \(tagName): \(text)")
                    completion(true, nil)
                } else {
                    let errorMsg = dict["error"] as? String ?? "Unknown error"
                    print("❌ [WebViewActionExecutor] Click failed: \(errorMsg)")
                    completion(false, errorMsg)
                }
            } else {
                print("❌ [WebViewActionExecutor] Unexpected response format")
                completion(false, "Unexpected response format")
            }
        }
    }

    // MARK: - Type/Input Actions

    /// Type text into a web element (input, textarea, contenteditable)
    /// - Parameters:
    ///   - selector: CSS selector or XPath
    ///   - text: Text to type
    ///   - webView: The WKWebView containing the element
    ///   - actionId: Optional action ID for logging
    ///   - completion: Callback with success status and optional error message
    public static func executeType(
        selector: String,
        text: String,
        in webView: WKWebView,
        actionId: String? = nil,
        completion: @escaping (Bool, String?) -> Void
    ) {
        print("🌐 [WebViewActionExecutor] Executing type '\(text)' into: \(selector)")

        let escapedText = escapeJavaScript(text)
        let findElementJS = buildFindElementJS(selector: selector)

        let js = """
        (function() {
            var element = \(findElementJS);
            if (!element) {
                return {success: false, error: 'Element not found: \(escapeJavaScript(selector))'};
            }

            // Scroll into view
            element.scrollIntoView({behavior: 'smooth', block: 'center'});

            return new Promise(function(resolve) {
                setTimeout(function() {
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

                    // For React inputs, set the value property directly
                    var descriptor = Object.getOwnPropertyDescriptor(
                        element.constructor.prototype,
                        element.tagName === 'TEXTAREA' ? 'value' : 'value'
                    );
                    if (descriptor && descriptor.set) {
                        descriptor.set.call(element, '\(escapedText)');
                    }

                    resolve({success: true, value: element.value || element.textContent});
                }, 300);
            });
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            if let error = error {
                let errorMsg = "JavaScript error: \(error.localizedDescription)"
                print("❌ [WebViewActionExecutor] \(errorMsg)")
                completion(false, errorMsg)
                return
            }

            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool {
                if success {
                    let value = dict["value"] as? String ?? ""
                    print("✅ [WebViewActionExecutor] Type succeeded, value: \(value)")
                    completion(true, nil)
                } else {
                    let errorMsg = dict["error"] as? String ?? "Unknown error"
                    print("❌ [WebViewActionExecutor] Type failed: \(errorMsg)")
                    completion(false, errorMsg)
                }
            } else {
                print("❌ [WebViewActionExecutor] Unexpected response format")
                completion(false, "Unexpected response")
            }
        }
    }

    // MARK: - Scroll Actions

    /// Scroll within the WebView
    /// - Parameters:
    ///   - direction: Scroll direction ("up", "down", "left", "right")
    ///   - amount: Scroll amount as fraction of viewport (default 0.8)
    ///   - webView: The WKWebView to scroll
    ///   - completion: Callback with success status and optional error message
    public static func executeScroll(
        direction: String,
        amount: CGFloat = 0.8,
        in webView: WKWebView,
        completion: @escaping (Bool, String?) -> Void
    ) {
        print("🌐 [WebViewActionExecutor] Executing scroll: \(direction)")

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
            print("❌ [WebViewActionExecutor] Invalid direction: \(direction)")
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
            if let error = error {
                print("❌ [WebViewActionExecutor] Scroll failed: \(error.localizedDescription)")
                completion(false, error.localizedDescription)
            } else {
                print("✅ [WebViewActionExecutor] Scroll succeeded")
                completion(true, nil)
            }
        }
    }

    /// Scroll element into view
    /// - Parameters:
    ///   - selector: CSS selector or XPath
    ///   - webView: The WKWebView containing the element
    ///   - completion: Callback with success status and optional error message
    public static func scrollToElement(
        selector: String,
        in webView: WKWebView,
        completion: @escaping (Bool, String?) -> Void
    ) {
        print("🌐 [WebViewActionExecutor] Scrolling to element: \(selector)")

        let findElementJS = buildFindElementJS(selector: selector)

        let js = """
        (function() {
            var element = \(findElementJS);
            if (!element) {
                return {success: false, error: 'Element not found: \(escapeJavaScript(selector))'};
            }

            element.scrollIntoView({behavior: 'smooth', block: 'center'});
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

    // MARK: - Wait Actions

    /// Wait for element to appear in DOM
    /// - Parameters:
    ///   - selector: CSS selector or XPath
    ///   - timeout: Maximum time to wait in seconds (default 10)
    ///   - webView: The WKWebView to search
    ///   - completion: Callback with success status and optional error message
    public static func waitForElement(
        selector: String,
        timeout: TimeInterval = 10.0,
        in webView: WKWebView,
        completion: @escaping (Bool, String?) -> Void
    ) {
        print("🌐 [WebViewActionExecutor] Waiting for element: \(selector) (timeout: \(timeout)s)")

        let findElementJS = buildFindElementJS(selector: selector)

        let js = """
        new Promise(function(resolve) {
            var startTime = Date.now();
            var checkInterval = setInterval(function() {
                var element = \(findElementJS);
                var elapsed = Date.now() - startTime;

                if (element) {
                    clearInterval(checkInterval);
                    resolve({success: true, found: true, elapsed: elapsed});
                } else if (elapsed > \(timeout * 1000)) {
                    clearInterval(checkInterval);
                    resolve({success: false, error: 'Timeout waiting for element: \(escapeJavaScript(selector))'});
                }
            }, 100);
        })
        """

        webView.evaluateJavaScript(js) { result, error in
            if let error = error {
                print("❌ [WebViewActionExecutor] Wait failed: \(error.localizedDescription)")
                completion(false, error.localizedDescription)
                return
            }

            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool {
                if success {
                    let elapsed = dict["elapsed"] as? Double ?? 0
                    print("✅ [WebViewActionExecutor] Element found after \(Int(elapsed))ms")
                    completion(true, nil)
                } else {
                    let errorMsg = dict["error"] as? String ?? "Timeout"
                    print("❌ [WebViewActionExecutor] Wait failed: \(errorMsg)")
                    completion(false, errorMsg)
                }
            } else {
                completion(false, "Unexpected response")
            }
        }
    }

    // MARK: - Assertion Actions

    /// Assert element is visible
    /// - Parameters:
    ///   - selector: CSS selector or XPath
    ///   - webView: The WKWebView to search
    ///   - completion: Callback with success status and optional error message
    public static func assertVisible(
        selector: String,
        in webView: WKWebView,
        completion: @escaping (Bool, String?) -> Void
    ) {
        print("🌐 [WebViewActionExecutor] Asserting visible: \(selector)")

        let findElementJS = buildFindElementJS(selector: selector)

        let js = """
        (function() {
            var element = \(findElementJS);
            if (!element) {
                return {success: false, error: 'Element not found: \(escapeJavaScript(selector))'};
            }

            var rect = element.getBoundingClientRect();
            var style = window.getComputedStyle(element);
            var isVisible = rect.width > 0 && rect.height > 0 &&
                           style.visibility !== 'hidden' &&
                           style.display !== 'none' &&
                           style.opacity !== '0';

            return {
                success: isVisible,
                error: isVisible ? null : 'Element is not visible',
                bounds: {x: rect.left, y: rect.top, width: rect.width, height: rect.height}
            };
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            if let error = error {
                completion(false, error.localizedDescription)
                return
            }

            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool {
                if success {
                    print("✅ [WebViewActionExecutor] Element is visible")
                    completion(true, nil)
                } else {
                    let errorMsg = dict["error"] as? String ?? "Not visible"
                    print("❌ [WebViewActionExecutor] Assertion failed: \(errorMsg)")
                    completion(false, errorMsg)
                }
            } else {
                completion(false, "Unexpected response")
            }
        }
    }

    /// Assert element has text
    /// - Parameters:
    ///   - selector: CSS selector or XPath
    ///   - expectedText: Expected text content
    ///   - webView: The WKWebView to search
    ///   - completion: Callback with success status and optional error message
    public static func assertText(
        selector: String,
        expectedText: String,
        in webView: WKWebView,
        completion: @escaping (Bool, String?) -> Void
    ) {
        print("🌐 [WebViewActionExecutor] Asserting text '\(expectedText)' in: \(selector)")

        let findElementJS = buildFindElementJS(selector: selector)
        let escapedExpected = escapeJavaScript(expectedText)

        let js = """
        (function() {
            var element = \(findElementJS);
            if (!element) {
                return {success: false, error: 'Element not found: \(escapeJavaScript(selector))'};
            }

            var actualText = (element.innerText || element.textContent || '').trim();
            var expectedText = '\(escapedExpected)';
            var matches = actualText.includes(expectedText);

            return {
                success: matches,
                error: matches ? null : 'Text mismatch. Expected: "' + expectedText + '", Actual: "' + actualText + '"',
                actualText: actualText
            };
        })()
        """

        webView.evaluateJavaScript(js) { result, error in
            if let error = error {
                completion(false, error.localizedDescription)
                return
            }

            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool {
                if success {
                    print("✅ [WebViewActionExecutor] Text assertion passed")
                    completion(true, nil)
                } else {
                    let errorMsg = dict["error"] as? String ?? "Text mismatch"
                    print("❌ [WebViewActionExecutor] \(errorMsg)")
                    completion(false, errorMsg)
                }
            } else {
                completion(false, "Unexpected response")
            }
        }
    }

    // MARK: - Helper Methods

    /// Build JavaScript code to find element by CSS selector or XPath
    /// - Parameter selector: CSS selector or XPath
    /// - Returns: JavaScript code snippet that returns the element
    private static func buildFindElementJS(selector: String) -> String {
        if selector.hasPrefix("#") || selector.hasPrefix(".") || selector.contains("[") {
            // CSS selector
            return "document.querySelector('\(escapeJavaScript(selector))')"
        } else if selector.hasPrefix("//") {
            // XPath selector
            return """
            document.evaluate(
                '\(escapeJavaScript(selector))',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue
            """
        } else {
            // Assume CSS selector
            return "document.querySelector('\(escapeJavaScript(selector))')"
        }
    }

    /// Escape string for safe JavaScript injection
    /// - Parameter string: String to escape
    /// - Returns: Escaped string safe for JavaScript
    private static func escapeJavaScript(_ string: String) -> String {
        return string
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
            .replacingOccurrences(of: "\t", with: "\\t")
    }

    // MARK: - Advanced Actions

    /// Get element value (for inputs, selects, textareas)
    /// - Parameters:
    ///   - selector: CSS selector or XPath
    ///   - webView: The WKWebView to search
    ///   - completion: Callback with value or error message
    public static func getValue(
        selector: String,
        from webView: WKWebView,
        completion: @escaping (String?, String?) -> Void
    ) {
        let findElementJS = buildFindElementJS(selector: selector)

        let js = """
        (function() {
            var element = \(findElementJS);
            if (!element) {
                return {success: false, error: 'Element not found'};
            }
            return {success: true, value: element.value || element.textContent || ''};
        })()
        """

        webView.evaluateJavaScript(js, completionHandler: { result, error in
            if let error = error {
                completion(nil, error.localizedDescription)
                return
            }

            if let dict = result as? [String: Any],
               let success = dict["success"] as? Bool,
               success,
               let value = dict["value"] as? String {
                completion(value, nil)
            } else if let dict = result as? [String: Any],
                      let errorMsg = dict["error"] as? String {
                completion(nil, errorMsg)
            } else {
                completion(nil, "Failed to get value")
            }
        })
    }

    /// Execute custom JavaScript in webView
    /// - Parameters:
    ///   - script: JavaScript code to execute
    ///   - webView: The WKWebView
    ///   - completion: Callback with result or error
    public static func executeCustomJavaScript(
        script: String,
        in webView: WKWebView,
        completion: @escaping (Any?, String?) -> Void
    ) {
        print("🌐 [WebViewActionExecutor] Executing custom JavaScript")

        webView.evaluateJavaScript(script) { result, error in
            if let error = error {
                completion(nil, error.localizedDescription)
            } else {
                completion(result, nil)
            }
        }
    }
}
