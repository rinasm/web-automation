import { CheckCircle2, X, ArrowRight } from 'lucide-react'
import { ExploredJourney } from '../types/journey'

interface JourneyCompletionDialogProps {
  journey: ExploredJourney
  onConfirm: () => void
  onContinue: () => void
  onDiscard: () => void
}

function JourneyCompletionDialog({
  journey,
  onConfirm,
  onContinue,
  onDiscard
}: JourneyCompletionDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={28} className="text-white" />
            <h2 className="text-xl font-bold text-white">Journey Complete!</h2>
          </div>
          <button
            onClick={onDiscard}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Journey Name */}
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Journey Name
            </label>
            <div className="text-2xl font-bold text-gray-800">{journey.name}</div>
          </div>

          {/* Confidence & Reason */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">
                Confidence
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${journey.confidence}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {journey.confidence}%
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">
                Steps
              </label>
              <div className="text-lg font-bold text-gray-800">
                {journey.steps.length} actions
              </div>
            </div>
          </div>

          {/* Completion Reason */}
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Why Complete?
            </label>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {journey.completionReason}
            </p>
          </div>

          {/* Journey Path */}
          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">
              Journey Path
            </label>
            <div className="space-y-2">
              {journey.path.map((node, index) => (
                <div key={node.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
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
                      <div className="w-0.5 h-8 bg-gray-300 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-medium text-gray-800">{node.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {node.pageContext.title}
                    </div>
                    {node.aiReasoning && (
                      <div className="text-xs text-gray-400 italic mt-1">
                        {node.aiReasoning}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Preview */}
          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">
              Generated Actions
            </label>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
              {journey.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">{index + 1}.</span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span className="text-gray-700">{step.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Continue Exploring
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            Save Journey
          </button>
        </div>
      </div>
    </div>
  )
}

export default JourneyCompletionDialog
