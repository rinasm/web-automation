import React from 'react';
import { NetworkEntry } from '../types/network';
import { formatBytes, formatDuration } from '../utils/harExporter';

interface NetworkEntryRowProps {
  entry: NetworkEntry;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * NetworkEntryRow Component
 *
 * Displays a single network request entry in the list
 * Shows: Method, URL, Status, Type, Size, Time
 */
export const NetworkEntryRow: React.FC<NetworkEntryRowProps> = ({
  entry,
  isSelected,
  onClick
}) => {
  // Determine status color
  const getStatusColor = (): string => {
    if (entry.error) return '#ff6b6b';
    if (!entry.response) return '#ffa500';

    const status = entry.response.status;
    if (status >= 200 && status < 300) return '#51cf66';
    if (status >= 300 && status < 400) return '#339af0';
    if (status >= 400 && status < 500) return '#ffa500';
    if (status >= 500) return '#ff6b6b';

    return '#999';
  };

  // Get method color
  const getMethodColor = (): string => {
    switch (entry.request.method) {
      case 'GET':
        return '#51cf66';
      case 'POST':
        return '#339af0';
      case 'PUT':
        return '#ffa500';
      case 'DELETE':
        return '#ff6b6b';
      case 'PATCH':
        return '#cc8e35';
      default:
        return '#999';
    }
  };

  // Extract domain from URL
  const getDomain = (): string => {
    try {
      const url = new URL(entry.request.url);
      return url.hostname;
    } catch {
      return entry.request.url;
    }
  };

  // Extract path from URL
  const getPath = (): string => {
    try {
      const url = new URL(entry.request.url);
      return url.pathname + url.search;
    } catch {
      return entry.request.url;
    }
  };

  // Calculate total size
  const getTotalSize = (): number => {
    return entry.request.bodySize + (entry.response?.bodySize || 0);
  };

  // Get type icon
  const getTypeIcon = (): string => {
    switch (entry.type) {
      case 'websocket':
        return '⚡';
      case 'xhr':
        return '📡';
      case 'fetch':
        return '🔄';
      default:
        return '🌐';
    }
  };

  return (
    <div
      className={`network-entry-row ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Type Icon */}
      <div className="entry-icon" title={entry.type}>
        {getTypeIcon()}
      </div>

      {/* Method */}
      <div
        className="entry-method"
        style={{ color: getMethodColor() }}
        title={entry.request.method}
      >
        {entry.request.method}
      </div>

      {/* Status */}
      <div
        className="entry-status"
        style={{ color: getStatusColor() }}
        title={entry.response?.statusText || entry.error || 'Pending'}
      >
        {entry.error
          ? 'ERR'
          : entry.response
          ? entry.response.status
          : '...'}
      </div>

      {/* URL */}
      <div className="entry-url">
        <div className="entry-domain" title={getDomain()}>
          {getDomain()}
        </div>
        <div className="entry-path" title={getPath()}>
          {getPath()}
        </div>
      </div>

      {/* Size */}
      <div className="entry-size" title={`${getTotalSize()} bytes`}>
        {formatBytes(getTotalSize())}
      </div>

      {/* Time */}
      <div
        className="entry-time"
        title={`${entry.timing.totalDuration}ms`}
      >
        {formatDuration(entry.timing.totalDuration)}
      </div>

      {/* Waterfall (simplified visual) */}
      <div className="entry-waterfall">
        <div
          className="waterfall-bar"
          style={{
            width: `${Math.min(entry.timing.totalDuration / 10, 100)}%`,
            background: getStatusColor()
          }}
        />
      </div>

      <style>{`
        .network-entry-row {
          display: grid;
          grid-template-columns: 30px 60px 50px 1fr 70px 70px 100px;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid #2a2a2a;
          cursor: pointer;
          transition: background 0.15s;
          font-size: 13px;
          align-items: center;
        }

        .network-entry-row:hover {
          background: #252525;
        }

        .network-entry-row.selected {
          background: #2a3f5f;
        }

        .entry-icon {
          font-size: 16px;
          text-align: center;
        }

        .entry-method {
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
        }

        .entry-status {
          font-weight: 600;
          text-align: center;
        }

        .entry-url {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .entry-domain {
          color: #999;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .entry-path {
          color: #ccc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .entry-size,
        .entry-time {
          color: #999;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .entry-waterfall {
          position: relative;
          height: 20px;
          background: #1a1a1a;
          border-radius: 2px;
          overflow: hidden;
        }

        .waterfall-bar {
          height: 100%;
          transition: width 0.3s;
        }
      `}</style>
    </div>
  );
};
