import { useState } from 'react'
import { Journey, JourneyType } from '../types/journey'
import JourneyCard from './JourneyCard'
import { Filter, SortDesc } from 'lucide-react'

interface JourneyListProps {
  journeys: Journey[]
  onHighlightStep: (selector: string, highlight: boolean) => void
}

function JourneyList({ journeys, onHighlightStep }: JourneyListProps) {
  const [sortBy, setSortBy] = useState<'confidence' | 'steps' | 'type'>('confidence')
  const [filterType, setFilterType] = useState<JourneyType | 'all'>('all')

  // Filter journeys
  const filteredJourneys =
    filterType === 'all'
      ? journeys
      : journeys.filter(j => j.type === filterType)

  // Sort journeys
  const sortedJourneys = [...filteredJourneys].sort((a, b) => {
    if (sortBy === 'confidence') return b.confidence - a.confidence
    if (sortBy === 'steps') return b.steps.length - a.steps.length
    if (sortBy === 'type') return a.type.localeCompare(b.type)
    return 0
  })

  // Get unique journey types
  const uniqueTypes = Array.from(new Set(journeys.map(j => j.type)))

  return (
    <div className="h-full flex flex-col">
      {/* Stats & Filters Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        {/* Summary Stats */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {sortedJourneys.length} Journey{sortedJourneys.length !== 1 ? 's' : ''} Detected
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {journeys.length} total •{' '}
              {journeys.reduce((sum, j) => sum + j.steps.length, 0)} total steps
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 pr-8 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="confidence">Sort by Confidence</option>
                <option value="steps">Sort by Steps</option>
                <option value="type">Sort by Type</option>
              </select>
              <SortDesc
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter size={14} className="text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setFilterType('all')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 ${
              filterType === 'all'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            All ({journeys.length})
          </button>
          {uniqueTypes.map(type => {
            const count = journeys.filter(j => j.type === type).length
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 capitalize ${
                  filterType === type
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {type} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Journey Cards List */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedJourneys.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No journeys match the selected filter</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJourneys.map(journey => (
              <JourneyCard
                key={journey.id}
                journey={journey}
                onHighlightStep={onHighlightStep}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default JourneyList
