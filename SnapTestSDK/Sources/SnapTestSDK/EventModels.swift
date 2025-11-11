import Foundation
import CoreGraphics
import UIKit

// MARK: - Base Protocol

/// Base protocol for all events that can be sent over WebSocket
protocol SDKEvent: Codable {
    var type: String { get }
    var timestamp: TimeInterval { get }
}

// MARK: - Handshake Event

/// Initial handshake event sent when SDK connects to desktop app
struct HandshakeEvent: SDKEvent {
    let type: String = "handshake"
    let timestamp: TimeInterval = Date().timeIntervalSince1970
    let deviceName: String
    let deviceModel: String
    let systemVersion: String
    let bundleId: String
}

// MARK: - Touch Events

/// Touch event captured from user interaction
struct TouchEvent: SDKEvent {
    let type: String
    let timestamp: TimeInterval
    let gestureType: String // "tap", "longPress", "swipe", "scroll"
    let coordinates: Coordinates
    let element: ElementInfo?
    let duration: Int? // milliseconds
    let swipeDirection: String? // "up", "down", "left", "right"
    let value: String? // For text input

    struct Coordinates: Codable {
        let x: Double
        let y: Double
    }

    init(gestureType: String, coordinates: CGPoint, element: ElementInfo?, duration: Int? = nil, swipeDirection: String? = nil, value: String? = nil) {
        self.type = "touch"
        self.timestamp = Date().timeIntervalSince1970
        self.gestureType = gestureType
        self.coordinates = Coordinates(x: Double(coordinates.x), y: Double(coordinates.y))
        self.element = element
        self.duration = duration
        self.swipeDirection = swipeDirection
        self.value = value
    }
}

/// Information about the UI element that was interacted with
struct ElementInfo: Codable {
    let className: String
    let accessibilityIdentifier: String?
    let accessibilityLabel: String?
    let text: String?
    let bounds: Bounds
    let isClickable: Bool
    let isEditable: Bool
    let xpath: String?

    struct Bounds: Codable {
        let x: Double
        let y: Double
        let width: Double
        let height: Double
    }

    init(view: UIView, xpath: String?) {
        self.className = String(describing: type(of: view))
        self.accessibilityIdentifier = view.accessibilityIdentifier
        self.accessibilityLabel = view.accessibilityLabel

        // Extract text based on view type
        if let label = view as? UILabel {
            self.text = label.text
        } else if let button = view as? UIButton {
            self.text = button.currentTitle
        } else if let textField = view as? UITextField {
            self.text = textField.text
        } else if let textView = view as? UITextView {
            self.text = textView.text
        } else {
            self.text = nil
        }

        let frame = view.frame
        self.bounds = Bounds(
            x: Double(frame.origin.x),
            y: Double(frame.origin.y),
            width: Double(frame.size.width),
            height: Double(frame.size.height)
        )

        self.isClickable = view.isUserInteractionEnabled
        self.isEditable = view is UITextField || view is UITextView
        self.xpath = xpath
    }
}

// MARK: - Commands from Desktop

/// Commands sent from desktop app to SDK
struct SDKCommand: Codable {
    let type: CommandType
    let timestamp: TimeInterval
    let payload: CommandPayload?

    enum CommandType: String, Codable {
        case startRecording
        case stopRecording
        case ping
        case executeAction
    }

    struct CommandPayload: Codable {
        let actionId: String?
        let actionType: String? // "tap", "type", "swipe"
        let selector: String? // accessibilityId or xpath
        let value: String? // text for type actions
        let swipeDirection: String? // "up", "down", "left", "right" for swipe
    }
}

// MARK: - Pong Event

/// Response to ping command
struct PongEvent: SDKEvent {
    let type: String = "pong"
    let timestamp: TimeInterval = Date().timeIntervalSince1970
}

// MARK: - Action Result Event

/// Result of executing an action command
struct ActionResultEvent: SDKEvent {
    let type: String = "actionResult"
    let timestamp: TimeInterval = Date().timeIntervalSince1970
    let actionId: String
    let success: Bool
    let error: String?
    let duration: Int // milliseconds
}
