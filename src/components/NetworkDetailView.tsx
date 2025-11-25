import React, { useState } from 'react';
import { NetworkEntry } from '../types/network';
import { formatBytes, formatDuration } from '../utils/harExporter';

interface NetworkDetailViewProps {
  entry: NetworkEntry;
}

type Tab = 'headers' | 'request' | 'response' | 'timing';

/**
 * NetworkDetailView Component
 *
 * Shows detailed information about a selected network request
 * with tabs for Headers, Request, Response, and Timing
 */
export const NetworkDetailView: React.FC<NetworkDetailViewProps> = ({ entry }) => {
  const [activeTab, setActiveTab] = useState<Tab>('headers');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatJSON = (text: string): string => {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  const decodeBase64 = (base64: string): string => {
    try {
      return atob(base64);
    } catch {
      return base64;
    }
  };

  const renderHeaders = () => {
    const allHeaders = [
      { section: 'Request Headers', headers: entry.request.headers },
      ...(entry.response ? [{ section: 'Response Headers', headers: entry.response.headers }] : [])
    ];

    return (
      <div className="detail-content">
        {allHeaders.map(({ section, headers }) => (
          <div key={section} className="header-section">
            <h4 className="section-title">{section}</h4>
            <table className="headers-table">
              <tbody>
                {headers.map((header, idx) => (
                  <tr key={idx}>
                    <td className="header-name">{header.name}:</td>
                    <td className="header-value">
                      {header.value}
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(header.value)}
                        title="Copy value"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  const renderRequest = () => {
    const hasBody = entry.request.body && entry.request.body.length > 0;

    return (
      <div className="detail-content">
        <div className="info-section">
          <h4 className="section-title">General</h4>
          <table className="info-table">
            <tbody>
              <tr>
                <td className="info-label">URL:</td>
                <td className="info-value">
                  {entry.request.url}
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(entry.request.url)}
                    title="Copy URL"
                  >
                    📋
                  </button>
                </td>
              </tr>
              <tr>
                <td className="info-label">Method:</td>
                <td className="info-value">{entry.request.method}</td>
              </tr>
              <tr>
                <td className="info-label">Body Size:</td>
                <td className="info-value">{formatBytes(entry.request.bodySize)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {hasBody && (
          <div className="body-section">
            <h4 className="section-title">
              Request Body
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(entry.request.body || '')}
                title="Copy body"
              >
                📋
              </button>
            </h4>
            <pre className="body-content">
              {formatJSON(entry.request.body || '')}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderResponse = () => {
    if (!entry.response) {
      return (
        <div className="detail-content">
          <div className="empty-state">
            {entry.error ? (
              <>
                <div className="error-icon">❌</div>
                <div className="error-message">Request Failed</div>
                <div className="error-detail">{entry.error}</div>
              </>
            ) : (
              <>
                <div className="pending-icon">⏳</div>
                <div className="pending-message">Waiting for response...</div>
              </>
            )}
          </div>
        </div>
      );
    }

    const hasBody = entry.response.body && entry.response.body.length > 0;

    return (
      <div className="detail-content">
        <div className="info-section">
          <h4 className="section-title">General</h4>
          <table className="info-table">
            <tbody>
              <tr>
                <td className="info-label">Status:</td>
                <td className="info-value">
                  <span
                    style={{
                      color: entry.response.status >= 400 ? '#ff6b6b' : '#51cf66',
                      fontWeight: 600
                    }}
                  >
                    {entry.response.status} {entry.response.statusText}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="info-label">MIME Type:</td>
                <td className="info-value">{entry.response.mimeType || 'Unknown'}</td>
              </tr>
              <tr>
                <td className="info-label">Body Size:</td>
                <td className="info-value">{formatBytes(entry.response.bodySize)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {hasBody && (
          <div className="body-section">
            <h4 className="section-title">
              Response Body
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(entry.response?.body || '')}
                title="Copy body"
              >
                📋
              </button>
            </h4>
            <pre className="body-content">
              {formatJSON(entry.response.body || '')}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderTiming = () => {
    const timingPhases = [
      { name: 'DNS Lookup', time: entry.timing.dnsLookup, color: '#51cf66' },
      { name: 'TCP Connection', time: entry.timing.tcpConnection, color: '#339af0' },
      { name: 'TLS Handshake', time: entry.timing.tlsHandshake, color: '#cc8e35' },
      { name: 'Request Sent', time: entry.timing.requestSent, color: '#ffa500' },
      { name: 'Waiting (TTFB)', time: entry.timing.waiting, color: '#ff6b6b' },
      { name: 'Content Download', time: entry.timing.contentDownload, color: '#845ef7' }
    ].filter(phase => phase.time && phase.time > 0);

    const maxTime = entry.timing.totalDuration;

    return (
      <div className="detail-content">
        <div className="info-section">
          <h4 className="section-title">Summary</h4>
          <table className="info-table">
            <tbody>
              <tr>
                <td className="info-label">Total Duration:</td>
                <td className="info-value">
                  <strong>{formatDuration(entry.timing.totalDuration)}</strong>
                </td>
              </tr>
              <tr>
                <td className="info-label">Start Time:</td>
                <td className="info-value">
                  {new Date(entry.timing.startTime).toLocaleTimeString()}
                </td>
              </tr>
              {entry.timing.endTime && (
                <tr>
                  <td className="info-label">End Time:</td>
                  <td className="info-value">
                    {new Date(entry.timing.endTime).toLocaleTimeString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {timingPhases.length > 0 && (
          <div className="timing-section">
            <h4 className="section-title">Timing Breakdown</h4>
            <div className="timing-waterfall">
              {timingPhases.map((phase, idx) => (
                <div key={idx} className="timing-phase">
                  <div className="phase-name">{phase.name}</div>
                  <div className="phase-bar-container">
                    <div
                      className="phase-bar"
                      style={{
                        width: `${(phase.time! / maxTime) * 100}%`,
                        background: phase.color
                      }}
                    />
                  </div>
                  <div className="phase-time">{phase.time}ms</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="network-detail-view">
      {/* Tabs */}
      <div className="detail-tabs">
        <button
          className={`tab ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers
        </button>
        <button
          className={`tab ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          Request
        </button>
        <button
          className={`tab ${activeTab === 'response' ? 'active' : ''}`}
          onClick={() => setActiveTab('response')}
        >
          Response
        </button>
        <button
          className={`tab ${activeTab === 'timing' ? 'active' : ''}`}
          onClick={() => setActiveTab('timing')}
        >
          Timing
        </button>
      </div>

      {/* Tab Content */}
      <div className="detail-panel">
        {activeTab === 'headers' && renderHeaders()}
        {activeTab === 'request' && renderRequest()}
        {activeTab === 'response' && renderResponse()}
        {activeTab === 'timing' && renderTiming()}
      </div>

      <style>{`
        .network-detail-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1a1a1a;
        }

        .detail-tabs {
          display: flex;
          gap: 2px;
          background: #1e1e1e;
          border-bottom: 1px solid #333;
          padding: 0 12px;
        }

        .tab {
          padding: 10px 16px;
          background: transparent;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .tab:hover {
          color: #ccc;
          background: #252525;
        }

        .tab.active {
          color: #0066cc;
          border-bottom-color: #0066cc;
        }

        .detail-panel {
          flex: 1;
          overflow-y: auto;
        }

        .detail-content {
          padding: 16px;
        }

        .section-title {
          margin: 0 0 12px 0;
          color: #ccc;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-section,
        .info-section,
        .body-section,
        .timing-section {
          margin-bottom: 24px;
        }

        .headers-table,
        .info-table {
          width: 100%;
          font-size: 13px;
          border-collapse: collapse;
        }

        .headers-table td,
        .info-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #2a2a2a;
        }

        .header-name,
        .info-label {
          color: #999;
          width: 200px;
          vertical-align: top;
          font-weight: 500;
        }

        .header-value,
        .info-value {
          color: #ccc;
          word-break: break-all;
          position: relative;
        }

        .copy-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 2px 4px;
          margin-left: 8px;
          font-size: 12px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .header-value:hover .copy-btn,
        .info-value:hover .copy-btn,
        .section-title:hover .copy-btn {
          opacity: 1;
        }

        .copy-btn:hover {
          color: #ccc;
        }

        .body-content {
          background: #0d0d0d;
          border: 1px solid #2a2a2a;
          border-radius: 4px;
          padding: 12px;
          color: #ccc;
          font-size: 12px;
          font-family: 'Courier New', monospace;
          overflow-x: auto;
          max-height: 400px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #666;
        }

        .error-icon,
        .pending-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error-message,
        .pending-message {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .error-detail {
          font-size: 13px;
          color: #999;
        }

        .timing-waterfall {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .timing-phase {
          display: grid;
          grid-template-columns: 150px 1fr 80px;
          gap: 12px;
          align-items: center;
        }

        .phase-name {
          color: #999;
          font-size: 13px;
        }

        .phase-bar-container {
          height: 24px;
          background: #0d0d0d;
          border-radius: 4px;
          overflow: hidden;
        }

        .phase-bar {
          height: 100%;
          transition: width 0.3s;
        }

        .phase-time {
          color: #ccc;
          font-size: 13px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
};
