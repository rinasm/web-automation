// Network Tab Types

export type NetworkEntryType = 'http' | 'websocket' | 'fetch' | 'xhr';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE';

export interface NetworkTiming {
  startTime: number;          // Unix timestamp in ms
  dnsLookup?: number;         // DNS resolution time in ms
  tcpConnection?: number;     // TCP connection time in ms
  tlsHandshake?: number;      // TLS handshake time in ms
  requestSent?: number;       // Time to send request in ms
  waiting?: number;           // Time waiting for response in ms
  contentDownload?: number;   // Time to download response in ms
  totalDuration: number;      // Total time in ms
  endTime: number;            // Unix timestamp in ms
}

export interface NetworkHeader {
  name: string;
  value: string;
}

export interface NetworkRequest {
  method: HttpMethod | string;
  url: string;
  headers: NetworkHeader[];
  body?: string;              // Request body (JSON, form data, etc.)
  bodySize: number;           // Size in bytes
  queryParams?: Record<string, string>;
}

export interface NetworkResponse {
  status: number;
  statusText: string;
  headers: NetworkHeader[];
  body?: string;              // Response body
  bodySize: number;           // Size in bytes
  mimeType?: string;          // Content-Type
}

export interface WebSocketMessage {
  direction: 'sent' | 'received';
  data: string;
  timestamp: number;
  size: number;
}

export interface NetworkEntry {
  id: string;                 // Unique identifier
  type: NetworkEntryType;     // Type of request
  request: NetworkRequest;
  response?: NetworkResponse;
  timing: NetworkTiming;
  error?: string;             // Error message if failed
  deviceId?: string;          // Which mobile device this came from
  isSDKMessage?: boolean;     // Is this an SDK WebSocket message
  websocketMessages?: WebSocketMessage[]; // For WebSocket connections
}

export interface NetworkFilter {
  type: NetworkEntryType | 'all';
  status: 'all' | '2xx' | '3xx' | '4xx' | '5xx';
  search: string;             // Search in URL, headers, body
  method?: HttpMethod | 'all';
}

export interface NetworkStats {
  totalRequests: number;
  totalSize: number;          // Total bytes transferred
  averageDuration: number;    // Average request time
  errorCount: number;
}

// HAR (HTTP Archive) Format Types
// Based on HAR 1.2 spec: http://www.softwareishard.com/blog/har-12-spec/

export interface HAREntry {
  startedDateTime: string;    // ISO 8601
  time: number;               // Total elapsed time in ms
  request: HARRequest;
  response: HARResponse;
  cache: HARCache;
  timings: HARTimings;
  serverIPAddress?: string;
  connection?: string;
  comment?: string;
}

export interface HARRequest {
  method: string;
  url: string;
  httpVersion: string;
  cookies: HARCookie[];
  headers: HARHeader[];
  queryString: HARQueryParam[];
  postData?: HARPostData;
  headersSize: number;
  bodySize: number;
  comment?: string;
}

export interface HARResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  cookies: HARCookie[];
  headers: HARHeader[];
  content: HARContent;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
  comment?: string;
}

export interface HARCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  comment?: string;
}

export interface HARHeader {
  name: string;
  value: string;
  comment?: string;
}

export interface HARQueryParam {
  name: string;
  value: string;
  comment?: string;
}

export interface HARPostData {
  mimeType: string;
  params: HARParam[];
  text: string;
  comment?: string;
}

export interface HARParam {
  name: string;
  value?: string;
  fileName?: string;
  contentType?: string;
  comment?: string;
}

export interface HARContent {
  size: number;
  compression?: number;
  mimeType: string;
  text?: string;
  encoding?: string;
  comment?: string;
}

export interface HARCache {
  beforeRequest?: HARCacheEntry;
  afterRequest?: HARCacheEntry;
  comment?: string;
}

export interface HARCacheEntry {
  expires?: string;
  lastAccess: string;
  eTag: string;
  hitCount: number;
  comment?: string;
}

export interface HARTimings {
  blocked?: number;
  dns?: number;
  connect?: number;
  send: number;
  wait: number;
  receive: number;
  ssl?: number;
  comment?: string;
}

export interface HARLog {
  version: string;            // HAR version (e.g., "1.2")
  creator: HARCreator;
  browser?: HARBrowser;
  pages?: HARPage[];
  entries: HAREntry[];
  comment?: string;
}

export interface HARCreator {
  name: string;
  version: string;
  comment?: string;
}

export interface HARBrowser {
  name: string;
  version: string;
  comment?: string;
}

export interface HARPage {
  startedDateTime: string;
  id: string;
  title: string;
  pageTimings: HARPageTimings;
  comment?: string;
}

export interface HARPageTimings {
  onContentLoad?: number;
  onLoad?: number;
  comment?: string;
}

export interface HAR {
  log: HARLog;
}
