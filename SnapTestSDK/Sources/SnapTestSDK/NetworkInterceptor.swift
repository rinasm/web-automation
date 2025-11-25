import Foundation

/// Network request/response interceptor for capturing HTTP traffic
///
/// This class uses URLProtocol to intercept all URLSession-based network requests
/// and sends them to the desktop app for debugging via the Network panel.
///
/// **Usage:**
/// ```swift
/// NetworkInterceptor.shared.startMonitoring()
/// NetworkInterceptor.shared.delegate = self
/// ```
public class NetworkInterceptor: NSObject {

    /// Shared singleton instance
    public static let shared = NetworkInterceptor()

    /// Delegate to receive network events
    public weak var delegate: NetworkInterceptorDelegate?

    /// Whether network monitoring is active
    public private(set) var isMonitoring: Bool = false

    /// Active network requests (keyed by request ID)
    private var activeRequests: [String: NetworkRequestInfo] = [:]

    private override init() {
        super.init()
    }

    // MARK: - Public API

    /// Start monitoring network requests
    public func startMonitoring() {
        guard !isMonitoring else {
            print("⚠️ [NetworkInterceptor] Already monitoring")
            return
        }

        print("🌐 [NetworkInterceptor] Starting network monitoring...")

        // Register custom URLProtocol
        URLProtocol.registerClass(SnapTestURLProtocol.self)
        SnapTestURLProtocol.interceptor = self

        isMonitoring = true
        print("✅ [NetworkInterceptor] Network monitoring started")
    }

    /// Stop monitoring network requests
    public func stopMonitoring() {
        guard isMonitoring else {
            print("⚠️ [NetworkInterceptor] Not monitoring")
            return
        }

        print("🌐 [NetworkInterceptor] Stopping network monitoring...")

        // Unregister custom URLProtocol
        URLProtocol.unregisterClass(SnapTestURLProtocol.self)
        SnapTestURLProtocol.interceptor = nil

        activeRequests.removeAll()
        isMonitoring = false
        print("✅ [NetworkInterceptor] Network monitoring stopped")
    }

    // MARK: - Internal Methods

    internal func didStartRequest(_ request: URLRequest, requestId: String) {
        let startTime = Date()

        let info = NetworkRequestInfo(
            requestId: requestId,
            request: request,
            startTime: startTime
        )

        activeRequests[requestId] = info

        print("🌐 [NetworkInterceptor] Request started: \(request.url?.absoluteString ?? "unknown")")

        // Notify delegate
        delegate?.didCaptureNetworkRequest(info.toEvent())
    }

    internal func didReceiveResponse(_ response: URLResponse, requestId: String) {
        guard var info = activeRequests[requestId] else {
            print("⚠️ [NetworkInterceptor] Response received for unknown request: \(requestId)")
            return
        }

        info.response = response
        info.responseStartTime = Date()
        activeRequests[requestId] = info

        print("🌐 [NetworkInterceptor] Response received: \(response.url?.absoluteString ?? "unknown")")
    }

    internal func didReceiveData(_ data: Data, requestId: String) {
        guard var info = activeRequests[requestId] else {
            print("⚠️ [NetworkInterceptor] Data received for unknown request: \(requestId)")
            return
        }

        if info.responseData == nil {
            info.responseData = Data()
        }
        info.responseData?.append(data)
        activeRequests[requestId] = info
    }

    internal func didCompleteRequest(requestId: String, error: Error?) {
        guard var info = activeRequests[requestId] else {
            print("⚠️ [NetworkInterceptor] Request completed for unknown request: \(requestId)")
            return
        }

        info.endTime = Date()
        info.error = error

        let duration = info.endTime!.timeIntervalSince(info.startTime) * 1000

        if let error = error {
            print("❌ [NetworkInterceptor] Request failed (\(Int(duration))ms): \(error.localizedDescription)")
        } else {
            print("✅ [NetworkInterceptor] Request completed (\(Int(duration))ms): \(info.request.url?.absoluteString ?? "unknown")")
        }

        // Notify delegate
        delegate?.didCompleteNetworkRequest(info.toEvent())

        // Clean up
        activeRequests.removeValue(forKey: requestId)
    }
}

// MARK: - NetworkInterceptorDelegate

public protocol NetworkInterceptorDelegate: AnyObject {
    func didCaptureNetworkRequest(_ event: NetworkEvent)
    func didCompleteNetworkRequest(_ event: NetworkEvent)
}

// MARK: - NetworkRequestInfo

internal struct NetworkRequestInfo {
    let requestId: String
    let request: URLRequest
    let startTime: Date
    var response: URLResponse?
    var responseData: Data?
    var responseStartTime: Date?
    var endTime: Date?
    var error: Error?

    func toEvent() -> NetworkEvent {
        // Parse request
        let method = request.httpMethod ?? "GET"
        let url = request.url?.absoluteString ?? ""
        let requestHeaders = request.allHTTPHeaderFields ?? [:]
        let requestBody = request.httpBody

        // Parse response
        var statusCode: Int?
        var responseHeaders: [String: String] = [:]
        var mimeType: String?

        if let httpResponse = response as? HTTPURLResponse {
            statusCode = httpResponse.statusCode
            responseHeaders = httpResponse.allHeaderFields.reduce(into: [String: String]()) { result, pair in
                if let key = pair.key as? String, let value = pair.value as? String {
                    result[key] = value
                }
            }
            mimeType = httpResponse.mimeType
        }

        // Calculate timing
        let totalDuration = endTime?.timeIntervalSince(startTime) ?? 0
        let waitTime = responseStartTime?.timeIntervalSince(startTime) ?? 0
        let downloadTime = endTime != nil && responseStartTime != nil ? endTime!.timeIntervalSince(responseStartTime!) : 0

        return NetworkEvent(
            requestId: requestId,
            method: method,
            url: url,
            requestHeaders: requestHeaders,
            requestBody: requestBody?.base64EncodedString(),
            requestBodySize: requestBody?.count ?? 0,
            responseStatus: statusCode,
            responseHeaders: responseHeaders,
            responseBody: responseData?.base64EncodedString(),
            responseBodySize: responseData?.count ?? 0,
            responseMimeType: mimeType,
            startTime: Int(startTime.timeIntervalSince1970 * 1000),
            endTime: endTime != nil ? Int(endTime!.timeIntervalSince1970 * 1000) : nil,
            totalDuration: Int(totalDuration * 1000),
            waitTime: Int(waitTime * 1000),
            downloadTime: Int(downloadTime * 1000),
            error: error?.localizedDescription
        )
    }
}

// MARK: - Custom URLProtocol

/// Custom URLProtocol to intercept all URLSession requests
internal class SnapTestURLProtocol: URLProtocol {

    static weak var interceptor: NetworkInterceptor?

    private var dataTask: URLSessionDataTask?
    private var requestId: String?

    // MARK: - URLProtocol Overrides

    override class func canInit(with request: URLRequest) -> Bool {
        // Only intercept if monitoring is active and request hasn't been handled yet
        guard interceptor?.isMonitoring == true else { return false }

        // Avoid infinite loops - don't intercept our own marked requests
        if URLProtocol.property(forKey: "SnapTestURLProtocolHandled", in: request) != nil {
            return false
        }

        // Only intercept HTTP/HTTPS requests
        guard let scheme = request.url?.scheme?.lowercased(),
              scheme == "http" || scheme == "https" else {
            return false
        }

        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        // Mark request as handled to avoid loops
        guard let mutableRequest = (request as NSURLRequest).mutableCopy() as? NSMutableURLRequest else {
            return
        }
        URLProtocol.setProperty(true, forKey: "SnapTestURLProtocolHandled", in: mutableRequest)

        // Generate unique request ID
        let requestId = UUID().uuidString
        self.requestId = requestId

        // Notify interceptor
        SnapTestURLProtocol.interceptor?.didStartRequest(request, requestId: requestId)

        // Create session and data task
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        let task = session.dataTask(with: mutableRequest as URLRequest)
        dataTask = task
        task.resume()
    }

    override func stopLoading() {
        dataTask?.cancel()
        dataTask = nil
    }
}

// MARK: - URLSessionDataDelegate

extension SnapTestURLProtocol: URLSessionDataDelegate {

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {

        // Notify client
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .allowed)

        // Notify interceptor
        if let requestId = requestId {
            SnapTestURLProtocol.interceptor?.didReceiveResponse(response, requestId: requestId)
        }

        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        // Notify client
        client?.urlProtocol(self, didLoad: data)

        // Notify interceptor
        if let requestId = requestId {
            SnapTestURLProtocol.interceptor?.didReceiveData(data, requestId: requestId)
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        // Notify client
        if let error = error {
            client?.urlProtocol(self, didFailWithError: error)
        } else {
            client?.urlProtocolDidFinishLoading(self)
        }

        // Notify interceptor
        if let requestId = requestId {
            SnapTestURLProtocol.interceptor?.didCompleteRequest(requestId: requestId, error: error)
        }

        session.finishTasksAndInvalidate()
    }
}
