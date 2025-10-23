import { useState, useMemo } from 'react'
import { Zap, Loader, MousePointer, FormInput, MousePointerClick, Link as LinkIcon, Sparkles, Route } from 'lucide-react'
import { ToastType } from './Toast'
import { InteractableElement } from '../utils/flowExtractor'
import { Journey } from '../types/journey'
import { analyzeElements } from '../utils/journeyAnalyzer'
import JourneyList from './JourneyList'

interface AutoFlowPanelProps {
  showToast: (message: string, type: ToastType) => void
  onExtractFlow: () => Promise<InteractableElement[]>
  onHighlightElement: (selector: string, highlight: boolean) => Promise<void>
}

type ViewMode = 'elements' | 'journeys'

interface CategorizedElements {
  formElements: InteractableElement[]
  buttons: InteractableElement[]
  links: InteractableElement[]
  eventElements: InteractableElement[]
}

function AutoFlowPanel({ showToast, onExtractFlow, onHighlightElement }: AutoFlowPanelProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedElements, setExtractedElements] = useState<InteractableElement[]>([])
  const [detectedJourneys, setDetectedJourneys] = useState<Journey[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('journeys')
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['formElements', 'buttons', 'links', 'eventElements']))

  // Categorize elements
  const categorizedElements = useMemo<CategorizedElements>(() => {
    const categories: CategorizedElements = {
      formElements: [],
      buttons: [],
      links: [],
      eventElements: []
    }

    extractedElements.forEach(element => {
      // Form elements (input, select, textarea)
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
        categories.formElements.push(element)
      }
      // Buttons
      else if (element.tagName === 'BUTTON' || element.type === 'button') {
        categories.buttons.push(element)
      }
      // Links
      else if (element.tagName === 'A' || element.type === 'link') {
        categories.links.push(element)
      }
      // Other elements with event listeners
      else {
        categories.eventElements.push(element)
      }
    })

    return categories
  }, [extractedElements])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const handleExtractFlow = async () => {
    setIsExtracting(true)
    setExtractedElements([])
    setDetectedJourneys([])
    showToast('Extracting interactable elements...', 'info')

    try {
      const elements = await onExtractFlow()
      setExtractedElements(elements)

      // Analyze elements to detect journeys
      showToast('Analyzing user journeys...', 'info')
      const journeys = analyzeElements(elements)
      setDetectedJourneys(journeys)

      if (journeys.length > 0) {
        showToast(`Found ${elements.length} elements, detected ${journeys.length} journeys!`, 'success')
        setViewMode('journeys') // Switch to journey view
      } else {
        showToast(`Found ${elements.length} elements, no journeys detected`, 'info')
        setViewMode('elements') // Fallback to elements view
      }
    } catch (error) {
      showToast(`Extraction failed: ${error}`, 'error')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleMouseEnter = async (selector: string) => {
    setHoveredElement(selector)
    await onHighlightElement(selector, true)
  }

  const handleMouseLeave = async () => {
    setHoveredElement(null)
    if (hoveredElement) {
      await onHighlightElement(hoveredElement, false)
    }
  }

  // Initial state - show Extract Flow button
  if (!isExtracting && extractedElements.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Route size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Smart Journey Detection</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Automatically analyze the page to detect meaningful user journeys like login flows, search flows,
            and form submissions using intelligent heuristics.
          </p>
          <button
            onClick={handleExtractFlow}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
          >
            <Zap size={20} />
            Detect Journeys
          </button>
        </div>
      </div>
    )
  }

  // Extraction in progress - show loader
  if (isExtracting) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white">
        <Loader className="animate-spin text-indigo-600 mb-4" size={48} />
        <p className="text-gray-600 font-medium">Analyzing page elements...</p>
        <p className="text-gray-400 text-sm mt-2">Detecting user journeys</p>
      </div>
    )
  }

  // Show journey view if journeys detected
  if (viewMode === 'journeys' && detectedJourneys.length > 0) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Detected Journeys</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {extractedElements.length} elements analyzed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('elements')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewMode === 'elements'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Elements
              </button>
              <button
                onClick={() => setViewMode('journeys')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewMode === 'journeys'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Journeys
              </button>
            </div>
          </div>
          <button
            onClick={handleExtractFlow}
            className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Zap size={16} />
            Detect Again
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <JourneyList journeys={detectedJourneys} onHighlightStep={onHighlightElement} />
        </div>
      </div>
    )
  }

  // Helper to render element card
  const renderElementCard = (element: InteractableElement, index: number) => (
    <div
      key={`${element.selector}-${index}`}
      onMouseEnter={() => handleMouseEnter(element.selector)}
      onMouseLeave={handleMouseLeave}
      className={`border rounded-lg p-3 transition-all cursor-pointer ${
        hoveredElement === element.selector
          ? 'bg-indigo-50 border-indigo-300 shadow-md'
          : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded uppercase">
              {element.type}
            </span>
            <span className="text-xs text-gray-500">{element.tagName}</span>
          </div>
          <p className="text-sm text-gray-800 font-medium break-words line-clamp-2">
            {element.text}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        {element.eventListeners.map((listener, i) => (
          <span
            key={i}
            className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded"
          >
            {listener}
          </span>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-2 truncate" title={element.selector}>
        {element.selector}
      </p>
    </div>
  )

  // Extraction completed - show categorized elements
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Interactable Elements</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {detectedJourneys.length > 0
                ? `${detectedJourneys.length} journeys detected`
                : 'No journeys detected'}
            </p>
          </div>
          {detectedJourneys.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('elements')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewMode === 'elements'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Elements
              </button>
              <button
                onClick={() => setViewMode('journeys')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewMode === 'journeys'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Journeys
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleExtractFlow}
          className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <Zap size={16} />
          Detect Again
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {extractedElements.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MousePointer size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No interactable elements found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Form Elements Category */}
            {categorizedElements.formElements.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('formElements')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <FormInput size={18} className="text-green-600" />
                    <span className="font-semibold text-gray-800 text-sm">Form Elements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      {categorizedElements.formElements.length}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-600 transition-transform ${
                        expandedCategories.has('formElements') ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedCategories.has('formElements') && (
                  <div className="p-3 space-y-2 bg-white">
                    {categorizedElements.formElements.map((element, index) => renderElementCard(element, index))}
                  </div>
                )}
              </div>
            )}

            {/* Buttons Category */}
            {categorizedElements.buttons.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('buttons')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <MousePointerClick size={18} className="text-blue-600" />
                    <span className="font-semibold text-gray-800 text-sm">Buttons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {categorizedElements.buttons.length}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-600 transition-transform ${
                        expandedCategories.has('buttons') ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedCategories.has('buttons') && (
                  <div className="p-3 space-y-2 bg-white">
                    {categorizedElements.buttons.map((element, index) => renderElementCard(element, index))}
                  </div>
                )}
              </div>
            )}

            {/* Links Category */}
            {categorizedElements.links.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('links')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <LinkIcon size={18} className="text-purple-600" />
                    <span className="font-semibold text-gray-800 text-sm">Links</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      {categorizedElements.links.length}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-600 transition-transform ${
                        expandedCategories.has('links') ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedCategories.has('links') && (
                  <div className="p-3 space-y-2 bg-white">
                    {categorizedElements.links.map((element, index) => renderElementCard(element, index))}
                  </div>
                )}
              </div>
            )}

            {/* Event Elements Category */}
            {categorizedElements.eventElements.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory('eventElements')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-orange-600" />
                    <span className="font-semibold text-gray-800 text-sm">Event Elements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                      {categorizedElements.eventElements.length}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-600 transition-transform ${
                        expandedCategories.has('eventElements') ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedCategories.has('eventElements') && (
                  <div className="p-3 space-y-2 bg-white">
                    {categorizedElements.eventElements.map((element, index) => renderElementCard(element, index))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AutoFlowPanel
