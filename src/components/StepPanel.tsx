import { useState } from 'react'
import { Plus, Play, Code, Edit3, Video } from 'lucide-react'
import { useStepStore } from '../store/stepStore'
import { ToastType } from './Toast'
import StepList from './StepList'
import ActionList from './ActionList'
import CodeModal from './CodeModal'

interface StepPanelProps {
  showToast: (message: string, type: ToastType) => void
}

type TabMode = 'manual' | 'record'

function StepPanel({ showToast }: StepPanelProps) {
  const { steps, currentStepId, createStep, currentUrl, executeStepCallback, isRecording, startRecording, stopRecording, recordedEvents, convertRecordedEventsToActions } = useStepStore()
  const [showNewStepInput, setShowNewStepInput] = useState(false)
  const [newStepName, setNewStepName] = useState('')
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [tabMode, setTabMode] = useState<TabMode>('manual')
  const [recordStepName, setRecordStepName] = useState('')

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

  const handleStartRecording = () => {
    if (!recordStepName.trim()) {
      showToast('Please enter a step name', 'error')
      return
    }

    // Create a new step for recording
    createStep(recordStepName.trim())
    startRecording()
    showToast('Recording started. Interact with the page...', 'info')
  }

  const handleStopRecording = () => {
    if (!currentStepId) {
      showToast('No step selected', 'error')
      return
    }

    stopRecording()
    convertRecordedEventsToActions(currentStepId)
    showToast(`Recording stopped. ${recordedEvents.length} events captured.`, 'success')
    setRecordStepName('')

    // Switch to manual tab to show the recorded actions
    setTabMode('manual')
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Steps</h2>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTabMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              tabMode === 'manual'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Edit3 size={16} />
            <span className="text-sm font-medium">Manual Flow</span>
          </button>
          <button
            onClick={() => setTabMode('record')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              tabMode === 'record'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Video size={16} />
            <span className="text-sm font-medium">Record Flow</span>
          </button>
        </div>

        {/* Tab Content - Manual Flow */}
        {tabMode === 'manual' && (
          <>
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
          </>
        )}

        {/* Tab Content - Record Flow */}
        {tabMode === 'record' && (
          <div className="space-y-3">
            <input
              type="text"
              value={recordStepName}
              onChange={(e) => setRecordStepName(e.target.value)}
              placeholder="Flow Title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={isRecording}
            />
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Video size={18} />
                <span>Start Recording</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleStopRecording}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                >
                  <div className="w-3 h-3 bg-red-500 rounded-sm animate-pulse" />
                  <span>Stop Recording</span>
                </button>
                <div className="text-xs text-gray-600 text-center">
                  {recordedEvents.length} events recorded
                </div>
              </div>
            )}
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
