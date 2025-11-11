import { MousePointer, Hand, Move, Type, Trash2, Eye, Clock } from 'lucide-react'
import { useRecordingStore, RecordedEvent, GestureType } from '../store/recordingStore'
import { useState } from 'react'

interface RecordedEventsListProps {
  maxHeight?: string
}

export default function RecordedEventsList({ maxHeight = '400px' }: RecordedEventsListProps) {
  const { processedEvents, status, removeEvent } = useRecordingStore()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // Get icon for gesture type
  const getGestureIcon = (gestureType: GestureType) => {
    switch (gestureType) {
      case 'tap':
      case 'doubleTap':
        return <MousePointer size={16} className="text-blue-400" />
      case 'longPress':
        return <Hand size={16} className="text-purple-400" />
      case 'swipe':
      case 'scroll':
        return <Move size={16} className="text-green-400" />
      case 'type':
        return <Type size={16} className="text-yellow-400" />
      default:
        return <MousePointer size={16} className="text-gray-400" />
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  // Format coordinates
  const formatCoordinates = (x: number, y: number): string => {
    return `(${Math.round(x)}, ${Math.round(y)})`
  }

  // Get element description
  const getElementDescription = (event: RecordedEvent): string => {
    if (!event.element) {
      return formatCoordinates(event.coordinates.x, event.coordinates.y)
    }

    const el = event.element
    if (el.text) {
      return `"${el.text.substring(0, 30)}${el.text.length > 30 ? '...' : ''}"`
    }
    if (el.className) {
      return `.${el.className.split(' ')[0]}`
    }
    return formatCoordinates(event.coordinates.x, event.coordinates.y)
  }

  // Gesture type label
  const getGestureLabel = (gestureType: GestureType): string => {
    switch (gestureType) {
      case 'tap':
        return 'Tap'
      case 'doubleTap':
        return 'Double Tap'
      case 'longPress':
        return 'Long Press'
      case 'swipe':
        return 'Swipe'
      case 'scroll':
        return 'Scroll'
      case 'type':
        return 'Type'
      case 'pinch':
        return 'Pinch'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Recorded Events</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{processedEvents.length} events</span>
            {status === 'recording' && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Recording</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {processedEvents.length === 0 ? (
          <div className="p-8 text-center">
            <MousePointer size={48} className="text-gray-600 mx-auto mb-3" />
            <div className="text-gray-400 text-sm">No events recorded yet</div>
            <div className="text-gray-500 text-xs mt-1">
              {status === 'recording'
                ? 'Interact with your device to start recording'
                : 'Start recording to capture events'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {processedEvents.map((event, index) => (
              <div
                key={event.id}
                className={`p-3 hover:bg-gray-750 transition-colors cursor-pointer ${
                  selectedEventId === event.id ? 'bg-gray-750 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setSelectedEventId(event.id === selectedEventId ? null : event.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Event Number */}
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-400 font-medium">
                    {index + 1}
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getGestureIcon(event.gestureType)}
                      <span className="text-white text-sm font-medium">
                        {getGestureLabel(event.gestureType)}
                      </span>
                      {event.swipeDirection && (
                        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                          {event.swipeDirection}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-400 truncate">
                      {event.description || getElementDescription(event)}
                    </div>

                    {event.value && (
                      <div className="mt-1 text-xs text-green-400 font-mono bg-gray-900 px-2 py-1 rounded">
                        Value: "{event.value}"
                      </div>
                    )}

                    {selectedEventId === event.id && (
                      <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock size={12} />
                          <span>{formatTimestamp(event.timestamp)}</span>
                        </div>

                        {event.duration && (
                          <div className="text-xs text-gray-400">
                            Duration: {event.duration}ms
                          </div>
                        )}

                        {event.element?.xpath && (
                          <div className="text-xs text-gray-400 font-mono bg-gray-900 px-2 py-1 rounded break-all">
                            {event.element.xpath.length > 60
                              ? `${event.element.xpath.substring(0, 60)}...`
                              : event.element.xpath}
                          </div>
                        )}

                        {event.screenshot && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(event.screenshot, '_blank')
                            }}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
                          >
                            <Eye size={12} />
                            View Screenshot
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    {status === 'recording' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeEvent(event.id)
                        }}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Remove event"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {processedEvents.length > 0 && (
        <div className="bg-gray-900 px-4 py-2 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {processedEvents.filter(e => e.gestureType === 'tap').length} taps,{' '}
              {processedEvents.filter(e => e.gestureType === 'swipe').length} swipes,{' '}
              {processedEvents.filter(e => e.gestureType === 'type').length} inputs
            </span>
            {processedEvents.length > 0 && (
              <span>
                {Math.round(
                  (processedEvents[processedEvents.length - 1].timestamp -
                    processedEvents[0].timestamp) /
                    1000
                )}s total
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
