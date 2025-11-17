import Foundation
import Starscream

// MARK: - WebSocketManagerDelegate

protocol WebSocketManagerDelegate: AnyObject {
    func webSocketDidConnect()
    func webSocketDidDisconnect(error: Error?)
    func webSocketDidReceiveCommand(_ command: SDKCommand)
}

// MARK: - WebSocketManager

/// Manages WebSocket connection to SnapTest desktop app
class WebSocketManager: WebSocketDelegate {

    weak var delegate: WebSocketManagerDelegate?

    private var socket: WebSocket?
    private let serverURL: String
    private var isConnected: Bool = false

    init(serverURL: String) {
        self.serverURL = serverURL
    }

    // MARK: - Connection Management

    func connect() {
        guard let url = URL(string: serverURL) else {
            print("❌ [WebSocketManager] Invalid server URL: \(serverURL)")
            return
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 5

        socket = WebSocket(request: request)
        socket?.delegate = self
        socket?.connect()

        print("🔵 [WebSocketManager] Connecting to \(serverURL)...")
    }

    func disconnect() {
        socket?.disconnect()
        socket = nil
        isConnected = false
        print("🔵 [WebSocketManager] Disconnected")
    }

    // MARK: - Send Events

    func send<T: SDKEvent>(event: T) {
        guard isConnected, let socket = socket else {
            print("⚠️ [WebSocketManager] Cannot send event: not connected")
            return
        }

        do {
            let encoder = JSONEncoder()
            // Use camelCase keys to match desktop server expectations
            let jsonData = try encoder.encode(event)

            if let jsonString = String(data: jsonData, encoding: .utf8) {
                socket.write(string: jsonString)
                print("📤 [WebSocketManager] Sent event: \(event.type)")
            }
        } catch {
            print("❌ [WebSocketManager] Failed to encode event: \(error)")
        }
    }

    // MARK: - WebSocketDelegate

    func didReceive(event: Starscream.WebSocketEvent, client: Starscream.WebSocketClient) {
        switch event {
        case .connected(let headers):
            print("🟢 [WebSocketManager] Connected: \(headers)")
            isConnected = true
            delegate?.webSocketDidConnect()

        case .disconnected(let reason, let code):
            print("🔴 [WebSocketManager] Disconnected: \(reason) (code: \(code))")
            isConnected = false
            delegate?.webSocketDidDisconnect(error: nil)

        case .text(let string):
            print("📥 [WebSocketManager] Received text: \(string)")
            handleReceivedText(string)

        case .binary(let data):
            print("📥 [WebSocketManager] Received binary data: \(data.count) bytes")

        case .ping(_):
            print("🏓 [WebSocketManager] Received ping")

        case .pong(_):
            print("🏓 [WebSocketManager] Received pong")

        case .viabilityChanged(let isViable):
            print("📡 [WebSocketManager] Viability changed: \(isViable)")

        case .reconnectSuggested(let suggested):
            print("🔄 [WebSocketManager] Reconnect suggested: \(suggested)")
            if suggested {
                connect()
            }

        case .cancelled:
            print("🚫 [WebSocketManager] Connection cancelled")
            isConnected = false
            delegate?.webSocketDidDisconnect(error: nil)

        case .error(let error):
            print("❌ [WebSocketManager] Error: \(String(describing: error))")
            isConnected = false
            delegate?.webSocketDidDisconnect(error: error)

        case .peerClosed:
            print("🔴 [WebSocketManager] Peer closed connection")
            isConnected = false
            delegate?.webSocketDidDisconnect(error: nil)
        }
    }

    // MARK: - Message Handling

    private func handleReceivedText(_ text: String) {
        print("📥 [WebSocketManager] ===== RAW MESSAGE RECEIVED =====")
        print("📥 [WebSocketManager] \(text)")
        print("📥 [WebSocketManager] ==================================")

        guard let data = text.data(using: .utf8) else {
            print("❌ [WebSocketManager] Failed to convert text to data")
            return
        }

        // Try to parse as generic JSON first to check message type
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let type = json["type"] as? String {

            print("📥 [WebSocketManager] Parsed message type: \(type)")

            // Handle informational messages (welcome, handshake-ack, etc.)
            if type == "welcome" || type == "handshake-ack" {
                print("📥 [WebSocketManager] Received \(type) message")
                return
            }
        }

        // Try to decode as command
        do {
            let decoder = JSONDecoder()
            // Desktop sends camelCase keys
            let command = try decoder.decode(SDKCommand.self, from: data)
            print("✅ [WebSocketManager] Successfully decoded command: \(command.type)")
            delegate?.webSocketDidReceiveCommand(command)
        } catch {
            print("❌ [WebSocketManager] Failed to decode message as SDKCommand")
            print("❌ [WebSocketManager] Error: \(error)")
            print("❌ [WebSocketManager] Message was: \(text)")
        }
    }
}
