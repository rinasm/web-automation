import React, { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { exportToHAR, downloadHAR, formatBytes } from '../utils/harExporter';
import type { HttpMethod } from '../types/network';

/**
 * NetworkToolbar Component
 *
 * Provides controls for the network panel:
 * - Clear entries
 * - Export to HAR
 * - Filter by type/status/method
 * - Search
 * - Toggle monitoring
 */
export const NetworkToolbar: React.FC = () => {
  const {
    entries,
    filter,
    setFilter,
    resetFilter,
    clearEntries,
    isMonitoring,
    toggleMonitoring,
    stats
  } = useNetworkStore();

  const [searchValue, setSearchValue] = useState(filter.search);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    setFilter({ search: value });
  };

  const handleClearSearch = () => {
    setSearchValue('');
    setFilter({ search: '' });
  };

  const handleClear = () => {
    if (confirm('Clear all network entries?')) {
      clearEntries();
    }
  };

  const handleExport = async () => {
    try {
      const har = exportToHAR(entries, 'Mobile App Network Log');
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      await downloadHAR(har, `network-log-${timestamp}.har`);
    } catch (error) {
      console.error('Failed to export HAR:', error);
      alert('Failed to export network log');
    }
  };

  const handleFilterChange = (key: keyof typeof filter, value: any) => {
    setFilter({ [key]: value });
  };

  return (
    <div className="network-toolbar">
      {/* Top Row: Actions and Stats */}
      <div className="toolbar-row">
        <div className="toolbar-actions">
          {/* Monitoring Toggle */}
          <button
            className={`btn-icon ${isMonitoring ? 'active' : ''}`}
            onClick={toggleMonitoring}
            title={isMonitoring ? 'Stop monitoring' : 'Start monitoring'}
          >
            <span className={`monitor-indicator ${isMonitoring ? 'recording' : ''}`}>●</span>
          </button>

          {/* Clear */}
          <button
            className="btn-icon"
            onClick={handleClear}
            title="Clear network entries"
            disabled={entries.length === 0}
          >
            🗑️
          </button>

          {/* Export */}
          <button
            className="btn-icon"
            onClick={handleExport}
            title="Export as HAR"
            disabled={entries.length === 0}
          >
            💾
          </button>

          {/* Reset Filters */}
          <button
            className="btn-icon"
            onClick={resetFilter}
            title="Reset filters"
            disabled={
              filter.type === 'all' &&
              filter.status === 'all' &&
              filter.method === 'all' &&
              filter.search === ''
            }
          >
            ↻
          </button>
        </div>

        {/* Stats */}
        <div className="toolbar-stats">
          <span className="stat">
            {stats.totalRequests} requests
          </span>
          <span className="stat">
            {formatBytes(stats.totalSize)}
          </span>
          <span className="stat">
            {stats.averageDuration.toFixed(0)}ms avg
          </span>
          {stats.errorCount > 0 && (
            <span className="stat error">
              {stats.errorCount} errors
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row: Filters */}
      <div className="toolbar-row">
        {/* Search */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search URL, headers, body..."
            value={searchValue}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchValue && (
            <button className="clear-search" onClick={handleClearSearch}>
              ×
            </button>
          )}
        </div>

        {/* Type Filter */}
        <select
          className="filter-select"
          value={filter.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="http">HTTP</option>
          <option value="websocket">WebSocket</option>
          <option value="xhr">XHR</option>
          <option value="fetch">Fetch</option>
        </select>

        {/* Status Filter */}
        <select
          className="filter-select"
          value={filter.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="2xx">2xx Success</option>
          <option value="3xx">3xx Redirect</option>
          <option value="4xx">4xx Client Error</option>
          <option value="5xx">5xx Server Error</option>
        </select>

        {/* Method Filter */}
        <select
          className="filter-select"
          value={filter.method || 'all'}
          onChange={(e) => handleFilterChange('method', e.target.value)}
        >
          <option value="all">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
      </div>

      <style>{`
        .network-toolbar {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: #1e1e1e;
          border-bottom: 1px solid #333;
        }

        .toolbar-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .toolbar-actions {
          display: flex;
          gap: 4px;
        }

        .btn-icon {
          padding: 6px 12px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 4px;
          color: #ccc;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-icon:hover:not(:disabled) {
          background: #333;
          border-color: #666;
        }

        .btn-icon:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-icon.active {
          background: #0066cc;
          border-color: #0077ee;
        }

        .monitor-indicator {
          font-size: 16px;
          color: #666;
          transition: color 0.3s;
        }

        .monitor-indicator.recording {
          color: #ff4444;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .toolbar-stats {
          display: flex;
          gap: 16px;
          margin-left: auto;
          font-size: 13px;
        }

        .stat {
          color: #999;
        }

        .stat.error {
          color: #ff6b6b;
          font-weight: 500;
        }

        .search-box {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-input {
          width: 100%;
          padding: 6px 32px 6px 10px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 4px;
          color: #ccc;
          font-size: 13px;
        }

        .search-input:focus {
          outline: none;
          border-color: #0066cc;
        }

        .search-input::placeholder {
          color: #666;
        }

        .clear-search {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #999;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clear-search:hover {
          color: #ccc;
        }

        .filter-select {
          padding: 6px 10px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 4px;
          color: #ccc;
          font-size: 13px;
          cursor: pointer;
        }

        .filter-select:hover {
          border-color: #666;
        }

        .filter-select:focus {
          outline: none;
          border-color: #0066cc;
        }
      `}</style>
    </div>
  );
};
