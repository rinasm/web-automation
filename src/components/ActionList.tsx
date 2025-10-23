import { useState } from 'react'
import { Plus, Trash2, Target } from 'lucide-react'
import { useStepStore, Action, ActionType } from '../store/stepStore'

interface ActionListProps {
  stepId: string
  actions: Action[]
}

const actionTypes: { value: ActionType; label: string }[] = [
  { value: 'click', label: 'Click' },
  { value: 'type', label: 'Type' },
  { value: 'hover', label: 'Hover' },
  { value: 'wait', label: 'Wait' },
  { value: 'assert', label: 'Assert Visible' },
]

function ActionList({ stepId, actions }: ActionListProps) {
  const {
    addAction,
    updateAction,
    deleteAction,
    startCapturingSelector,
    isCapturingSelector,
    capturingActionId,
    setHoveringAction
  } = useStepStore()
  const [showNewAction, setShowNewAction] = useState(false)
  const [newActionType, setNewActionType] = useState<ActionType>('click')

  const handleAddAction = () => {
    addAction(stepId, {
      type: newActionType,
      selector: '',
      value: '',
    })
    setShowNewAction(false)
    setNewActionType('click')
  }

  const handleCaptureSelector = (actionId: string) => {
    startCapturingSelector(actionId)
  }

  const handleTargetButtonHover = (actionId: string, isHovering: boolean, hasSelector: boolean) => {
    if (isHovering && hasSelector) {
      setHoveringAction(actionId)
    } else {
      setHoveringAction(null)
    }
  }

  const getTargetButtonClass = (action: Action) => {
    const hasSelector = Boolean(action.selector)
    const isActive = isCapturingSelector && capturingActionId === action.id

    if (isActive) {
      return 'bg-blue-500 text-white'
    } else if (hasSelector) {
      return 'bg-green-500 text-white hover:bg-green-600'
    } else {
      return 'bg-blue-100 text-blue-600 hover:bg-blue-200'
    }
  }

  return (
    <div className="space-y-3">
      {actions.map((action, index) => (
        <div
          key={action.id}
          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              Action {index + 1}
            </span>
            <button
              onClick={() => deleteAction(stepId, action.id)}
              className="text-red-500 hover:bg-red-50 p-1 rounded"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="space-y-2">
            {/* Action Type */}
            <select
              value={action.type}
              onChange={(e) =>
                updateAction(stepId, action.id, { type: e.target.value as ActionType })
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {actionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Selector (for all except wait) */}
            {action.type !== 'wait' && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={action.selector}
                    onChange={(e) =>
                      updateAction(stepId, action.id, { selector: e.target.value })
                    }
                    placeholder="XPath selector..."
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleCaptureSelector(action.id)}
                    onMouseEnter={() => handleTargetButtonHover(action.id, true, Boolean(action.selector))}
                    onMouseLeave={() => handleTargetButtonHover(action.id, false, Boolean(action.selector))}
                    disabled={isCapturingSelector && capturingActionId !== action.id}
                    className={`p-1.5 rounded transition-colors ${getTargetButtonClass(action)} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={action.selector ? 'Selector captured (click to recapture)' : 'Capture selector'}
                  >
                    <Target size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Value input (for type and wait) */}
            {(action.type === 'type' || action.type === 'wait') && (
              <input
                type={action.type === 'wait' ? 'number' : 'text'}
                value={action.value || ''}
                onChange={(e) =>
                  updateAction(stepId, action.id, { value: e.target.value })
                }
                placeholder={
                  action.type === 'type'
                    ? 'Text to type...'
                    : 'Wait time (ms)...'
                }
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>
        </div>
      ))}

      {/* Add Action Button */}
      {!showNewAction ? (
        <button
          onClick={() => setShowNewAction(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Action</span>
        </button>
      ) : (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
          <select
            value={newActionType}
            onChange={(e) => setNewActionType(e.target.value as ActionType)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            {actionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAddAction}
              className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Add
            </button>
            <button
              onClick={() => setShowNewAction(false)}
              className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActionList
