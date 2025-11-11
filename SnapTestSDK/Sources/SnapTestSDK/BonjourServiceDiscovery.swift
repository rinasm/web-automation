import Foundation

// MARK: - BonjourServiceDiscoveryDelegate

protocol BonjourServiceDiscoveryDelegate: AnyObject {
    func didDiscoverService(serverURL: String)
    func didFailToDiscover(error: Error?)
}

// MARK: - BonjourServiceDiscovery

/// Discovers SnapTest desktop app using Bonjour/mDNS
class BonjourServiceDiscovery: NSObject {

    weak var delegate: BonjourServiceDiscoveryDelegate?

    private let browser = NetServiceBrowser()
    private var foundServices: [NetService] = []
    private let serviceType = "_snaptest._tcp."
    private let serviceDomain = "local."

    override init() {
        super.init()
        browser.delegate = self
    }

    // MARK: - Public Methods

    /// Start searching for SnapTest desktop services
    func startDiscovery() {
        print("🔍 [Bonjour] Searching for SnapTest desktop service...")
        browser.searchForServices(ofType: serviceType, inDomain: serviceDomain)
    }

    /// Stop searching
    func stopDiscovery() {
        print("🔍 [Bonjour] Stopping discovery...")
        browser.stop()
        foundServices.removeAll()
    }

    // MARK: - Helper Methods

    private func getIPAddress(from addressData: Data) -> String? {
        var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))

        addressData.withUnsafeBytes { (pointer: UnsafeRawBufferPointer) -> Void in
            guard let sockaddr = pointer.bindMemory(to: sockaddr.self).baseAddress else { return }

            getnameinfo(
                sockaddr,
                socklen_t(addressData.count),
                &hostname,
                socklen_t(hostname.count),
                nil,
                0,
                NI_NUMERICHOST
            )
        }

        return String(cString: hostname)
    }
}

// MARK: - NetServiceBrowserDelegate

extension BonjourServiceDiscovery: NetServiceBrowserDelegate {

    func netServiceBrowserWillSearch(_ browser: NetServiceBrowser) {
        print("🔍 [Bonjour] Browser will search...")
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String : NSNumber]) {
        print("❌ [Bonjour] Did not search: \(errorDict)")
        delegate?.didFailToDiscover(error: nil)
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        print("✅ [Bonjour] Found service: \(service.name)")

        foundServices.append(service)
        service.delegate = self
        service.resolve(withTimeout: 5.0)

        if !moreComing {
            print("🔍 [Bonjour] Discovery complete, found \(foundServices.count) service(s)")
        }
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didRemove service: NetService, moreComing: Bool) {
        print("🔴 [Bonjour] Service removed: \(service.name)")
        foundServices.removeAll { $0 === service }
    }

    func netServiceBrowserDidStopSearch(_ browser: NetServiceBrowser) {
        print("🔍 [Bonjour] Browser stopped")
    }
}

// MARK: - NetServiceDelegate

extension BonjourServiceDiscovery: NetServiceDelegate {

    func netServiceWillResolve(_ sender: NetService) {
        print("🔍 [Bonjour] Resolving service: \(sender.name)...")
    }

    func netServiceDidResolveAddress(_ sender: NetService) {
        guard let addresses = sender.addresses, !addresses.isEmpty else {
            print("⚠️ [Bonjour] No addresses found for service: \(sender.name)")
            return
        }

        print("🎯 [Bonjour] Service resolved: \(sender.name)")

        // Try to get IPv4 address first, then IPv6
        for addressData in addresses {
            if let ipAddress = getIPAddress(from: addressData) {
                // Skip IPv6 addresses (contain ':')
                if !ipAddress.contains(":") {
                    let serverURL = "ws://\(ipAddress):\(sender.port)"
                    print("🎯 [Bonjour] Discovered server: \(serverURL)")
                    delegate?.didDiscoverService(serverURL: serverURL)
                    return
                }
            }
        }

        // If no IPv4 found, try IPv6
        for addressData in addresses {
            if let ipAddress = getIPAddress(from: addressData) {
                if ipAddress.contains(":") {
                    let serverURL = "ws://[\(ipAddress)]:\(sender.port)"
                    print("🎯 [Bonjour] Discovered server (IPv6): \(serverURL)")
                    delegate?.didDiscoverService(serverURL: serverURL)
                    return
                }
            }
        }

        print("⚠️ [Bonjour] Could not extract IP address from service")
    }

    func netService(_ sender: NetService, didNotResolve errorDict: [String : NSNumber]) {
        print("❌ [Bonjour] Failed to resolve service: \(sender.name), error: \(errorDict)")
        delegate?.didFailToDiscover(error: nil)
    }
}
