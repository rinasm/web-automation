/**
 * Desktop Action List Component
 *
 * Displays list of recorded desktop actions with edit/delete/reorder capabilities
 */

import { useState } from 'react'
import {
  Mouse,
  Keyboard,
  Clock,
  Trash2,
  Edit2,
  Play,
  MousePointer2,
  Type,
  Command,
} from 'lucide-react'
import { useDesktopStore, DesktopAction } from '../store/desktopStore'

interface DesktopActionListProps {
  actions: DesktopAction[]
  onEdit?: (action: DesktopAction) => void
  onDelete?: (actionId: string) => void
  onPlay?: (action: DesktopAction) => void
}

export function DesktopActionList({
  actions,
  onEdit,
  onDelete,
  onPlay,
}: DesktopActionListProps) {
  const { removeRecordedAction, executeAction } = useDesktopStore()
  const [executingId, setExecutingId] = useState<string | null>(null)

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click':
      case 'double_click':
      case 'right_click':
        return <MousePointer2 size={16} className="text-purple-600" />
      case 'type':
        return <Type size={16} className="text-blue-600" />
      case 'keyboard_shortcut':
      case 'press_key':
        return <Command size={16} className="text-green-600" />
      case 'wait':
        return <Clock size={16} className="text-orange-600" />
      default:
        return <Mouse size={16} className="text-gray-600" />
    }
  }

  const getActionColor = (type: string) => {
    switch (type) {
      case 'click':
      case 'double_click':
      case 'right_click':
        return 'bg-purple-50 border-purple-200'
      case 'type':
        return 'bg-blue-50 border-blue-200'
      case 'keyboard_shortcut':
      case 'press_key':
        return 'bg-green-50 border-green-200'
      case 'wait':
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatActionType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleDelete = (actionId: string) => {
    if (confirm('Delete this action?')) {
      if (onDelete) {
        onDelete(actionId)
      } else {
        removeRecordedAction(actionId)
      }
    }
  }

  const handlePlay = async (action: DesktopAction) => {
    setExecutingId(action.id)

    try {
      if (onPlay) {
        await onPlay(action)
      } else {
        await executeAction(action)
      }
    } catch (error) {
      console.error('Failed to execute action:', error)
      alert('Failed to execute action: ' + (error as Error).message)
    } finally {
      setExecutingId(null)
    }
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Mouse size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No actions recorded yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Start recording to capture desktop actions
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {actions.map((action, index) => (
        <div
          key={action.id}
          className={`border rounded-lg p-3 transition-all ${getActionColor(
            action.type
          )} ${executingId === action.id ? 'ring-2 ring-purple-500' : ''}`}
        >
          <div className="flex items-start gap-3">
            {/* Step Number */}
            <div className="flex-shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-300 text-xs font-semibold text-gray-700">
              {index + 1}
            </div>

            {/* Action Icon */}
            <div className="flex-shrink-0 mt-0.5">{getActionIcon(action.type)}</div>

            {/* Action Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">
                  {formatActionType(action.type)}
                </span>
              </div>

              <p className="text-xs text-gray-600 truncate">
                {action.description || 'No description'}
              </p>

              {/* Action Value/Coordinates */}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {action.coordinates && (
                  <span className="font-mono">
                    ({action.coordinates.x}, {action.coordinates.y})
                  </span>
                )}
                {action.value && (
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                    {action.value}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 flex gap-1">
              {/* Play Single Action */}
              <button
                onClick={() => handlePlay(action)}
                disabled={executingId === action.id}
                className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-white rounded-md transition-colors disabled:opacity-50"
                title="Play this action"
              >
                {executingId === action.id ? (
                  <div className="animate-spin">
                    <Play size={14} />
                  </div>
                ) : (
                  <Play size={14} />
                )}
              </button>

              {/* Edit */}
              {onEdit && (
                <button
                  onClick={() => onEdit(action)}
                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                  title="Edit action"
                >
                  <Edit2 size={14} />
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(action.id)}
                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                title="Delete action"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="text-center text-xs text-gray-500 pt-2">
        {actions.length} action{actions.length !== 1 ? 's' : ''} recorded
      </div>
    </div>
  )
}
