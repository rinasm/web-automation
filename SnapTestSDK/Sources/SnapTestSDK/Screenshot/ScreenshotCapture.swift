import UIKit

/// Captures screenshots of the app screen using native iOS APIs
/// Provides both UIImage and base64-encoded PNG formats
public class ScreenshotCapture {

    // MARK: - Public API

    /// Capture screenshot of entire screen
    /// - Returns: UIImage of the current screen, or nil if capture fails
    public static func captureScreen() -> UIImage? {
        guard let window = getKeyWindow() else {
            print("❌ [ScreenshotCapture] No key window found")
            return nil
        }

        return captureView(window)
    }

    /// Capture screenshot and encode as base64 PNG
    /// - Returns: Base64-encoded PNG string, or nil if capture fails
    public static func captureScreenAsBase64() -> String? {
        guard let image = captureScreen() else {
            print("❌ [ScreenshotCapture] Failed to capture screen")
            return nil
        }

        guard let pngData = image.pngData() else {
            print("❌ [ScreenshotCapture] Failed to convert image to PNG data")
            return nil
        }

        let base64String = pngData.base64EncodedString()
        print("✅ [ScreenshotCapture] Screenshot captured (\(pngData.count) bytes, \(base64String.count) base64 chars)")

        return base64String
    }

    /// Capture screenshot and encode as JPEG with quality
    /// - Parameter quality: JPEG compression quality (0.0 - 1.0, default 0.8)
    /// - Returns: Base64-encoded JPEG string, or nil if capture fails
    public static func captureScreenAsJPEG(quality: CGFloat = 0.8) -> String? {
        guard let image = captureScreen() else {
            print("❌ [ScreenshotCapture] Failed to capture screen")
            return nil
        }

        guard let jpegData = image.jpegData(compressionQuality: quality) else {
            print("❌ [ScreenshotCapture] Failed to convert image to JPEG data")
            return nil
        }

        let base64String = jpegData.base64EncodedString()
        print("✅ [ScreenshotCapture] Screenshot captured as JPEG (\(jpegData.count) bytes, quality: \(quality))")

        return base64String
    }

    /// Capture screenshot of specific view
    /// - Parameter view: The view to capture
    /// - Returns: UIImage of the view, or nil if capture fails
    public static func captureView(_ view: UIView) -> UIImage? {
        print("📸 [ScreenshotCapture] Capturing view: \(type(of: view)) (bounds: \(view.bounds))")

        // Use UIGraphicsImageRenderer for iOS 10+ (more efficient and handles wide color)
        let renderer = UIGraphicsImageRenderer(bounds: view.bounds)
        let image = renderer.image { context in
            // Render the view hierarchy into the context
            view.drawHierarchy(in: view.bounds, afterScreenUpdates: true)
        }

        print("✅ [ScreenshotCapture] View captured successfully (size: \(image.size))")
        return image
    }

    /// Capture screenshot of specific region
    /// - Parameters:
    ///   - rect: The region to capture (in screen coordinates)
    ///   - window: Optional window, uses key window if nil
    /// - Returns: UIImage of the region, or nil if capture fails
    public static func captureRegion(_ rect: CGRect, in window: UIWindow? = nil) -> UIImage? {
        let targetWindow = window ?? getKeyWindow()
        guard let targetWindow = targetWindow else {
            print("❌ [ScreenshotCapture] No window available")
            return nil
        }

        print("📸 [ScreenshotCapture] Capturing region: \(rect)")

        // First capture the entire window
        guard let fullImage = captureView(targetWindow) else {
            return nil
        }

        // Crop to the specified region
        let scale = fullImage.scale
        let scaledRect = CGRect(
            x: rect.origin.x * scale,
            y: rect.origin.y * scale,
            width: rect.size.width * scale,
            height: rect.size.height * scale
        )

        guard let cgImage = fullImage.cgImage?.cropping(to: scaledRect) else {
            print("❌ [ScreenshotCapture] Failed to crop image")
            return nil
        }

        let croppedImage = UIImage(cgImage: cgImage, scale: scale, orientation: fullImage.imageOrientation)
        print("✅ [ScreenshotCapture] Region captured successfully")

        return croppedImage
    }

    /// Save screenshot to Photos library
    /// - Parameter completion: Callback with success status and optional error
    public static func saveToPhotos(completion: @escaping (Bool, Error?) -> Void) {
        guard let image = captureScreen() else {
            let error = NSError(domain: "ScreenshotCapture", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to capture screenshot"
            ])
            completion(false, error)
            return
        }

        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        print("✅ [ScreenshotCapture] Screenshot saved to Photos")
        completion(true, nil)
    }

    // MARK: - Helper Methods

    /// Get the key window from the app
    /// - Returns: The key window, or nil if not found
    private static func getKeyWindow() -> UIWindow? {
        // iOS 13+ approach
        if #available(iOS 13.0, *) {
            let keyWindow = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }

            if let keyWindow = keyWindow {
                return keyWindow
            }
        }

        // iOS 12 and earlier fallback
        if let keyWindow = UIApplication.shared.keyWindow {
            return keyWindow
        }

        // Last resort: get first window
        if let firstWindow = UIApplication.shared.windows.first {
            print("⚠️ [ScreenshotCapture] Using first window as fallback")
            return firstWindow
        }

        return nil
    }

    // MARK: - Advanced Screenshot Options

    /// Capture screenshot with custom rendering options
    /// - Parameters:
    ///   - afterScreenUpdates: Whether to capture after pending updates (default: true)
    ///   - opaque: Whether the image should be opaque (default: false for transparency)
    /// - Returns: UIImage of the screen, or nil if capture fails
    public static func captureScreenWithOptions(
        afterScreenUpdates: Bool = true,
        opaque: Bool = false
    ) -> UIImage? {
        guard let window = getKeyWindow() else {
            print("❌ [ScreenshotCapture] No key window found")
            return nil
        }

        print("📸 [ScreenshotCapture] Capturing with options (afterUpdates: \(afterScreenUpdates), opaque: \(opaque))")

        let bounds = window.bounds
        let format = UIGraphicsImageRendererFormat()
        format.opaque = opaque
        format.scale = UIScreen.main.scale

        let renderer = UIGraphicsImageRenderer(bounds: bounds, format: format)
        let image = renderer.image { context in
            window.drawHierarchy(in: bounds, afterScreenUpdates: afterScreenUpdates)
        }

        print("✅ [ScreenshotCapture] Screenshot captured with custom options")
        return image
    }

    /// Capture multiple screenshots with delay
    /// - Parameters:
    ///   - count: Number of screenshots to capture
    ///   - delay: Delay between captures in seconds
    ///   - completion: Callback with array of base64-encoded images
    public static func captureMultiple(
        count: Int,
        delay: TimeInterval,
        completion: @escaping ([String]) -> Void
    ) {
        var screenshots: [String] = []
        var captureCount = 0

        func captureNext() {
            if captureCount >= count {
                print("✅ [ScreenshotCapture] Captured \(screenshots.count) screenshots")
                completion(screenshots)
                return
            }

            if let base64 = captureScreenAsBase64() {
                screenshots.append(base64)
            }

            captureCount += 1

            if captureCount < count {
                DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                    captureNext()
                }
            } else {
                completion(screenshots)
            }
        }

        captureNext()
    }

    // MARK: - Metadata

    /// Get screenshot metadata
    /// - Parameter image: The screenshot image
    /// - Returns: Dictionary with metadata
    public static func getMetadata(for image: UIImage) -> [String: Any] {
        let window = getKeyWindow()

        return [
            "size": [
                "width": image.size.width,
                "height": image.size.height
            ],
            "scale": image.scale,
            "orientation": image.imageOrientation.rawValue,
            "timestamp": Date().timeIntervalSince1970,
            "device": [
                "model": UIDevice.current.model,
                "systemVersion": UIDevice.current.systemVersion,
                "screenScale": UIScreen.main.scale,
                "screenBounds": [
                    "width": UIScreen.main.bounds.width,
                    "height": UIScreen.main.bounds.height
                ]
            ],
            "window": window.map { window in
                return [
                    "bounds": [
                        "width": window.bounds.width,
                        "height": window.bounds.height
                    ],
                    "safeArea": [
                        "top": window.safeAreaInsets.top,
                        "bottom": window.safeAreaInsets.bottom,
                        "left": window.safeAreaInsets.left,
                        "right": window.safeAreaInsets.right
                    ]
                ]
            } ?? [:]
        ]
    }
}

// MARK: - Extension for WebSocket Integration

extension ScreenshotCapture {

    /// Result structure for WebSocket responses
    public struct ScreenshotResult {
        public let success: Bool
        public let image: String?
        public let error: String?
        public let metadata: [String: Any]?

        public init(success: Bool, image: String?, error: String?, metadata: [String: Any]? = nil) {
            self.success = success
            self.image = image
            self.error = error
            self.metadata = metadata
        }

        /// Convert to dictionary for WebSocket message
        public func toDictionary() -> [String: Any] {
            var dict: [String: Any] = [
                "success": success
            ]

            if let image = image {
                dict["image"] = image
            }

            if let error = error {
                dict["error"] = error
            }

            if let metadata = metadata {
                dict["metadata"] = metadata
            }

            return dict
        }
    }

    /// Capture screenshot for WebSocket response
    /// - Parameters:
    ///   - format: Image format ("png" or "jpeg")
    ///   - quality: JPEG quality if format is "jpeg" (0.0 - 1.0)
    ///   - includeMetadata: Whether to include metadata (default: false)
    /// - Returns: ScreenshotResult ready for WebSocket transmission
    public static func captureForWebSocket(
        format: String = "png",
        quality: CGFloat = 0.8,
        includeMetadata: Bool = false
    ) -> ScreenshotResult {
        print("📸 [ScreenshotCapture] Capturing screenshot for WebSocket (format: \(format))")

        let base64Image: String?
        let metadata: [String: Any]?

        if format.lowercased() == "jpeg" || format.lowercased() == "jpg" {
            base64Image = captureScreenAsJPEG(quality: quality)
        } else {
            base64Image = captureScreenAsBase64()
        }

        guard let image = base64Image else {
            print("❌ [ScreenshotCapture] Failed to capture screenshot")
            return ScreenshotResult(
                success: false,
                image: nil,
                error: "Failed to capture screenshot"
            )
        }

        // Optionally include metadata
        if includeMetadata, let uiImage = captureScreen() {
            metadata = getMetadata(for: uiImage)
        } else {
            metadata = nil
        }

        print("✅ [ScreenshotCapture] Screenshot ready for WebSocket (\(image.count) chars)")

        return ScreenshotResult(
            success: true,
            image: image,
            error: nil,
            metadata: metadata
        )
    }
}
