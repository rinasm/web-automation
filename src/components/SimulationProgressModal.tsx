/**
 * Simulation Progress Modal
 *
 * Shows real-time progress of step simulation with controls
 */

import { X, Play, Pause, Square, AlertCircle, CheckCircle2 } from 'lucide-react'
import { SimulationProgress } from '../services/simulationService'

interface SimulationProgressModalProps {
  isOpen: boolean
  progress: SimulationProgress
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onClose: () => void
}

export function SimulationProgressModal({
  isOpen,
  progress,
  onPause,
  onResume,
  onStop,
  onClose
}: SimulationProgressModalProps) {
  if (!isOpen) return null

  const getStatusColor = () => {
    switch (progress.status) {
      case 'running':
        return 'text-blue-600'
      case 'paused':
        return 'text-yellow-600'
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle2 className="text-green-600" size={24} />
      case 'error':
        return <AlertCircle className="text-red-600" size={24} />
      case 'running':
        return <Play className="text-blue-600" size={24} />
      case 'paused':
        return <Pause className="text-yellow-600" size={24} />
      default:
        return null
    }
  }

  const canClose = progress.status === 'completed' || progress.status === 'error' || progress.status === 'idle'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <h2 className="text-xl font-semibold">Test Simulation</h2>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* Progress Content */}
        <div className="p-6 space-y-4">
          {/* Status Message */}
          <div className={`text-lg font-medium ${getStatusColor()}`}>
            {progress.message}
          </div>

          {/* Current Step Info */}
          {progress.currentStep && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Step {progress.currentStepIndex + 1}: {progress.currentStep.name}
              </div>
              {progress.currentAction && (
                <div className="text-sm text-gray-600">
                  Action: <span className="font-mono bg-white px-2 py-1 rounded">
                    {progress.currentAction.type}
                  </span>
                  {progress.currentAction.selector && (
                    <span className="ml-2 text-gray-500">
                      {progress.currentAction.selector}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>Step {progress.currentStepIndex + 1}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  progress.status === 'error' ? 'bg-red-600' :
                  progress.status === 'completed' ? 'bg-green-600' :
                  'bg-blue-600'
                }`}
                style={{ width: `${(progress.currentStepIndex + 1) * 10}%` }}
              />
            </div>
          </div>

          {/* Action Indicators */}
          {progress.currentStep && progress.currentStep.actions.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Actions:</div>
              <div className="flex gap-2 flex-wrap">
                {progress.currentStep.actions.map((action, index) => (
                  <div
                    key={index}
                    className={`px-3 py-1 rounded text-sm ${
                      index < progress.currentActionIndex
                        ? 'bg-green-100 text-green-700'
                        : index === progress.currentActionIndex
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {action.type}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center gap-3 p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {progress.status === 'running' && 'Simulation in progress...'}
            {progress.status === 'paused' && 'Simulation paused'}
            {progress.status === 'completed' && 'Simulation completed successfully'}
            {progress.status === 'error' && 'Simulation encountered an error'}
          </div>
          <div className="flex gap-2">
            {progress.status === 'running' && (
              <button
                onClick={onPause}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
              >
                <Pause size={16} />
                Pause
              </button>
            )}
            {progress.status === 'paused' && (
              <button
                onClick={onResume}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Play size={16} />
                Resume
              </button>
            )}
            {(progress.status === 'running' || progress.status === 'paused') && (
              <button
                onClick={onStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Square size={16} />
                Stop
              </button>
            )}
            {canClose && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
