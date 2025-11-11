import UIKit

// MARK: - TouchEventCaptureDelegate

protocol TouchEventCaptureDelegate: AnyObject {
    func didCaptureTouchEvent(_ event: TouchEvent)
}

// MARK: - TouchEventCapture

/// Captures touch events from the application using UIWindow gesture recognizers
class TouchEventCapture: NSObject, UITextFieldDelegate {

    weak var delegate: TouchEventCaptureDelegate?

    private var isCapturing: Bool = false
    private var gestureRecognizers: [UIGestureRecognizer] = []

    // Long press tracking
    private var longPressTimer: Timer?
    private var longPressTriggerred: Bool = false

    // Swipe tracking
    private var swipeStartPoint: CGPoint?
    private var swipeStartTime: TimeInterval?

    // Text field tracking
    private var observingTextFields: [UITextField] = []
    private var observingTextViews: [UITextView] = []
    private var textFieldInitialValues: [UITextField: String] = [:]
    private var textViewInitialValues: [UITextView: String] = [:]

    // Store original delegates to restore later
    private var textFieldOriginalDelegates: [UITextField: UITextFieldDelegate?] = [:]

    // SwiftUI text field tracking (views that wrap SwiftUI TextFields)
    private var observingSwiftUITextFields: [WeakViewWrapper] = []
    private var swiftUITextFieldValues: [String: String] = [:] // key: view's memory address
    private var keyboardPollingTimer: Timer?

    // MARK: - Capture Control

    func startCapturing() {
        guard !isCapturing else { return }

        print("👆 [TouchEventCapture] Starting capture...")
        isCapturing = true

        // Add gesture recognizers to all windows
        DispatchQueue.main.async { [weak self] in
            self?.installGestureRecognizers()
            self?.startObservingTextFields()
            self?.startObservingAccessibility()

            // CRITICAL: Check for alerts IMMEDIATELY on start
            // Keyboard might already be open when recording starts!
            self?.checkForAlertControllers()

            // CRITICAL: Capture any text that's already typed
            // User might have started typing BEFORE starting recording
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self?.captureExistingTextFieldValues()
            }
        }

        // SIMPLE POLLING: Check ALL text fields every 0.5 seconds
        // This captures ANY text changes, regardless of notifications
        Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] timer in
            guard let self = self, self.isCapturing else {
                timer.invalidate()
                return
            }

            DispatchQueue.main.async {
                // Scan for new text fields
                self.refreshTextFieldObservation()

                // Check EVERY text field for value changes
                self.pollAllTextFields()
            }
        }
    }

    func stopCapturing() {
        guard isCapturing else { return }

        print("👆 [TouchEventCapture] Stopping capture...")
        isCapturing = false

        // Remove gesture recognizers and text field observers
        DispatchQueue.main.async { [weak self] in
            self?.removeGestureRecognizers()
            self?.stopObservingTextFields()
            self?.stopObservingAccessibility()
        }
    }

    // MARK: - Gesture Recognizer Installation

    private func installGestureRecognizers() {
        guard let windows = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows }) as? [UIWindow], !windows.isEmpty else {
            print("⚠️ [TouchEventCapture] No windows found")
            return
        }

        for window in windows {
            // Tap recognizer
            let tapRecognizer = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
            tapRecognizer.delegate = self
            tapRecognizer.cancelsTouchesInView = false
            window.addGestureRecognizer(tapRecognizer)
            gestureRecognizers.append(tapRecognizer)

            // Long press recognizer
            let longPressRecognizer = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress(_:)))
            longPressRecognizer.delegate = self
            longPressRecognizer.minimumPressDuration = 0.5
            longPressRecognizer.cancelsTouchesInView = false
            window.addGestureRecognizer(longPressRecognizer)
            gestureRecognizers.append(longPressRecognizer)

            // Pan recognizer (for swipes)
            let panRecognizer = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
            panRecognizer.delegate = self
            panRecognizer.cancelsTouchesInView = false
            window.addGestureRecognizer(panRecognizer)
            gestureRecognizers.append(panRecognizer)
        }

        print("👆 [TouchEventCapture] Installed gesture recognizers on \(windows.count) windows")
    }

    private func removeGestureRecognizers() {
        for recognizer in gestureRecognizers {
            recognizer.view?.removeGestureRecognizer(recognizer)
        }
        gestureRecognizers.removeAll()

        print("👆 [TouchEventCapture] Removed gesture recognizers")
    }

    // MARK: - Gesture Handlers

    @objc private func handleTap(_ recognizer: UITapGestureRecognizer) {
        guard isCapturing, !longPressTriggerred else {
            longPressTriggerred = false
            return
        }

        let location = recognizer.location(in: recognizer.view)
        let hitView = recognizer.view?.hitTest(location, with: nil)

        print("👆 [TouchEventCapture] Tap at \(location)")

        // Get element info
        let elementInfo = hitView.map { ViewHierarchyInspector.getElementInfo(for: $0) }

        // Create touch event
        let event = TouchEvent(
            gestureType: "tap",
            coordinates: location,
            element: elementInfo,
            duration: 100
        )

        delegate?.didCaptureTouchEvent(event)
    }

    @objc private func handleLongPress(_ recognizer: UILongPressGestureRecognizer) {
        guard isCapturing else { return }

        if recognizer.state == .began {
            longPressTriggerred = true

            let location = recognizer.location(in: recognizer.view)
            let hitView = recognizer.view?.hitTest(location, with: nil)

            print("👆 [TouchEventCapture] Long press at \(location)")

            // Get element info
            let elementInfo = hitView.map { ViewHierarchyInspector.getElementInfo(for: $0) }

            // Create touch event
            let event = TouchEvent(
                gestureType: "longPress",
                coordinates: location,
                element: elementInfo,
                duration: 1000
            )

            delegate?.didCaptureTouchEvent(event)
        }
    }

    @objc private func handlePan(_ recognizer: UIPanGestureRecognizer) {
        guard isCapturing else { return }

        switch recognizer.state {
        case .began:
            swipeStartPoint = recognizer.location(in: recognizer.view)
            swipeStartTime = Date().timeIntervalSince1970

        case .ended, .cancelled:
            guard let startPoint = swipeStartPoint,
                  let startTime = swipeStartTime else { return }

            let endPoint = recognizer.location(in: recognizer.view)
            let endTime = Date().timeIntervalSince1970

            let deltaX = endPoint.x - startPoint.x
            let deltaY = endPoint.y - startPoint.y
            let duration = Int((endTime - startTime) * 1000)

            // Determine swipe direction
            let direction: String
            if abs(deltaX) > abs(deltaY) {
                direction = deltaX > 0 ? "right" : "left"
            } else {
                direction = deltaY > 0 ? "down" : "up"
            }

            // Only record if significant movement
            let distance = sqrt(deltaX * deltaX + deltaY * deltaY)
            guard distance > 50 else {
                swipeStartPoint = nil
                swipeStartTime = nil
                return
            }

            print("👆 [TouchEventCapture] Swipe \(direction) from \(startPoint) to \(endPoint)")

            let hitView = recognizer.view?.hitTest(startPoint, with: nil)
            let elementInfo = hitView.map { ViewHierarchyInspector.getElementInfo(for: $0) }

            // Create touch event
            let event = TouchEvent(
                gestureType: "swipe",
                coordinates: startPoint,
                element: elementInfo,
                duration: duration,
                swipeDirection: direction
            )

            delegate?.didCaptureTouchEvent(event)

            swipeStartPoint = nil
            swipeStartTime = nil

        default:
            break
        }
    }
}

// MARK: - UIGestureRecognizerDelegate

extension TouchEventCapture: UIGestureRecognizerDelegate {
    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        // Allow simultaneous recognition with other gestures
        return true
    }

    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldReceive touch: UITouch
    ) -> Bool {
        // Always receive touches (don't interfere with app's gestures)
        return true
    }
}

// MARK: - Text Field Observation

extension TouchEventCapture {

    /// Start observing text fields in all windows
    private func startObservingTextFields() {
        // Find all text fields and text views in the window hierarchy
        guard let windows = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows }) as? [UIWindow], !windows.isEmpty else {
            print("⚠️ [TouchEventCapture] No windows found for text field observation")
            return
        }

        for window in windows {
            findAndObserveTextFields(in: window)
        }

        print("👆 [TouchEventCapture] Observing \(observingTextFields.count) text fields and \(observingTextViews.count) text views")
    }

    /// Refresh text field observation (find new text fields)
    private func refreshTextFieldObservation() {
        guard let windows = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows }) as? [UIWindow], !windows.isEmpty else {
            return
        }

        let previousCount = observingTextFields.count + observingTextViews.count

        for window in windows {
            findAndObserveTextFields(in: window)
        }

        // CRITICAL: Always check for alert controllers on every refresh
        // This ensures we catch UIAlertController even if keyboard notification didn't fire
        checkForAlertControllers()

        let newCount = observingTextFields.count + observingTextViews.count
        if newCount > previousCount {
            print("👆 [TouchEventCapture] Found \(newCount - previousCount) new text fields. Total: \(newCount)")
            print("👆 [TouchEventCapture] Now observing \(observingTextFields.count) UITextFields and \(observingTextViews.count) UITextViews")
        }
    }

    /// Check for UIAlertController text fields (SwiftUI alerts)
    private func checkForAlertControllers() {
        // Find the topmost view controller
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
            print("⚠️ [TouchEventCapture] No window scene found")
            return
        }

        // Check ALL windows, not just key window
        for window in scene.windows {
            guard let rootVC = window.rootViewController else { continue }

            // Print view controller hierarchy for debugging
            var topVC = rootVC
            var vcHierarchy = [String(describing: type(of: topVC))]

            while let presented = topVC.presentedViewController {
                topVC = presented
                vcHierarchy.append(String(describing: type(of: topVC)))
            }

            // Debug: Print the hierarchy
            if vcHierarchy.count > 1 {
                print("👆 [TouchEventCapture] VC Hierarchy: \(vcHierarchy.joined(separator: " -> "))")
            }

            // Check if it's an alert controller
            if let alertController = topVC as? UIAlertController {
                print("👆 [TouchEventCapture] ⚠️⚠️⚠️ FOUND UIAlertController! ⚠️⚠️⚠️")
                print("👆 [TouchEventCapture] Alert title: \(alertController.title ?? "no title")")
                print("👆 [TouchEventCapture] Alert message: \(alertController.message ?? "no message")")
                print("👆 [TouchEventCapture] Alert has \(alertController.textFields?.count ?? 0) text fields")

                // Directly observe alert's text fields
                if let textFields = alertController.textFields {
                    for textField in textFields {
                        // Check if already observing
                        guard !observingTextFields.contains(where: { $0 === textField }) else {
                            print("👆 [TouchEventCapture] Already observing this text field")
                            continue
                        }

                        print("👆 [TouchEventCapture] ✅ OBSERVING ALERT TEXT FIELD: \(textField.placeholder ?? "no placeholder")")
                        observingTextFields.append(textField)
                        textFieldInitialValues[textField] = textField.text ?? ""

                        // Set ourselves as delegate to capture EVERY keystroke
                        textFieldOriginalDelegates[textField] = textField.delegate
                        textField.delegate = self

                        // Add observers
                        NotificationCenter.default.addObserver(
                            self,
                            selector: #selector(textFieldDidChange(_:)),
                            name: UITextField.textDidChangeNotification,
                            object: textField
                        )

                        NotificationCenter.default.addObserver(
                            self,
                            selector: #selector(textFieldDidEndEditingNotification(_:)),
                            name: UITextField.textDidEndEditingNotification,
                            object: textField
                        )
                    }
                } else {
                    print("👆 [TouchEventCapture] ❌ Alert has NO textFields property")
                }

                // Also scan the view hierarchy (for good measure)
                findAndObserveTextFields(in: alertController.view)
                return // Found it, stop looking
            }
        }
    }

    /// Stop observing all text fields
    private func stopObservingTextFields() {
        // Restore original delegates
        for (textField, originalDelegate) in textFieldOriginalDelegates {
            textField.delegate = originalDelegate
        }
        textFieldOriginalDelegates.removeAll()

        // Remove all text field observers
        NotificationCenter.default.removeObserver(self, name: UITextField.textDidEndEditingNotification, object: nil)
        NotificationCenter.default.removeObserver(self, name: UITextField.textDidChangeNotification, object: nil)
        NotificationCenter.default.removeObserver(self, name: UITextView.textDidEndEditingNotification, object: nil)
        NotificationCenter.default.removeObserver(self, name: UITextView.textDidChangeNotification, object: nil)

        observingTextFields.removeAll()
        observingTextViews.removeAll()
        textFieldInitialValues.removeAll()
        textViewInitialValues.removeAll()

        print("👆 [TouchEventCapture] Stopped observing text fields")
    }

    /// Recursively find text fields in view hierarchy
    private func findAndObserveTextFields(in view: UIView) {
        // Check if this view is a text field
        if let textField = view as? UITextField {
            // Skip if already observing this text field
            guard !observingTextFields.contains(where: { $0 === textField }) else {
                // Recursively check subviews
                for subview in view.subviews {
                    findAndObserveTextFields(in: subview)
                }
                return
            }

            observingTextFields.append(textField)
            textFieldInitialValues[textField] = textField.text ?? ""

            // Set ourselves as delegate to capture EVERY keystroke
            textFieldOriginalDelegates[textField] = textField.delegate
            textField.delegate = self

            // Add observer for text changes (real-time)
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(textFieldDidChange(_:)),
                name: UITextField.textDidChangeNotification,
                object: textField
            )

            // Add observer for text did end editing
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(textFieldDidEndEditingNotification(_:)),
                name: UITextField.textDidEndEditingNotification,
                object: textField
            )

            print("👆 [TouchEventCapture] Observing UIKit text field: \(String(describing: type(of: textField))) - \(textField.placeholder ?? "no placeholder")")
        }

        // Check if this view is a text view
        if let textView = view as? UITextView {
            // Skip if already observing this text view
            guard !observingTextViews.contains(where: { $0 === textView }) else {
                // Recursively check subviews
                for subview in view.subviews {
                    findAndObserveTextFields(in: subview)
                }
                return
            }

            observingTextViews.append(textView)
            textViewInitialValues[textView] = textView.text ?? ""

            // Add observer for text changes (real-time)
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(textViewDidChange(_:)),
                name: UITextView.textDidChangeNotification,
                object: textView
            )

            // Add observer for text did end editing
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(textViewDidEndEditing(_:)),
                name: UITextView.textDidEndEditingNotification,
                object: textView
            )

            print("👆 [TouchEventCapture] Observing text view: \(String(describing: type(of: textView)))")
        }

        // SWIFTUI SUPPORT: Check for SwiftUI text fields using accessibility
        // SwiftUI TextFields are wrapped in UIKit views but don't expose UITextField directly
        // We can detect them by their accessibility traits
        if view.accessibilityTraits.contains(.searchField) || view.accessibilityTraits.contains(.keyboardKey) {
            // This might be a SwiftUI TextField
            print("👆 [TouchEventCapture] Found potential SwiftUI text field via accessibility: \(view.accessibilityIdentifier ?? "no ID") - \(view.accessibilityLabel ?? "no label")")
        }

        // Check if view class name suggests it's a SwiftUI TextField wrapper
        let className = String(describing: type(of: view))
        if className.contains("TextField") || className.contains("TextEditor") {
            print("👆 [TouchEventCapture] Found potential SwiftUI text field wrapper: \(className)")
        }

        // Recursively check subviews
        for subview in view.subviews {
            findAndObserveTextFields(in: subview)
        }
    }

    /// Handle text field change (real-time as user types)
    @objc private func textFieldDidChange(_ notification: Notification) {
        guard isCapturing, let textField = notification.object as? UITextField else { return }

        let newText = textField.text ?? ""
        let oldText = textFieldInitialValues[textField] ?? ""

        // Only capture if text changed
        guard newText != oldText else { return }

        print("👆 [TouchEventCapture] Text field changing: \"\(oldText)\" -> \"\(newText)\"")

        // Update initial value for next comparison
        textFieldInitialValues[textField] = newText

        // Don't send event on every keystroke - wait for editing to end
        // This prevents too many events
    }

    /// Handle text field editing completion (notification handler)
    @objc private func textFieldDidEndEditingNotification(_ notification: Notification) {
        print("🔔 [TouchEventCapture] textFieldDidEndEditingNotification received!")

        guard isCapturing else {
            print("⚠️ [TouchEventCapture] Not capturing, ignoring text field event")
            return
        }

        guard let textField = notification.object as? UITextField else {
            print("⚠️ [TouchEventCapture] Notification object is not UITextField")
            return
        }

        let newText = textField.text ?? ""
        let oldText = textFieldInitialValues[textField] ?? ""

        print("👆 [TouchEventCapture] Text field editing ended!")
        print("👆 [TouchEventCapture] Old text: \"\(oldText)\"")
        print("👆 [TouchEventCapture] New text: \"\(newText)\"")
        print("👆 [TouchEventCapture] Placeholder: \"\(textField.placeholder ?? "none")\"")

        // Only capture if text changed from initial value
        guard newText != oldText else {
            print("⚠️ [TouchEventCapture] Text unchanged, not capturing")
            return
        }

        print("✅ [TouchEventCapture] CAPTURING TYPE EVENT: \"\(newText)\"")

        // Update initial value for future edits
        textFieldInitialValues[textField] = newText

        // Get text field location
        let location = textField.center
        let elementInfo = ViewHierarchyInspector.getElementInfo(for: textField)

        // Create touch event with "type" gesture type
        let event = TouchEvent(
            gestureType: "type",
            coordinates: location,
            element: elementInfo,
            duration: 0,
            swipeDirection: nil,
            value: newText
        )

        print("📤 [TouchEventCapture] Sending type event to delegate...")
        delegate?.didCaptureTouchEvent(event)
        print("✅ [TouchEventCapture] Type event sent successfully!")
    }

    /// Handle text view change (real-time as user types)
    @objc private func textViewDidChange(_ notification: Notification) {
        guard isCapturing, let textView = notification.object as? UITextView else { return }

        let newText = textView.text ?? ""
        let oldText = textViewInitialValues[textView] ?? ""

        // Only capture if text changed
        guard newText != oldText else { return }

        print("👆 [TouchEventCapture] Text view changing: \"\(oldText)\" -> \"\(newText)\"")

        // Update initial value for next comparison
        textViewInitialValues[textView] = newText

        // Don't send event on every keystroke - wait for editing to end
        // This prevents too many events
    }

    /// Handle text view editing completion
    @objc private func textViewDidEndEditing(_ notification: Notification) {
        guard isCapturing, let textView = notification.object as? UITextView else { return }

        let newText = textView.text ?? ""
        let oldText = textViewInitialValues[textView] ?? ""

        // Only capture if text changed from initial value
        guard newText != oldText else { return }

        print("👆 [TouchEventCapture] Text view editing ended: \"\(oldText)\" -> \"\(newText)\"")

        // Update initial value for future edits
        textViewInitialValues[textView] = newText

        // Get text view location
        let location = textView.center
        let elementInfo = ViewHierarchyInspector.getElementInfo(for: textView)

        // Create touch event with "type" gesture type
        let event = TouchEvent(
            gestureType: "type",
            coordinates: location,
            element: elementInfo,
            duration: 0,
            swipeDirection: nil,
            value: newText
        )

        delegate?.didCaptureTouchEvent(event)
    }
}

// MARK: - SwiftUI Text Field Observation (Keyboard-based)

extension TouchEventCapture {

    /// Start observing keyboard notifications for SwiftUI text fields
    private func startObservingAccessibility() {
        // Register for keyboard notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardDidShow(_:)),
            name: UIResponder.keyboardDidShowNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide(_:)),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )

        print("👆 [TouchEventCapture] Started observing keyboard notifications for SwiftUI text fields")
    }

    /// Stop observing keyboard notifications
    private func stopObservingAccessibility() {
        NotificationCenter.default.removeObserver(self, name: UIResponder.keyboardDidShowNotification, object: nil)
        NotificationCenter.default.removeObserver(self, name: UIResponder.keyboardWillHideNotification, object: nil)

        keyboardPollingTimer?.invalidate()
        keyboardPollingTimer = nil

        observingSwiftUITextFields.removeAll()
        swiftUITextFieldValues.removeAll()

        print("👆 [TouchEventCapture] Stopped observing keyboard notifications")
    }

    /// Handle keyboard shown notification
    @objc private func keyboardDidShow(_ notification: Notification) {
        guard isCapturing else { return }

        print("⌨️  [TouchEventCapture] Keyboard shown - checking for alert controllers!")

        // IMPORTANT: Keyboard appeared means a text field is active
        // This is the perfect time to check for UIAlertController
        checkForAlertControllers()

        // Also scan for active text fields when keyboard appears
        scanForActiveSwiftUITextFields()

        // Start periodic polling while keyboard is visible (every 0.5 seconds)
        keyboardPollingTimer?.invalidate()
        keyboardPollingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.pollSwiftUITextFieldValues()
        }
    }

    /// Handle keyboard hidden notification
    @objc private func keyboardWillHide(_ notification: Notification) {
        guard isCapturing else { return }

        print("⌨️  [TouchEventCapture] Keyboard will hide - capturing final text values")

        // Stop polling
        keyboardPollingTimer?.invalidate()
        keyboardPollingTimer = nil

        // CRITICAL: Capture final values for ALL observed text fields before keyboard dismisses
        // This handles UIAlertController text fields that may not fire textDidEndEditing
        captureAllTextFieldFinalValues()

        // Capture SwiftUI text fields
        captureSwiftUITextFieldFinalValues()

        // Clear tracked SwiftUI fields
        observingSwiftUITextFields.removeAll()
        swiftUITextFieldValues.removeAll()
    }

    /// Capture final values for all observed UITextFields
    private func captureAllTextFieldFinalValues() {
        print("👆 [TouchEventCapture] Checking \(observingTextFields.count) UITextFields for final values")

        for textField in observingTextFields {
            let finalValue = textField.text ?? ""
            let initialValue = textFieldInitialValues[textField] ?? ""

            // Only send event if value changed
            if finalValue != initialValue && !finalValue.isEmpty {
                print("✅ [TouchEventCapture] CAPTURING FINAL VALUE for text field: \"\(finalValue)\"")

                // Update initial value to prevent duplicate capture
                textFieldInitialValues[textField] = finalValue

                // Get text field location
                let location = textField.center
                let elementInfo = ViewHierarchyInspector.getElementInfo(for: textField)

                // Create touch event
                let event = TouchEvent(
                    gestureType: "type",
                    coordinates: location,
                    element: elementInfo,
                    duration: 0,
                    swipeDirection: nil,
                    value: finalValue
                )

                print("📤 [TouchEventCapture] Sending type event from keyboard hide...")
                delegate?.didCaptureTouchEvent(event)
                print("✅ [TouchEventCapture] Type event sent!")
            }
        }
    }

    /// Capture existing text field values when recording starts
    private func captureExistingTextFieldValues() {
        print("👆 [TouchEventCapture] Capturing EXISTING text in \(observingTextFields.count) text fields")

        for textField in observingTextFields {
            let currentValue = textField.text ?? ""

            // Capture any non-empty text that already exists
            if !currentValue.isEmpty {
                print("✅ [TouchEventCapture] Found EXISTING text: \"\(currentValue)\"")

                // Update initial value so we don't capture it again
                textFieldInitialValues[textField] = currentValue

                // Get text field location
                let location = textField.center
                let elementInfo = ViewHierarchyInspector.getElementInfo(for: textField)

                // Create touch event
                let event = TouchEvent(
                    gestureType: "type",
                    coordinates: location,
                    element: elementInfo,
                    duration: 0,
                    swipeDirection: nil,
                    value: currentValue
                )

                print("📤 [TouchEventCapture] Sending type event for existing text...")
                delegate?.didCaptureTouchEvent(event)
                print("✅ [TouchEventCapture] Type event sent!")
            }
        }
    }

    /// Poll ALL text fields for changes (simple brute-force approach)
    private func pollAllTextFields() {
        for textField in observingTextFields {
            let currentValue = textField.text ?? ""
            let previousValue = textFieldInitialValues[textField] ?? ""

            // Detect any change
            if currentValue != previousValue {
                print("✅ [POLLING] Text changed: \"\(previousValue)\" → \"\(currentValue)\"")

                // Update stored value
                textFieldInitialValues[textField] = currentValue

                // Only send event if there's actual text
                if !currentValue.isEmpty {
                    let location = textField.center
                    let elementInfo = ViewHierarchyInspector.getElementInfo(for: textField)

                    let event = TouchEvent(
                        gestureType: "type",
                        coordinates: location,
                        element: elementInfo,
                        duration: 0,
                        swipeDirection: nil,
                        value: currentValue
                    )

                    print("📤 [POLLING] Sending type event: \"\(currentValue)\"")
                    delegate?.didCaptureTouchEvent(event)
                }
            }
        }
    }

    /// Scan view hierarchy for active SwiftUI text fields
    private func scanForActiveSwiftUITextFields() {
        guard let windows = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows }) as? [UIWindow], !windows.isEmpty else {
            return
        }

        for window in windows {
            findSwiftUITextFieldsInView(window)
        }

        print("👆 [TouchEventCapture] Found \(observingSwiftUITextFields.count) potential SwiftUI text fields")
    }

    /// Recursively find SwiftUI text fields in view hierarchy
    private func findSwiftUITextFieldsInView(_ view: UIView) {
        // Check if this view looks like a SwiftUI text field
        if looksLikeSwiftUITextField(view) {
            let viewKey = String(format: "%p", unsafeBitCast(view, to: Int.self))
            let isAlreadyTracked = observingSwiftUITextFields.contains(where: { $0.identifier == viewKey })

            if !isAlreadyTracked {
                print("👆 [TouchEventCapture] Found SwiftUI text field: \(String(describing: type(of: view))) - ID: \(view.accessibilityIdentifier ?? "no ID")")
                observingSwiftUITextFields.append(WeakViewWrapper(view: view))
                swiftUITextFieldValues[viewKey] = view.accessibilityValue ?? ""
            }
        }

        // Recursively check subviews
        for subview in view.subviews {
            findSwiftUITextFieldsInView(subview)
        }
    }

    /// Poll tracked SwiftUI text fields for value changes
    private func pollSwiftUITextFieldValues() {
        // Remove deallocated views
        observingSwiftUITextFields.removeAll(where: { $0.view == nil })

        // Check each tracked view for value changes
        for wrapper in observingSwiftUITextFields {
            guard let view = wrapper.view else { continue }

            let viewKey = wrapper.identifier
            let currentValue = view.accessibilityValue ?? ""
            let previousValue = swiftUITextFieldValues[viewKey] ?? ""

            // Only update if value actually changed
            if currentValue != previousValue {
                print("👆 [TouchEventCapture] SwiftUI text field value changed: \"\(previousValue)\" -> \"\(currentValue)\"")
                swiftUITextFieldValues[viewKey] = currentValue
            }
        }
    }

    /// Capture final values when keyboard dismisses
    private func captureSwiftUITextFieldFinalValues() {
        for wrapper in observingSwiftUITextFields {
            guard let view = wrapper.view else { continue }

            let viewKey = wrapper.identifier
            let finalValue = view.accessibilityValue ?? ""
            let initialValue = swiftUITextFieldValues[viewKey] ?? ""

            // Only send event if value changed from initial
            if finalValue != initialValue && !finalValue.isEmpty {
                print("👆 [TouchEventCapture] Capturing final SwiftUI text field value: \"\(finalValue)\"")

                // Create touch event
                let location = view.center
                let elementInfo = ViewHierarchyInspector.getElementInfo(for: view)

                let event = TouchEvent(
                    gestureType: "type",
                    coordinates: location,
                    element: elementInfo,
                    duration: 0,
                    swipeDirection: nil,
                    value: finalValue
                )

                delegate?.didCaptureTouchEvent(event)
            }
        }
    }

    /// Check if a view looks like a SwiftUI text field
    private func looksLikeSwiftUITextField(_ view: UIView) -> Bool {
        let className = String(describing: type(of: view))

        // Check class name for SwiftUI TextField indicators
        let hasTextFieldClassName = className.contains("TextField") ||
                                    className.contains("TextEditor") ||
                                    className.contains("UIKitTextField") ||
                                    className.contains("TextInput")

        // Check if it has an accessibility identifier that suggests it's a text field
        let hasTextFieldID = view.accessibilityIdentifier?.contains("TextField") ?? false ||
                              view.accessibilityIdentifier?.contains("textField") ?? false

        // Check if it has an accessibility value (text fields expose their text this way)
        let hasAccessibilityValue = view.accessibilityValue != nil

        // Check if it's editable (has user interaction enabled and is first responder or contains first responder)
        let isInteractive = view.isUserInteractionEnabled

        // It's likely a SwiftUI text field if:
        // - Has TextField in class name, OR
        // - Has TextField in accessibility ID, OR
        // - Has accessibility value and is interactive
        return hasTextFieldClassName || hasTextFieldID || (hasAccessibilityValue && isInteractive)
    }
}

// MARK: - UITextFieldDelegate

extension TouchEventCapture {
    /// Called when text is about to change - CAPTURES EVERY KEYSTROKE!
    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        guard isCapturing else { return true }

        // Calculate what the new text will be
        let currentText = textField.text ?? ""
        guard let stringRange = Range(range, in: currentText) else { return true }
        let newText = currentText.replacingCharacters(in: stringRange, with: string)

        print("⌨️  [DELEGATE] Text changing: \"\(currentText)\" → \"\(newText)\"")

        // Update our tracking
        let previousValue = textFieldInitialValues[textField] ?? ""
        textFieldInitialValues[textField] = newText

        // Send typing event if text actually changed
        if newText != previousValue && !newText.isEmpty {
            print("✅ [DELEGATE] Sending type event: \"\(newText)\"")

            let location = textField.center
            let elementInfo = ViewHierarchyInspector.getElementInfo(for: textField)

            let event = TouchEvent(
                gestureType: "type",
                coordinates: location,
                element: elementInfo,
                duration: 0,
                swipeDirection: nil,
                value: newText
            )

            delegate?.didCaptureTouchEvent(event)
        }

        // Allow the change to proceed
        return true
    }

    /// Forward other delegate methods to original delegate if it exists
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        let originalDelegate = textFieldOriginalDelegates[textField] ?? nil
        return originalDelegate?.textFieldShouldReturn?(textField) ?? true
    }

    func textFieldDidBeginEditing(_ textField: UITextField) {
        let originalDelegate = textFieldOriginalDelegates[textField] ?? nil
        originalDelegate?.textFieldDidBeginEditing?(textField)
    }

    func textFieldShouldBeginEditing(_ textField: UITextField) -> Bool {
        let originalDelegate = textFieldOriginalDelegates[textField] ?? nil
        return originalDelegate?.textFieldShouldBeginEditing?(textField) ?? true
    }

    func textFieldShouldEndEditing(_ textField: UITextField) -> Bool {
        let originalDelegate = textFieldOriginalDelegates[textField] ?? nil
        return originalDelegate?.textFieldShouldEndEditing?(textField) ?? true
    }
}

// MARK: - Helper Classes

/// Weak wrapper for UIView to prevent retain cycles
class WeakViewWrapper {
    weak var view: UIView?
    let identifier: String

    init(view: UIView) {
        self.view = view
        self.identifier = String(format: "%p", unsafeBitCast(view, to: Int.self))
    }
}
