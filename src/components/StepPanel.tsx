import { useState } from 'react'
import { Plus, Play, Code } from 'lucide-react'
import { useStepStore } from '../store/stepStore'
import { ToastType } from './Toast'
import StepList from './StepList'
import ActionList from './ActionList'
import CodeModal from './CodeModal'

interface StepPanelProps {
  showToast: (message: string, type: ToastType) => void
}

function StepPanel({ showToast }: StepPanelProps) {
  const { steps, currentStepId, createStep, currentUrl, executeStepCallback } = useStepStore()
  const [showNewStepInput, setShowNewStepInput] = useState(false)
  const [newStepName, setNewStepName] = useState('')
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  const currentStep = steps.find((f) => f.id === currentStepId)

  const handleCreateStep = () => {
    if (newStepName.trim()) {
      createStep(newStepName.trim())
      setNewStepName('')
      setShowNewStepInput(false)
    }
  }

  const handlePlayStep = async () => {
    if (!currentStep || !executeStepCallback) {
      console.log('❌ [PLAY] No step or callback available')
      showToast('Step execution not ready. Please wait for the page to load.', 'error')
      return
    }

    if (currentStep.actions.length === 0) {
      showToast('No actions to execute', 'info')
      return
    }

    console.log('🎬 [PLAY] Starting step execution:', currentStep.name)
    setIsExecuting(true)

    try {
      await executeStepCallback(currentStep.actions)
      console.log('✅ [PLAY] Step execution completed successfully')
      showToast('Step executed successfully!', 'success')
    } catch (error) {
      console.error('❌ [PLAY] Step execution failed:', error)
      showToast(`Step execution failed: ${error}`, 'error')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleGenerateCode = () => {
    setShowCodeModal(true)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Steps</h2>

        {/* Create Step Button */}
        {!showNewStepInput ? (
          <button
            onClick={() => setShowNewStepInput(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={18} />
            <span>Create Step</span>
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newStepName}
              onChange={(e) => setNewStepName(e.target.value)}
              placeholder="Step name..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleCreateStep()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateStep}
                className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewStepInput(false)
                  setNewStepName('')
                }}
                className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step List */}
      <div className="flex-1 overflow-y-auto">
        {steps.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No steps created yet. Create your first step to get started.
          </div>
        ) : (
          <>
            <StepList />
            {currentStep && (
              <div className="border-t border-gray-200">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Actions
                  </h3>
                  <ActionList stepId={currentStep.id} actions={currentStep.actions} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      {currentStep && currentStep.actions.length > 0 && (
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={handlePlayStep}
            disabled={isExecuting}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isExecuting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            <Play size={18} />
            <span>{isExecuting ? 'Executing...' : 'Play Step'}</span>
          </button>
          <button
            onClick={handleGenerateCode}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Code size={18} />
            <span>Generate Code</span>
          </button>
        </div>
      )}

      {/* Code Modal */}
      {showCodeModal && currentStep && (
        <CodeModal
          step={{ ...currentStep, url: currentUrl }}
          onClose={() => setShowCodeModal(false)}
        />
      )}
    </div>
  )
}

export default StepPanel
