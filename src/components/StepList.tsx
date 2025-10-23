import { Trash2, CheckCircle2 } from 'lucide-react'
import { useStepStore } from '../store/stepStore'

function StepList() {
  const { steps, currentStepId, setCurrentStep, deleteStep } = useStepStore()

  return (
    <div className="divide-y divide-gray-200">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
            currentStepId === step.id ? 'bg-blue-50' : ''
          }`}
          onClick={() => setCurrentStep(step.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              {currentStepId === step.id && (
                <CheckCircle2 size={16} className="text-blue-500" />
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-800">
                  {step.name}
                </h4>
                <p className="text-xs text-gray-500">
                  {step.actions.length} action{step.actions.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Delete this step?')) {
                  deleteStep(step.id)
                }
              }}
              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StepList
