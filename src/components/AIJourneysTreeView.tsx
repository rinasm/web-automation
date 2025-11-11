import { useState, useMemo } from 'react'
import { useAIJourneysStore } from '../store/aiJourneysStore'
import { AIJourneyNode } from '../types/journey'

interface TreeNodeProps {
  nodeKey: string
  node: AIJourneyNode
  depth: number
  onNodeClick: (key: string, node: AIJourneyNode) => void
  selectedKey: string | null
}

const TreeNode: React.FC<TreeNodeProps> = ({ nodeKey, node, depth, onNodeClick, selectedKey }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2) // Auto-expand first 2 levels
  const store = useAIJourneysStore()

  const hasChildren = node.children.length > 0
  const isSelected = selectedKey === nodeKey

  // Extract page name from URL
  const pageName = useMemo(() => {
    try {
      const url = new URL(node.url)
      const path = url.pathname === '/' ? 'Home' : url.pathname.split('/').filter(Boolean).pop() || 'Page'
      return path
    } catch {
      return nodeKey.split('_').pop() || 'Unknown'
    }
  }, [node.url, nodeKey])

  // Count total meaningful elements
  const totalElements = node.meaningfulElements.length
  const visitedElements = node.meaningfulElements.filter(el => el.visited).length
  const unvisitedElements = totalElements - visitedElements

  return (
    <div className="relative">
      {/* Connection Line */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 w-4 h-6 border-l-2 border-b-2 border-gray-300 rounded-bl-md" />
      )}

      {/* Node Card */}
      <div
        className={`ml-${depth * 6} mb-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
        }`}
        onClick={() => onNodeClick(nodeKey, node)}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-2">
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          {/* Node Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">{pageName}</span>
              {node.parent && (
                <span className="text-xs text-gray-500 italic truncate">
                  via "{node.parent}"
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600 truncate mt-1">{node.url}</div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-gray-600">
                Elements: <span className="font-semibold text-gray-800">{totalElements}</span>
              </span>
              <span className="text-green-600">
                Visited: <span className="font-semibold">{visitedElements}</span>
              </span>
              {unvisitedElements > 0 && (
                <span className="text-orange-600">
                  Unvisited: <span className="font-semibold">{unvisitedElements}</span>
                </span>
              )}
              {hasChildren && (
                <span className="text-blue-600">
                  Children: <span className="font-semibold">{node.children.length}</span>
                </span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex-shrink-0">
            {unvisitedElements === 0 && totalElements > 0 ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ Explored
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                ⋯ Partial
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Child Nodes */}
      {isExpanded && hasChildren && (
        <div className="ml-6 border-l-2 border-gray-200 pl-2">
          {node.children.map((childKey) => {
            const childNode = store.getNode(childKey)
            if (!childNode) return null
            return (
              <TreeNode
                key={childKey}
                nodeKey={childKey}
                node={childNode}
                depth={depth + 1}
                onNodeClick={onNodeClick}
                selectedKey={selectedKey}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

interface NodeDetailsPanelProps {
  nodeKey: string
  node: AIJourneyNode
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ nodeKey, node }) => {
  const [showAllElements, setShowAllElements] = useState(false)

  return (
    <div className="h-full overflow-y-auto p-4 bg-gray-50">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Node Details</h3>

      {/* Basic Info */}
      <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Basic Information</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-600">Key:</span>
            <span className="ml-2 font-mono text-xs text-gray-800 break-all">{nodeKey}</span>
          </div>
          <div>
            <span className="text-gray-600">URL:</span>
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:underline break-all"
            >
              {node.url}
            </a>
          </div>
          <div>
            <span className="text-gray-600">Parent Action:</span>
            <span className="ml-2 text-gray-800">{node.parent || 'Root'}</span>
          </div>
          <div>
            <span className="text-gray-600">Children:</span>
            <span className="ml-2 text-gray-800">{node.children.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Scanned At:</span>
            <span className="ml-2 text-gray-800">
              {new Date(node.scannedAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Page Context */}
      <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">AI Page Context</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{node.pageContext}</p>
      </div>

      {/* Meaningful Elements */}
      <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">
            Meaningful Elements ({node.meaningfulElements.length})
          </h4>
          {node.meaningfulElements.length > 5 && (
            <button
              onClick={() => setShowAllElements(!showAllElements)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showAllElements ? 'Show Less' : 'Show All'}
            </button>
          )}
        </div>
        <div className="space-y-3">
          {(showAllElements ? node.meaningfulElements : node.meaningfulElements.slice(0, 5)).map(
            (element, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${
                  element.visited
                    ? 'bg-green-50 border-green-200'
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-600 uppercase">
                        {element.type}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{element.label}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{element.context}</p>
                    {element.text && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Text:</span> {element.text}
                      </div>
                    )}
                    {element.href && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Href:</span> {element.href}
                      </div>
                    )}
                    <div className="text-xs font-mono text-gray-400 mt-1 truncate">
                      {element.selector}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {element.visited ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✓ Visited
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        ⋯ Unvisited
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
          {!showAllElements && node.meaningfulElements.length > 5 && (
            <div className="text-center text-xs text-gray-500">
              ... and {node.meaningfulElements.length - 5} more elements
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Statistics</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-600">Total Elements</div>
            <div className="text-xl font-bold text-gray-900">{node.interactableElements.length}</div>
          </div>
          <div>
            <div className="text-gray-600">Meaningful</div>
            <div className="text-xl font-bold text-blue-600">{node.meaningfulElements.length}</div>
          </div>
          <div>
            <div className="text-gray-600">Visited</div>
            <div className="text-xl font-bold text-green-600">
              {node.meaningfulElements.filter((el) => el.visited).length}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Unvisited</div>
            <div className="text-xl font-bold text-orange-600">
              {node.meaningfulElements.filter((el) => !el.visited).length}
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            Filtering efficiency:{' '}
            <span className="font-semibold text-gray-900">
              {((node.meaningfulElements.length / node.interactableElements.length) * 100).toFixed(
                1
              )}
              %
            </span>{' '}
            meaningful ({node.interactableElements.length - node.meaningfulElements.length} filtered
            out)
          </div>
        </div>
      </div>
    </div>
  )
}

export const AIJourneysTreeView: React.FC = () => {
  const store = useAIJourneysStore()
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null)

  // Find root nodes (nodes with no parent or parent = null)
  const rootNodes = useMemo(() => {
    const roots: Array<{ key: string; node: AIJourneyNode }> = []
    Object.entries(store.journeys).forEach(([key, node]) => {
      if (!node.parent) {
        roots.push({ key, node })
      }
    })
    // Sort by timestamp (oldest first)
    return roots.sort((a, b) => a.node.timestamp - b.node.timestamp)
  }, [store.journeys])

  const selectedNode = selectedNodeKey ? store.getNode(selectedNodeKey) : null

  const totalNodes = Object.keys(store.journeys).length
  const totalElements = useMemo(() => {
    return Object.values(store.journeys).reduce(
      (sum, node) => sum + node.meaningfulElements.length,
      0
    )
  }, [store.journeys])
  const totalVisited = useMemo(() => {
    return Object.values(store.journeys).reduce(
      (sum, node) => sum + node.meaningfulElements.filter((el) => el.visited).length,
      0
    )
  }, [store.journeys])

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all cached pages? This cannot be undone.')) {
      store.clearAll()
      setSelectedNodeKey(null)
    }
  }

  const handleExport = () => {
    const data = JSON.stringify(store.journeys, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-journeys-map-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (totalNodes === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Application Map Yet</h3>
          <p className="text-sm text-gray-600 max-w-md">
            Start an AI exploration to build an intelligent map of your application. The map will
            persist across sessions and be reused on future explorations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">AI Journeys Map</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="text-xs text-blue-600 font-medium">Total Nodes</div>
            <div className="text-2xl font-bold text-blue-900">{totalNodes}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
            <div className="text-xs text-purple-600 font-medium">Meaningful Elements</div>
            <div className="text-2xl font-bold text-purple-900">{totalElements}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="text-xs text-green-600 font-medium">Visited</div>
            <div className="text-2xl font-bold text-green-900">{totalVisited}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
            <div className="text-xs text-orange-600 font-medium">Unvisited</div>
            <div className="text-2xl font-bold text-orange-900">{totalElements - totalVisited}</div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree View */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {rootNodes.map(({ key, node }) => (
              <TreeNode
                key={key}
                nodeKey={key}
                node={node}
                depth={0}
                onNodeClick={setSelectedNodeKey}
                selectedKey={selectedNodeKey}
              />
            ))}
          </div>
        </div>

        {/* Details Panel */}
        {selectedNode && selectedNodeKey && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
            <NodeDetailsPanel nodeKey={selectedNodeKey} node={selectedNode} />
          </div>
        )}
      </div>
    </div>
  )
}
