import { useNetworkStore } from '../store/networkStore';
import { NetworkEntry, NetworkHeader } from '../types/network';

/**
 * Network Listener Service
 *
 * Listens for network events from the SDK via IPC and updates the network store.
 * Handles both HTTP/HTTPS requests from the mobile app and WebSocket messages
 * from the SDK protocol.
 */

interface NetworkEventData {
  deviceId: string;
  device: {
    deviceName: string;
    deviceModel: string;
    systemVersion: string;
    bundleId: string;
  };
  event: {
    requestId: string;
    method: string;
    url: string;
    requestHeaders: Record<string, string>;
    requestBody?: string; // Base64 encoded
    requestBodySize: number;
    responseStatus?: number;
    responseHeaders: Record<string, string>;
    responseBody?: string; // Base64 encoded
    responseBodySize: number;
    responseMimeType?: string;
    startTime: number; // Unix timestamp in milliseconds
    endTime?: number; // Unix timestamp in milliseconds
    totalDuration: number; // milliseconds
    waitTime: number; // milliseconds
    downloadTime: number; // milliseconds
    error?: string;
  };
}

/**
 * Initialize network listener
 * Sets up IPC listeners for network events
 */
export function initializeNetworkListener(): () => void {
  if (!window.electronAPI) {
    console.warn('⚠️ [Network Listener] ElectronAPI not available');
    return () => {};
  }

  console.log('🌐 [Network Listener] Initializing...');

  // Listen for network events from SDK
  const unsubscribe = window.electronAPI.on('sdk:sdk-network-event', (data: NetworkEventData) => {
    console.log('🌐 [Network Listener] Received network event:', data.event.method, data.event.url);

    try {
      const networkEntry = convertToNetworkEntry(data);
      const store = useNetworkStore.getState();

      // Check if this is an update to an existing entry
      const existingEntry = store.getEntryById(data.event.requestId);

      if (existingEntry) {
        // Update existing entry with response data
        store.updateEntry(data.event.requestId, {
          response: networkEntry.response,
          timing: networkEntry.timing,
          error: networkEntry.error
        });
      } else {
        // Add new entry
        store.addEntry(networkEntry);
      }
    } catch (error) {
      console.error('❌ [Network Listener] Error processing network event:', error);
    }
  });

  console.log('✅ [Network Listener] Initialized');

  return unsubscribe;
}

/**
 * Convert SDK network event to NetworkEntry format
 */
function convertToNetworkEntry(data: NetworkEventData): NetworkEntry {
  const { event, deviceId } = data;

  // Convert headers from object to array
  const requestHeaders: NetworkHeader[] = Object.entries(event.requestHeaders).map(
    ([name, value]) => ({ name, value })
  );

  const responseHeaders: NetworkHeader[] = Object.entries(event.responseHeaders || {}).map(
    ([name, value]) => ({ name, value })
  );

  // Determine entry type based on URL and method
  let entryType: 'http' | 'websocket' | 'fetch' | 'xhr' = 'http';
  if (event.url.startsWith('ws://') || event.url.startsWith('wss://')) {
    entryType = 'websocket';
  } else if (event.requestHeaders['X-Requested-With'] === 'XMLHttpRequest') {
    entryType = 'xhr';
  } else if (isFetchRequest(event.requestHeaders)) {
    entryType = 'fetch';
  }

  // Parse request body
  let requestBody: string | undefined;
  if (event.requestBody) {
    try {
      // Try to decode base64 body for display
      const decoded = atob(event.requestBody);
      requestBody = decoded;
    } catch {
      // If decode fails, keep as is
      requestBody = event.requestBody;
    }
  }

  // Parse response body
  let responseBody: string | undefined;
  if (event.responseBody) {
    try {
      // Try to decode base64 body for display
      const decoded = atob(event.responseBody);
      responseBody = decoded;
    } catch {
      // If decode fails, keep as is
      responseBody = event.responseBody;
    }
  }

  const networkEntry: NetworkEntry = {
    id: event.requestId,
    type: entryType,
    request: {
      method: event.method as any,
      url: event.url,
      headers: requestHeaders,
      body: requestBody,
      bodySize: event.requestBodySize,
      queryParams: extractQueryParams(event.url)
    },
    response: event.responseStatus
      ? {
          status: event.responseStatus,
          statusText: getStatusText(event.responseStatus),
          headers: responseHeaders,
          body: responseBody,
          bodySize: event.responseBodySize,
          mimeType: event.responseMimeType
        }
      : undefined,
    timing: {
      startTime: event.startTime,
      dnsLookup: undefined,
      tcpConnection: undefined,
      tlsHandshake: undefined,
      requestSent: undefined,
      waiting: event.waitTime,
      contentDownload: event.downloadTime,
      totalDuration: event.totalDuration,
      endTime: event.endTime || event.startTime + event.totalDuration
    },
    error: event.error,
    deviceId: deviceId,
    isSDKMessage: false // HTTP requests from app, not SDK protocol messages
  };

  return networkEntry;
}

/**
 * Check if request is a Fetch API request
 */
function isFetchRequest(headers: Record<string, string>): boolean {
  // Fetch requests typically don't have X-Requested-With header
  // and may have specific Origin/Referer patterns
  return !headers['X-Requested-With'];
}

/**
 * Extract query parameters from URL
 */
function extractQueryParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  } catch {
    return {};
  }
}

/**
 * Get HTTP status text from status code
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    100: 'Continue',
    101: 'Switching Protocols',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    206: 'Partial Content',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };

  return statusTexts[status] || 'Unknown';
}

/**
 * Start network monitoring for a device
 */
export async function startNetworkMonitoring(deviceId: string): Promise<boolean> {
  if (!window.electronAPI) {
    console.error('❌ [Network Listener] ElectronAPI not available');
    return false;
  }

  try {
    console.log(`🌐 [Network Listener] Starting monitoring for device: ${deviceId}`);

    const result = await window.electronAPI.invoke('mobile:network-start-monitoring', { deviceId });

    if (result.success) {
      console.log(`✅ [Network Listener] Monitoring started for device: ${deviceId}`);
      useNetworkStore.getState().setMonitoring(true);
      return true;
    } else {
      console.error(`❌ [Network Listener] Failed to start monitoring: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ [Network Listener] Error starting monitoring:', error);
    return false;
  }
}

/**
 * Stop network monitoring for a device
 */
export async function stopNetworkMonitoring(deviceId: string): Promise<boolean> {
  if (!window.electronAPI) {
    console.error('❌ [Network Listener] ElectronAPI not available');
    return false;
  }

  try {
    console.log(`🌐 [Network Listener] Stopping monitoring for device: ${deviceId}`);

    const result = await window.electronAPI.invoke('mobile:network-stop-monitoring', { deviceId });

    if (result.success) {
      console.log(`✅ [Network Listener] Monitoring stopped for device: ${deviceId}`);
      useNetworkStore.getState().setMonitoring(false);
      return true;
    } else {
      console.error(`❌ [Network Listener] Failed to stop monitoring: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ [Network Listener] Error stopping monitoring:', error);
    return false;
  }
}

/**
 * Clear all network entries
 */
export function clearNetworkEntries(): void {
  console.log('🌐 [Network Listener] Clearing network entries');
  useNetworkStore.getState().clearEntries();
}
