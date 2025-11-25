import { NetworkEntry, HAR, HAREntry, HARRequest, HARResponse, HARTimings, HARContent } from '../types/network';

/**
 * Convert network entries to HAR (HTTP Archive) 1.2 format
 *
 * HAR Spec: http://www.softwareishard.com/blog/har-12-spec/
 */
export function exportToHAR(entries: NetworkEntry[], pageTitle: string = 'Mobile App Network Log'): HAR {
  const now = new Date().toISOString();

  const har: HAR = {
    log: {
      version: '1.2',
      creator: {
        name: 'SnapTest Network Monitor',
        version: '1.0.0',
        comment: 'Network monitoring for mobile apps'
      },
      browser: {
        name: 'Mobile App',
        version: '1.0',
        comment: 'iOS/Android app under test'
      },
      pages: [
        {
          startedDateTime: now,
          id: 'page_1',
          title: pageTitle,
          pageTimings: {
            onContentLoad: -1,
            onLoad: -1,
            comment: 'Mobile app - no page load events'
          }
        }
      ],
      entries: entries.map(entry => convertToHAREntry(entry)),
      comment: `Captured ${entries.length} network requests`
    }
  };

  return har;
}

/**
 * Convert a single NetworkEntry to HAREntry
 */
function convertToHAREntry(entry: NetworkEntry): HAREntry {
  const startedDateTime = new Date(entry.timing.startTime).toISOString();

  const harEntry: HAREntry = {
    startedDateTime,
    time: entry.timing.totalDuration,
    request: convertToHARRequest(entry),
    response: convertToHARResponse(entry),
    cache: {
      comment: 'No cache data available for mobile app requests'
    },
    timings: convertToHARTimings(entry),
    serverIPAddress: extractHostname(entry.request.url),
    comment: entry.error ? `Error: ${entry.error}` : undefined
  };

  return harEntry;
}

/**
 * Convert request to HAR request format
 */
function convertToHARRequest(entry: NetworkEntry): HARRequest {
  const url = new URL(entry.request.url);

  // Parse query parameters
  const queryString = Array.from(url.searchParams.entries()).map(([name, value]) => ({
    name,
    value,
    comment: undefined
  }));

  // Convert headers
  const headers = entry.request.headers.map(h => ({
    name: h.name,
    value: h.value,
    comment: undefined
  }));

  // Parse cookies from headers
  const cookies = parseCookiesFromHeaders(headers, 'request');

  const harRequest: HARRequest = {
    method: entry.request.method,
    url: entry.request.url,
    httpVersion: 'HTTP/1.1',
    cookies,
    headers,
    queryString,
    headersSize: calculateHeadersSize(headers),
    bodySize: entry.request.bodySize,
    comment: undefined
  };

  // Add POST data if present
  if (entry.request.body) {
    harRequest.postData = {
      mimeType: getMimeTypeFromHeaders(headers) || 'application/octet-stream',
      params: [],
      text: entry.request.body, // Base64 encoded
      comment: 'Body is base64 encoded'
    };
  }

  return harRequest;
}

/**
 * Convert response to HAR response format
 */
function convertToHARResponse(entry: NetworkEntry): HARResponse {
  if (!entry.response) {
    // No response received (request failed or still pending)
    return {
      status: 0,
      statusText: entry.error || 'No response',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: [],
      content: {
        size: 0,
        mimeType: 'text/plain',
        comment: 'No response received'
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: 0,
      comment: entry.error
    };
  }

  const headers = entry.response.headers.map(h => ({
    name: h.name,
    value: h.value,
    comment: undefined
  }));

  const cookies = parseCookiesFromHeaders(headers, 'response');

  const harResponse: HARResponse = {
    status: entry.response.status,
    statusText: entry.response.statusText,
    httpVersion: 'HTTP/1.1',
    cookies,
    headers,
    content: {
      size: entry.response.bodySize,
      mimeType: entry.response.mimeType || 'application/octet-stream',
      text: entry.response.body, // Base64 encoded
      encoding: entry.response.body ? 'base64' : undefined,
      comment: entry.response.body ? 'Body is base64 encoded' : 'No body'
    },
    redirectURL: getRedirectURL(headers),
    headersSize: calculateHeadersSize(headers),
    bodySize: entry.response.bodySize,
    comment: undefined
  };

  return harResponse;
}

/**
 * Convert timing to HAR timings format
 */
function convertToHARTimings(entry: NetworkEntry): HARTimings {
  return {
    blocked: -1,
    dns: entry.timing.dnsLookup || -1,
    connect: entry.timing.tcpConnection || -1,
    send: entry.timing.requestSent || 0,
    wait: entry.timing.waiting || 0,
    receive: entry.timing.contentDownload || 0,
    ssl: entry.timing.tlsHandshake || -1,
    comment: 'Timing data from mobile SDK'
  };
}

/**
 * Parse cookies from request/response headers
 */
function parseCookiesFromHeaders(headers: Array<{name: string, value: string}>, type: 'request' | 'response') {
  const cookieHeader = headers.find(h =>
    h.name.toLowerCase() === (type === 'request' ? 'cookie' : 'set-cookie')
  );

  if (!cookieHeader) {
    return [];
  }

  // Simple cookie parsing (production code should use a proper cookie parser)
  const cookieStrings = cookieHeader.value.split(';').map(s => s.trim());

  return cookieStrings.map(cookieString => {
    const [nameValue, ...attributes] = cookieString.split(';');
    const [name, value] = nameValue.split('=');

    return {
      name: name.trim(),
      value: value ? value.trim() : '',
      path: undefined,
      domain: undefined,
      expires: undefined,
      httpOnly: attributes.some(attr => attr.toLowerCase() === 'httponly'),
      secure: attributes.some(attr => attr.toLowerCase() === 'secure'),
      comment: undefined
    };
  });
}

/**
 * Calculate approximate size of headers in bytes
 */
function calculateHeadersSize(headers: Array<{name: string, value: string}>): number {
  // Each header: "Name: Value\r\n"
  return headers.reduce((total, header) => {
    return total + header.name.length + 2 + header.value.length + 2;
  }, 0);
}

/**
 * Get MIME type from Content-Type header
 */
function getMimeTypeFromHeaders(headers: Array<{name: string, value: string}>): string | undefined {
  const contentType = headers.find(h => h.name.toLowerCase() === 'content-type');
  if (!contentType) return undefined;

  // Extract MIME type (before semicolon if present)
  const mimeType = contentType.value.split(';')[0].trim();
  return mimeType;
}

/**
 * Get redirect URL from Location header
 */
function getRedirectURL(headers: Array<{name: string, value: string}>): string {
  const location = headers.find(h => h.name.toLowerCase() === 'location');
  return location?.value || '';
}

/**
 * Extract hostname from URL
 */
function extractHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Download HAR data as file
 */
export async function downloadHAR(harData: HAR, filename: string = 'network-log.har'): Promise<void> {
  // Check if we're in Electron
  if (window.electronAPI) {
    // Use Electron IPC to save file with dialog
    const result = await window.electronAPI.invoke('mobile:network-export-har', {
      harData,
      filename
    });

    if (!result.success && result.error !== 'User canceled') {
      throw new Error(result.error || 'Failed to export HAR');
    }
  } else {
    // Fallback: Browser download
    const json = JSON.stringify(harData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format duration to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}
