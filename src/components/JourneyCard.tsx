import { Journey } from '../types/journey'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'

interface JourneyCardProps {
  journey: Journey
  onHighlightStep: (selector: string, highlight: boolean) => void
}

function JourneyCard({ journey, onHighlightStep }: JourneyCardProps) {
  // Determine confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-100'
    if (confidence >= 70) return 'text-blue-600 bg-blue-100'
    if (confidence >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 85) return <CheckCircle2 size={16} />
    if (confidence >= 70) return <Circle size={16} />
    return <AlertCircle size={16} />
  }

  // Journey type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-indigo-100 text-indigo-700'
      case 'registration':
        return 'bg-purple-100 text-purple-700'
      case 'search':
        return 'bg-blue-100 text-blue-700'
      case 'form':
        return 'bg-green-100 text-green-700'
      case 'navigation':
        return 'bg-orange-100 text-orange-700'
      case 'ecommerce':
        return 'bg-pink-100 text-pink-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900">{journey.name}</h4>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${getTypeBadgeColor(
                  journey.type
                )}`}
              >
                {journey.type}
              </span>
            </div>
            <p className="text-xs text-gray-500">{journey.steps.length} steps</p>
          </div>

          {/* Confidence Score */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${getConfidenceColor(
              journey.confidence
            )}`}
          >
            {getConfidenceIcon(journey.confidence)}
            <span>{journey.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="p-4">
        <div className="space-y-2">
          {journey.steps.map((step, index) => (
            <div
              key={`${journey.id}-step-${index}`}
              onMouseEnter={() => onHighlightStep(step.element.selector, true)}
              onMouseLeave={() => onHighlightStep(step.element.selector, false)}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              {/* Step Number */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold">
                {step.order}
              </div>

              {/* Step Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                  {step.description}
                </p>
                {step.requiresData && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-gray-500">
                      Requires: {step.dataType || 'data'}
                    </span>
                    {step.element.required && (
                      <span className="text-xs text-red-500 font-medium">*</span>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1 truncate" title={step.element.tagName}>
                  {step.element.tagName}
                  {step.element.inputType && ` [${step.element.inputType}]`}
                </p>
              </div>

              {/* Step Type Badge */}
              <div className="flex-shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    step.type === 'fill'
                      ? 'bg-blue-50 text-blue-600'
                      : step.type === 'click'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  {step.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions (placeholder for future) */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {journey.steps.filter(s => s.requiresData).length} fields require data
          </span>
          {/* Future: Add "Run Journey" button here */}
        </div>
      </div>
    </div>
  )
}

export default JourneyCard
