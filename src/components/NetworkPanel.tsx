import React, { useEffect, useState, useRef } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { NetworkToolbar } from './NetworkToolbar';
import { NetworkEntryRow } from './NetworkEntryRow';
import { NetworkDetailView } from './NetworkDetailView';
import { initializeNetworkListener } from '../services/networkListener';

interface NetworkPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

/**
 * NetworkPanel Component
 *
 * Main container for the network monitoring panel
 * - Displays on the right side of the screen
 * - Resizable width
 * - Shows list of network entries
 * - Shows detailed view of selected entry
 */
export const NetworkPanel: React.FC<NetworkPanelProps> = ({ isVisible, onClose }) => {
  const {
    selectedEntryId,
    setSelectedEntry,
    getFilteredEntries,
    getEntryById
  } = useNetworkStore();

  const [panelWidth, setPanelWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const filteredEntries = getFilteredEntries();
  const selectedEntry = selectedEntryId ? getEntryById(selectedEntryId) : null;

  // Initialize network listener on mount
  useEffect(() => {
    const unsubscribe = initializeNetworkListener();
    return unsubscribe;
  }, []);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(400, Math.min(1200, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Resize Handle */}
      <div
        className={`network-panel-resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleResizeStart}
        style={{ right: `${panelWidth}px` }}
      />

      {/* Main Panel */}
      <div
        ref={panelRef}
        className="network-panel"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Header */}
        <div className="network-header">
          <h3 className="network-title">Network</h3>
          <button className="close-btn" onClick={onClose} title="Close network panel">
            ×
          </button>
        </div>

        {/* Toolbar */}
        <NetworkToolbar />

        {/* Content Area */}
        <div className="network-content">
          {/* Entry List */}
          <div className="network-list">
            {filteredEntries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📡</div>
                <div className="empty-message">No network requests</div>
                <div className="empty-hint">
                  Network requests will appear here when the app makes HTTP calls
                </div>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <NetworkEntryRow
                  key={entry.id}
                  entry={entry}
                  isSelected={entry.id === selectedEntryId}
                  onClick={() => setSelectedEntry(entry.id)}
                />
              ))
            )}
          </div>

          {/* Detail View */}
          {selectedEntry && (
            <div className="network-detail">
              <NetworkDetailView entry={selectedEntry} />
            </div>
          )}
        </div>

        <style>{`
          .network-panel-resize-handle {
            position: fixed;
            top: 64px;
            width: 4px;
            height: calc(100% - 64px);
            cursor: ew-resize;
            background: transparent;
            z-index: 1001;
            transition: background 0.2s;
          }

          .network-panel-resize-handle:hover,
          .network-panel-resize-handle.resizing {
            background: #0066cc;
          }

          .network-panel {
            position: fixed;
            top: 64px;
            right: 0;
            height: calc(100% - 64px);
            background: #1e1e1e;
            border-left: 1px solid #333;
            display: flex;
            flex-direction: column;
            z-index: 1000;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
          }

          .network-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #252525;
            border-bottom: 1px solid #333;
          }

          .network-title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #ccc;
          }

          .close-btn {
            background: none;
            border: none;
            color: #999;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
          }

          .close-btn:hover {
            color: #ccc;
          }

          .network-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .network-list {
            flex: ${selectedEntry ? '0 0 50%' : '1'};
            overflow-y: auto;
            border-bottom: ${selectedEntry ? '1px solid #333' : 'none'};
          }

          .network-list::-webkit-scrollbar {
            width: 8px;
          }

          .network-list::-webkit-scrollbar-track {
            background: #1a1a1a;
          }

          .network-list::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 4px;
          }

          .network-list::-webkit-scrollbar-thumb:hover {
            background: #555;
          }

          .network-detail {
            flex: 1;
            overflow: hidden;
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: #666;
            text-align: center;
          }

          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
          }

          .empty-message {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .empty-hint {
            font-size: 13px;
            color: #555;
            max-width: 300px;
          }
        `}</style>
      </div>
    </>
  );
};
