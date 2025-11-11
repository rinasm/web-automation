import { X, Calendar, TrendingUp, Route, ArrowRight, Trash2, Play } from 'lucide-react'
import { ExploredJourney } from '../types/journey'

interface JourneyDetailViewProps {
  journey: ExploredJourney
  onClose: () => void
  onDelete?: () => void
  onPlay?: () => void
}

function JourneyDetailView({ journey, onClose, onDelete, onPlay }: JourneyDetailViewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{journey.name}</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Discovered by AI • {new Date(journey.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status & Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-indigo-600" />
                <span className="text-sm font-medium text-gray-600">Confidence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all"
                    style={{ width: `${journey.confidence}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-gray-800">{journey.confidence}%</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Route size={18} className="text-green-600" />
                <span className="text-sm font-medium text-gray-600">Steps</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{journey.steps.length}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Status</span>
              </div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  journey.status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : journey.status === 'discarded'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {journey.status}
              </span>
            </div>
          </div>

          {/* Completion Reason */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Why This Journey?</h3>
            <p className="text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
              {journey.completionReason}
            </p>
          </div>

          {/* Journey Path */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Journey Path</h3>
            <div className="space-y-3">
              {journey.path.map((node, index) => (
                <div key={node.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? 'bg-blue-100 text-blue-600'
                          : index === journey.path.length - 1
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    {index < journey.path.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-300 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pt-2">
                    <div className="font-semibold text-gray-800">{node.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{node.pageContext.title}</div>
                    <div className="text-xs text-gray-400 mt-1 font-mono truncate">
                      {node.pageContext.url}
                    </div>
                    {node.aiReasoning && (
                      <div className="text-xs text-indigo-600 mt-2 italic bg-indigo-50 p-2 rounded">
                        🤖 AI: {node.aiReasoning}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generated Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Generated Test Actions</h3>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
              {journey.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500 font-mono">{index + 1}.</span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span className="font-medium text-gray-700">{step.type}</span>
                  <span className="text-gray-600">{step.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Page Context Snippets */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Page Content Samples</h3>
            <div className="space-y-2">
              {journey.path.slice(1).map((node, index) => (
                <div key={node.id} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    Step {index + 2}: {node.pageContext.title}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {node.pageContext.visibleText}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete
            </button>
          )}
          {onPlay && (
            <button
              onClick={onPlay}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <Play size={18} />
              Play Journey
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default JourneyDetailView
