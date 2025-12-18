/**
 * Saved Sequences Component
 *
 * Displays and manages saved desktop automation sequences
 */

import { Play, Trash2, Clock, Layers } from 'lucide-react'
import { useDesktopStore } from '../store/desktopStore'

export function SavedSequences() {
  const {
    savedSequences,
    isPlaying,
    deleteSequence,
    playSequence,
  } = useDesktopStore()

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  const handlePlaySequence = async (sequenceId: string) => {
    await playSequence(sequenceId)
  }

  const handleDeleteSequence = (sequenceId: string) => {
    if (confirm('Are you sure you want to delete this sequence?')) {
      deleteSequence(sequenceId)
    }
  }

  if (savedSequences.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <div className="text-center">
          <Layers size={48} className="mx-auto mb-3 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Sequences</h3>
          <p className="text-sm text-gray-600">
            Record actions and save them as sequences to replay later
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Saved Sequences
          </h3>
          <span className="ml-auto text-sm text-gray-500">
            {savedSequences.length} {savedSequences.length === 1 ? 'sequence' : 'sequences'}
          </span>
        </div>
      </div>

      {/* Sequences List */}
      <div className="divide-y divide-gray-200">
        {savedSequences.map((sequence) => (
          <div
            key={sequence.id}
            className="p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {sequence.name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Layers size={12} />
                    <span>{sequence.actions.length} actions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{sequence.applicationName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{formatDate(sequence.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePlaySequence(sequence.id)}
                  disabled={isPlaying}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Play sequence"
                >
                  <Play size={18} />
                </button>
                <button
                  onClick={() => handleDeleteSequence(sequence.id)}
                  disabled={isPlaying}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete sequence"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
