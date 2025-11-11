import { useState, useEffect, useRef } from 'react'
import { Sparkles, Play, Pause, Square, Loader, Route, Settings, AlertCircle, History, Eye, Trash2, Map, FileText } from 'lucide-react'
import { ToastType } from './Toast'
import { NewExplorationController } from '../services/newExplorationController'
import { TextToFlowController } from '../services/textToFlowController'
import { ExploredJourney } from '../types/journey'
import { claudeService } from '../services/claudeService'
import JourneyCompletionDialog from './JourneyCompletionDialog'
import ApiKeyDialog from './ApiKeyDialog'
import JourneyDetailView from './JourneyDetailView'
import { AIJourneysTreeView } from './AIJourneysTreeView'
import { TextToFlowPanel } from './TextToFlowPanel'
import { useStepStore } from '../store/stepStore'
import { useJourneyStore } from '../store/journeyStore'
import { useAIJourneysStore } from '../store/aiJourneysStore'

interface AIExplorationPanelProps {
  showToast: (message: string, type: ToastType) => void
  webviewRef: any
}

function AIExplorationPanel({ showToast, webviewRef }: AIExplorationPanelProps) {
  const [isConfigured, setIsConfigured] = useState(false)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [isExploring, setIsExploring] = useState(false)
  const [pendingJourney, setPendingJourney] = useState<ExploredJourney | null>(null)
  const [explorationController, setExplorationController] = useState<NewExplorationController | null>(null)
  const [selectedJourney, setSelectedJourney] = useState<ExploredJourney | null>(null)
  const [pagesScanned, setPagesScanned] = useState(0)
  const [activeTab, setActiveTab] = useState<'journeys' | 'map' | 'textToFlow'>('journeys')

  // Text to Flow state
  const [textToFlowController, setTextToFlowController] = useState<TextToFlowController | null>(null)
  const [isExecutingTextFlow, setIsExecutingTextFlow] = useState(false)
  const [textFlowParsedSteps, setTextFlowParsedSteps] = useState<Array<{ description: string; order: number }>>([])
  const [textFlowCurrentStep, setTextFlowCurrentStep] = useState(0)
  const [textFlowStepStatuses, setTextFlowStepStatuses] = useState<Record<number, 'pending' | 'executing' | 'completed' | 'failed'>>({})

  const { createStep, addAction, currentStepId } = useStepStore()
  const { exploredJourneys, addJourney, deleteJourney, hasSimilarJourney, updateJourney, clearAllJourneys } = useJourneyStore()
  const aiJourneysStore = useAIJourneysStore()

  // Remove duplicates on mount if they exist
  useEffect(() => {
    const uniqueIds = new Set<string>()
    const hasDuplicates = exploredJourneys.some(journey => {
      if (uniqueIds.has(journey.id)) {
        return true
      }
      uniqueIds.add(journey.id)
      return false
    })

    if (hasDuplicates) {
      console.warn('⚠️ [PANEL] Duplicate journeys detected in store. Cleaning up...')
      // Clear and reload from localStorage to fix corruption
      const stored = localStorage.getItem('snaptest-journey-storage')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          const journeys = parsed.state?.exploredJourneys || []

          // Remove duplicates
          const uniqueJourneys = journeys.filter((journey: any, index: number, self: any[]) =>
            self.findIndex(j => j.id === journey.id) === index
          )

          console.log('🔧 [PANEL] Cleaned', journeys.length - uniqueJourneys.length, 'duplicate journeys')

          // Update localStorage with cleaned data
          parsed.state.exploredJourneys = uniqueJourneys
          localStorage.setItem('snaptest-journey-storage', JSON.stringify(parsed))

          // Force reload
          window.location.reload()
        } catch (error) {
          console.error('❌ [PANEL] Failed to clean duplicates:', error)
        }
      }
    }
  }, [])

  // Check if API key is configured
  useEffect(() => {
    const configured = claudeService.isInitialized()
    setIsConfigured(configured)
  }, [])

  // Initialize exploration controller
  useEffect(() => {
    if (webviewRef?.current && isConfigured) {
      const controller = new NewExplorationController(webviewRef.current, {
        maxDepth: 10,
        waitTimeBetweenActions: 2000,
        autoSaveJourneys: false
      })

      // Listen to exploration events
      controller.on((event) => {
        console.log('📥 [PANEL] Received event:', event.type)
        console.log('📥 [PANEL] Event data:', event.data)

        switch (event.type) {
          case 'started':
            console.log('▶️ [PANEL] Exploration started')
            setIsExploring(true)
            setPagesScanned(0)
            showToast('AI exploration started...', 'info')
            break

          case 'page_scanned':
            console.log('🔍 [PANEL] Page scanned:', event.data)
            setPagesScanned(prev => prev + 1)
            break

          case 'journey_found':
            const foundJourney = event.data as ExploredJourney
            console.log('🎯 [PANEL] Journey found event received:', {
              id: foundJourney.id,
              name: foundJourney.name,
              steps: foundJourney.steps?.length || 0
            })

            // Check if similar journey already exists
            const isSimilar = hasSimilarJourney(foundJourney)
            console.log('🔄 [PANEL] Is similar to existing?', isSimilar)

            if (isSimilar) {
              console.log('🔄 [PANEL] Similar journey already exists, saving as pending...')
              addJourney({ ...foundJourney, status: 'pending' })
              showToast('Similar journey found, continuing exploration...', 'info')
              controller.resume()
            } else {
              console.log('🆕 [PANEL] New unique journey, pausing for confirmation...')
              // Pause exploration and show confirmation dialog
              controller.pause()
              setPendingJourney(foundJourney)
            }
            break

          case 'completed':
            console.log('✅ [PANEL] Exploration completed event received')
            setIsExploring(false)
            const journeys = controller.getJourneys()
            console.log('✅ [PANEL] Total journeys found:', journeys.length)

            // Show completion message
            if (journeys.length > 0) {
              showToast(`Exploration completed! Found ${journeys.length} journeys`, 'success')
            } else {
              console.log('ℹ️ [PANEL] No journeys found')
              showToast('Exploration completed!', 'info')
            }
            break

          case 'error':
            console.error('❌ [PANEL] Exploration error:', event.data)
            setIsExploring(false)
            showToast(`Exploration error: ${event.data}`, 'error')
            break

          case 'paused':
            console.log('⏸️ [PANEL] Exploration paused')
            setIsExploring(false)
            break
        }
      })

      setExplorationController(controller)
    }
  }, [webviewRef, isConfigured])

  const handleStartExploration = async () => {
    if (!explorationController) {
      showToast('Exploration not ready', 'error')
      return
    }

    try {
      await explorationController.startExploration()
    } catch (error: any) {
      showToast(`Failed to start exploration: ${error.message}`, 'error')
    }
  }

  const handlePauseExploration = () => {
    explorationController?.pause()
    showToast('Exploration paused', 'info')
  }

  const handleResumeExploration = () => {
    explorationController?.resume()
    showToast('Exploration resumed', 'info')
  }

  const handleSaveApiKey = (apiKey: string) => {
    claudeService.saveApiKey(apiKey)
    setIsConfigured(true)
    setShowApiKeyDialog(false)
    showToast('API key saved successfully!', 'success')
  }

  // Text to Flow handlers
  const handleResetTextFlow = () => {
    setTextFlowParsedSteps([])
    setTextFlowCurrentStep(0)
    setTextFlowStepStatuses({})
    setIsExecutingTextFlow(false)
    setTextToFlowController(null)
  }

  const handleExecuteTextFlow = async (flowDescription: string) => {
    if (!webviewRef.current) {
      showToast('Webview not ready', 'error')
      return
    }

    try {
      setIsExecutingTextFlow(true)
      setTextFlowParsedSteps([])
      setTextFlowCurrentStep(0)
      setTextFlowStepStatuses({})

      const controller = new TextToFlowController(webviewRef.current)

      // Set up event listeners
      controller.on((event) => {
        switch (event.type) {
          case 'parsing_flow':
            showToast('Parsing flow description...', 'info')
            break

          case 'parsed_flow':
            console.log('✅ [TEXT TO FLOW] Parsed steps:', event.data.steps)
            setTextFlowParsedSteps(event.data.steps)
            // Initialize all steps as pending
            const initialStatuses: Record<number, 'pending' | 'executing' | 'completed' | 'failed'> = {}
            event.data.steps.forEach((_: any, index: number) => {
              initialStatuses[index] = 'pending'
            })
            setTextFlowStepStatuses(initialStatuses)
            break

          case 'executing_step':
            console.log(`🎯 [TEXT TO FLOW] Executing step ${event.data.index + 1}`)
            setTextFlowCurrentStep(event.data.index)
            setTextFlowStepStatuses((prev) => ({
              ...prev,
              [event.data.index]: 'executing'
            }))
            break

          case 'step_completed':
            console.log(`✅ [TEXT TO FLOW] Step ${event.data.index + 1} completed`)
            setTextFlowStepStatuses((prev) => ({
              ...prev,
              [event.data.index]: 'completed'
            }))
            break

          case 'step_failed':
            console.log(`❌ [TEXT TO FLOW] Step ${event.data.index + 1} failed`)
            setTextFlowStepStatuses((prev) => ({
              ...prev,
              [event.data.index]: 'failed'
            }))
            showToast(`Step ${event.data.index + 1} failed: ${event.data.error}`, 'error')
            break

          case 'completed':
            console.log('🎉 [TEXT TO FLOW] Flow completed!')
            setIsExecutingTextFlow(false)

            // Set the pending journey for user confirmation
            if (event.data.journey) {
              setPendingJourney(event.data.journey)
            }

            showToast('Text to Flow completed successfully!', 'success')
            break

          case 'error':
            console.error('❌ [TEXT TO FLOW] Error:', event.data)
            setIsExecutingTextFlow(false)
            showToast(`Text to Flow error: ${event.data}`, 'error')
            break
        }
      })

      setTextToFlowController(controller)

      // Execute the flow
      await controller.executeFlow(flowDescription)
    } catch (error: any) {
      console.error('❌ [TEXT TO FLOW] Failed:', error)
      setIsExecutingTextFlow(false)
      showToast(`Failed to execute flow: ${error.message}`, 'error')
    }
  }

  const handleConfirmJourney = () => {
    if (!pendingJourney) return

    console.log('🔍 [JOURNEY CONFIRM] Starting journey confirmation...')
    console.log('🔍 [JOURNEY CONFIRM] Journey steps count:', pendingJourney.steps.length)
    console.log('🔍 [JOURNEY CONFIRM] Journey steps:', pendingJourney.steps)

    // Update journey status and add to store
    const confirmedJourney = { ...pendingJourney, status: 'confirmed' as const }
    addJourney(confirmedJourney)

    // Convert to step format and save
    // createStep() sets currentStepId to the newly created step's ID
    createStep(pendingJourney.name)

    // Get the stepId from store (createStep sets currentStepId)
    const stepId = useStepStore.getState().currentStepId
    console.log('🔍 [JOURNEY CONFIRM] Step ID from store:', stepId)

    if (!stepId) {
      console.error('❌ [JOURNEY CONFIRM] Failed to get step ID after creating step')
      showToast('Error saving journey steps', 'error')
      return
    }

    // Verify the step was created
    const createdStep = useStepStore.getState().steps.find(s => s.id === stepId)
    console.log('🔍 [JOURNEY CONFIRM] Created step:', createdStep)

    // Add all actions to the step
    console.log('🔍 [JOURNEY CONFIRM] Adding actions to step...')
    pendingJourney.steps.forEach((step, index) => {
      console.log(`🔍 [JOURNEY CONFIRM] Processing step ${index + 1}:`, {
        type: step.type,
        selector: step.element.selector,
        description: step.description
      })

      const actionType = step.type === 'click' ? 'click' : step.type === 'fill' ? 'type' : step.type as any

      addAction(stepId, {
        type: actionType,
        selector: step.element.selector,
        value: step.type === 'fill' ? 'test-value' : undefined,
        description: step.description
      })
    })

    // Verify actions were added
    const updatedStep = useStepStore.getState().steps.find(s => s.id === stepId)
    console.log('🔍 [JOURNEY CONFIRM] Updated step with actions:', updatedStep)
    console.log('🔍 [JOURNEY CONFIRM] Actions count:', updatedStep?.actions.length)

    showToast(`Journey "${pendingJourney.name}" saved with ${updatedStep?.actions.length || 0} actions!`, 'success')
    setPendingJourney(null)

    // Resume exploration
    explorationController?.resume()
  }

  const handleContinueExploring = () => {
    if (pendingJourney) {
      // Save as pending for future reference
      addJourney({ ...pendingJourney, status: 'pending' })
    }
    setPendingJourney(null)
    explorationController?.resume()
    showToast('Continuing exploration...', 'info')
  }

  const handleDiscardJourney = () => {
    if (pendingJourney) {
      // Save as discarded for future reference
      addJourney({ ...pendingJourney, status: 'discarded' })
      showToast(`Journey "${pendingJourney.name}" discarded`, 'info')
    }
    setPendingJourney(null)
    explorationController?.resume()
  }

  const handleViewJourney = (journey: ExploredJourney) => {
    setSelectedJourney(journey)
  }

  const handleDeleteJourney = (journeyId: string) => {
    deleteJourney(journeyId)
    setSelectedJourney(null)
    showToast('Journey deleted', 'success')
  }

  const handlePlayJourney = (journey: ExploredJourney) => {
    // Convert to step format and save
    const stepId = crypto.randomUUID()
    createStep(journey.name)

    journey.steps.forEach((step) => {
      addAction(stepId, {
        type: step.type === 'click' ? 'click' : 'type',
        selector: step.element.selector,
        value: step.type === 'fill' ? 'test-value' : undefined,
        description: step.description
      })
    })

    // Update status to confirmed
    updateJourney(journey.id, { status: 'confirmed' })

    setSelectedJourney(null)
    showToast(`Journey "${journey.name}" added to manual flow!`, 'success')
  }

  // Show API key dialog if not configured
  if (!isConfigured) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">AI-Powered Journey Discovery</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Let Claude AI intelligently explore your application, discover meaningful user journeys,
            and automatically generate test flows.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>API Key Required:</strong> This feature uses Anthropic's Claude AI
                to make intelligent decisions during exploration.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowApiKeyDialog(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
          >
            <Settings size={20} />
            Configure API Key
          </button>
        </div>

        {showApiKeyDialog && (
          <ApiKeyDialog
            onSave={handleSaveApiKey}
            onClose={() => setShowApiKeyDialog(false)}
          />
        )}
      </div>
    )
  }

  // Show exploration interface
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Sparkles size={20} className="text-indigo-600" />
              AI Exploration
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Intelligent journey discovery powered by Claude AI
            </p>
          </div>
          <button
            onClick={() => setShowApiKeyDialog(true)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="space-y-2">
          {!isExploring ? (
            <button
              onClick={handleStartExploration}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Play size={18} />
              Start Intelligent Exploration
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handlePauseExploration}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
              >
                <Pause size={18} />
                Pause
              </button>
            </div>
          )}
        </div>

        {/* Status */}
        {isExploring && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Exploring...</span>
              <Loader className="animate-spin text-indigo-600" size={16} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Pages Scanned:</span>
                <span className="font-semibold text-gray-800 ml-1">
                  {pagesScanned}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total Nodes:</span>
                <span className="font-semibold text-gray-800 ml-1">
                  {Object.keys(aiJourneysStore.journeys).length}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Journeys:</span>
                <span className="font-semibold text-gray-800 ml-1">
                  {exploredJourneys.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-4">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('textToFlow')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'textToFlow'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={16} />
              Text to Flow
            </div>
          </button>
          <button
            onClick={() => setActiveTab('journeys')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'journeys'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <History size={16} />
              History ({exploredJourneys.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'map'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Map size={16} />
              Map ({Object.keys(aiJourneysStore.journeys).length})
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'textToFlow' && (
        <div className="flex-1 overflow-hidden">
          <TextToFlowPanel
            onExecute={handleExecuteTextFlow}
            onReset={handleResetTextFlow}
            isExecuting={isExecutingTextFlow}
            parsedSteps={textFlowParsedSteps}
            currentStepIndex={textFlowCurrentStep}
            stepStatuses={textFlowStepStatuses}
          />
        </div>
      )}

      {activeTab === 'journeys' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-indigo-600" />
              <h4 className="text-sm font-semibold text-gray-700">
                Journey History ({exploredJourneys.length})
              </h4>
            </div>
          <div className="flex items-center gap-2">
            {isExploring && (
              <span className="text-xs text-indigo-600 font-medium">
                Exploring... ({pagesScanned} pages scanned)
              </span>
            )}
            {exploredJourneys.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all journey history? This cannot be undone.')) {
                    clearAllJourneys()
                    showToast('Journey history cleared', 'success')
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                title="Clear all journeys"
              >
                <Trash2 size={14} />
                Clear All
              </button>
            )}
          </div>
        </div>

        {exploredJourneys.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <Route size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No journeys discovered yet</p>
            <p className="text-sm mt-1">Start exploration to discover user journeys</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exploredJourneys.map((journey) => (
              <div
                key={journey.id}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => handleViewJourney(journey)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-semibold text-gray-800 text-sm group-hover:text-indigo-600 transition-colors flex-1">
                    {journey.name}
                  </h5>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 ${
                      journey.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : journey.status === 'discarded'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {journey.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {journey.completionReason}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{journey.steps.length} steps</span>
                    <span className="text-gray-500">
                      Confidence: {journey.confidence}%
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJourney(journey)
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye size={14} />
                    View
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(journey.createdAt).toLocaleDateString()} • {journey.path.length} pages
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Application Map Tab */}
      {activeTab === 'map' && (
        <div className="flex-1 overflow-hidden">
          <AIJourneysTreeView />
        </div>
      )}

      {/* Journey Completion Dialog */}
      {pendingJourney && (
        <JourneyCompletionDialog
          journey={pendingJourney}
          onConfirm={handleConfirmJourney}
          onContinue={handleContinueExploring}
          onDiscard={handleDiscardJourney}
        />
      )}

      {/* API Key Dialog */}
      {showApiKeyDialog && isConfigured && (
        <ApiKeyDialog
          onSave={handleSaveApiKey}
          onClose={() => setShowApiKeyDialog(false)}
        />
      )}

      {/* Journey Detail View */}
      {selectedJourney && (
        <JourneyDetailView
          journey={selectedJourney}
          onClose={() => setSelectedJourney(null)}
          onDelete={() => handleDeleteJourney(selectedJourney.id)}
          onPlay={() => handlePlayJourney(selectedJourney)}
        />
      )}
    </div>
  )
}

export default AIExplorationPanel
