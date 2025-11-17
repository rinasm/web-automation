/**
 * Feature List Component
 *
 * Displays features for a project with platform-aware filtering
 * Clean, simple UI following the new architecture
 */

import { useState } from 'react'
import { Plus, Trash2, Play, Code, Edit, AlertCircle, ChevronDown, ChevronRight, Target } from 'lucide-react'
import { useFeatureStore } from '../store/featureStore'
import { usePlatformFilter } from '../hooks/usePlatformFilter'
import { useSettingsStore } from '../store/settingsStore'
import { useProjectStore } from '../store/projectStore'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import { PlatformType, Feature } from '../types/feature'
import { simulationService, SimulationProgress } from '../services/simulationService'
import { codeGenerationService, GeneratedCode } from '../services/codeGenerationService'
import { aiSelectorCaptureService, SelectorCaptureProgress } from '../services/aiSelectorCaptureService'
import { CodeGenerationModal } from './CodeGenerationModal'
import { PlatformIndicator } from './PlatformIndicator'
import { MobileTextToFlowController } from '../services/mobileTextToFlowController'

interface FeatureListProps {
  projectId: string
  onCreateFeature: () => void
  onSelectFeature: (featureId: string) => void
  selectedFeatureId: string | null
  webviewRef?: React.RefObject<any>
}

export function FeatureList({
  projectId,
  onCreateFeature,
  onSelectFeature,
  selectedFeatureId,
  webviewRef
}: FeatureListProps) {
  const { features, deleteFeature, getFeaturesByProject, updateFeature } = useFeatureStore()
  const { currentPlatform, getStepCount, getFeatureDescription, filterSteps } = usePlatformFilter(projectId)
  const { advancedMode } = useSettingsStore()
  const { getProjectById } = useProjectStore()
  const { getCurrentDevice } = useMobileDeviceStore()

  const projectFeatures = getFeaturesByProject(projectId)
  const project = getProjectById(projectId)
  const currentMobileDevice = getCurrentDevice()

  // Simulation state
  const [simulatingFeatureId, setSimulatingFeatureId] = useState<string | null>(null)
  const [simulationProgress, setSimulationProgress] = useState<SimulationProgress>({
    currentStepIndex: 0,
    currentActionIndex: 0,
    status: 'idle',
    message: ''
  })

  // Code generation state
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null)

  // Expand/collapse state
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set())

  // AI selector capture state
  const [capturingFeatureId, setCapturingFeatureId] = useState<string | null>(null)
  const [captureProgress, setCaptureProgress] = useState<SelectorCaptureProgress>({
    currentStepIndex: 0,
    totalSteps: 0,
    status: 'running',
    message: ''
  })

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getPlatformBadgeColor = (platform: PlatformType) => {
    return platform === 'web'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-green-100 text-green-700'
  }

  const handleDeleteFeature = (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this feature?')) {
      deleteFeature(featureId)
      if (selectedFeatureId === featureId) {
        onSelectFeature(projectFeatures[0]?.id || '')
      }
    }
  }

  const handleSimulateFeature = async (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!currentPlatform) {
      alert('Please select a platform first')
      return
    }

    const feature = features.find(f => f.id === featureId)
    if (!feature) return

    const steps = filterSteps(feature)
    if (steps.length === 0) {
      alert('No steps to simulate. Please add steps to this feature first.')
      return
    }

    setSimulatingFeatureId(featureId)
    setSimulationProgress({
      currentStepIndex: 0,
      currentActionIndex: 0,
      status: 'running',
      message: 'Starting simulation...'
    })

    try {
      await simulationService.simulateSteps(
        steps,
        currentPlatform,
        (progress) => {
          setSimulationProgress(progress)
        }
      )

      // Wait a bit before clearing so user can see completion
      setTimeout(() => {
        setSimulatingFeatureId(null)
      }, 2000)
    } catch (error) {
      console.error('Simulation failed:', error)
      setSimulationProgress({
        currentStepIndex: 0,
        currentActionIndex: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Simulation failed'
      })

      // Clear after showing error
      setTimeout(() => {
        setSimulatingFeatureId(null)
      }, 3000)
    }
  }

  const handleStopSimulation = () => {
    simulationService.stop()
    setSimulatingFeatureId(null)
    setSimulationProgress({
      currentStepIndex: 0,
      currentActionIndex: 0,
      status: 'idle',
      message: ''
    })
  }

  const handleGenerateCode = (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!currentPlatform || !project) {
      alert('Unable to generate code. Please check project configuration.')
      return
    }

    const feature = features.find(f => f.id === featureId)
    if (!feature) return

    const steps = filterSteps(feature)
    if (steps.length === 0) {
      alert('No steps to generate code. Please add steps to this feature first.')
      return
    }

    try {
      const code = codeGenerationService.generateFeatureCode(
        feature,
        currentPlatform,
        {
          projectName: project.title,
          webUrl: project.webUrl,
          mobileApps: project.mobileApps
        }
      )

      setGeneratedCode(code)
      setShowCodeModal(true)
    } catch (error) {
      console.error('Code generation failed:', error)
      alert('Failed to generate code. Please try again.')
    }
  }

  const handleExportCode = async () => {
    if (!generatedCode) return

    try {
      await codeGenerationService.exportCode(generatedCode)
      alert('Code exported successfully!')
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export code. Please try again.')
    }
  }

  const handleCloseCodeModal = () => {
    setShowCodeModal(false)
    setGeneratedCode(null)
  }

  const handleRegenerateSteps = (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const feature = features.find(f => f.id === featureId)
    if (!feature) return

    const description = currentPlatform === 'web'
      ? feature.descriptionWeb
      : feature.descriptionMobile

    if (!description) {
      alert(`No ${currentPlatform} description found for this feature. Please add a description first.`)
      return
    }

    if (!confirm(`Regenerate ${currentPlatform} steps? This will replace existing ${currentPlatform} steps.`)) {
      return
    }

    // TODO: Integrate with AI step generation service when available
    // For now, show a placeholder message
    alert(`Step regeneration for ${currentPlatform} platform is not yet implemented. This will use AI to regenerate steps based on the feature description: "${description}"`)

    // Future implementation:
    // const newSteps = await stepGenerationService.generateSteps(description, currentPlatform)
    // if (currentPlatform === 'web') {
    //   updateFeature(featureId, { stepsWeb: newSteps })
    // } else {
    //   updateFeature(featureId, { stepsMobile: newSteps })
    // }
  }

  const toggleExpand = (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedFeatures(prev => {
      const newSet = new Set(prev)
      if (newSet.has(featureId)) {
        newSet.delete(featureId)
      } else {
        newSet.add(featureId)
      }
      return newSet
    })
  }

  const handleCaptureSelectors = async (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!webviewRef?.current) {
      alert('Web preview not available. Please ensure the web platform is loaded.')
      return
    }

    if (!currentPlatform || currentPlatform !== 'web') {
      alert('AI selector capture is currently only supported for web platform. Please switch to web mode.')
      return
    }

    const feature = features.find(f => f.id === featureId)
    if (!feature) return

    const steps = filterSteps(feature)
    if (steps.length === 0) {
      alert('No steps to enrich. Please generate steps first.')
      return
    }

    setCapturingFeatureId(featureId)
    setCaptureProgress({
      currentStepIndex: 0,
      totalSteps: steps.length,
      status: 'running',
      message: 'Starting AI-guided selector capture...'
    })

    try {
      console.log('🎯 [CAPTURE] Starting selector capture for feature:', feature.name)

      // Set up progress listener
      const progressListener = (progress: SelectorCaptureProgress) => {
        setCaptureProgress(progress)
      }
      aiSelectorCaptureService.onProgress(progressListener)

      // Enrich steps with selectors
      const enrichedSteps = await aiSelectorCaptureService.enrichStepsWithSelectors(
        steps,
        currentPlatform,
        webviewRef.current
      )

      console.log('✅ [CAPTURE] Enrichment complete. Updating feature...')

      // Update feature with enriched steps
      updateFeature(featureId, {
        stepsWeb: enrichedSteps,
        status: 'generated' as const
      })

      // Clean up listener
      aiSelectorCaptureService.offProgress(progressListener)

      // Wait a bit to show completion
      setTimeout(() => {
        setCapturingFeatureId(null)
      }, 2000)

      alert('✅ Selectors captured successfully! Your feature is now ready to simulate.')
    } catch (error) {
      console.error('Selector capture failed:', error)
      setCaptureProgress({
        currentStepIndex: 0,
        totalSteps: steps.length,
        status: 'error',
        message: error instanceof Error ? error.message : 'Selector capture failed'
      })

      setTimeout(() => {
        setCapturingFeatureId(null)
      }, 3000)

      alert(`Failed to capture selectors: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSimulateMobileTextFlow = async (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    console.log('🎯 [UI] handleSimulateMobileTextFlow called for feature:', featureId)
    console.log('🎯 [UI] Current platform:', currentPlatform)
    console.log('🎯 [UI] Current mobile device:', currentMobileDevice)

    if (!currentPlatform || currentPlatform !== 'mobile') {
      console.warn('⚠️ [UI] Not in mobile platform mode')
      alert('Mobile text-to-flow simulation is only supported for mobile platform. Please switch to mobile mode.')
      return
    }

    if (!currentMobileDevice) {
      console.warn('⚠️ [UI] No mobile device connected')
      alert('No mobile device connected. Please connect a device via SDK first.')
      return
    }

    const feature = features.find(f => f.id === featureId)
    if (!feature) {
      console.warn('⚠️ [UI] Feature not found:', featureId)
      return
    }

    const steps = filterSteps(feature)
    console.log('🎯 [UI] Steps found:', steps.length, steps)
    if (steps.length === 0) {
      alert('No steps to simulate. Please generate steps first.')
      return
    }

    setCapturingFeatureId(featureId)
    setCaptureProgress({
      currentStepIndex: 0,
      totalSteps: steps.length,
      status: 'running',
      message: 'Starting mobile AI-guided simulation...'
    })

    try {
      console.log('📱 [MOBILE TEXT-TO-FLOW] Starting simulation for feature:', feature.name)
      console.log('📱 [MOBILE TEXT-TO-FLOW] Using device:', currentMobileDevice.name)

      // Use bundle ID for SDK communication (not Appium device ID)
      // The SDK WebSocket identifies devices by bundle ID, not by Appium's device ID format
      const bundleId = project?.bundleId || 'com.rinasmusthafa.MyTodoApp'
      console.log('📱 [MOBILE TEXT-TO-FLOW] Using bundle ID for SDK:', bundleId)

      // Create controller with bundle ID
      const controller = new MobileTextToFlowController(bundleId)

      // Set up progress listener
      controller.addEventListener((event) => {
        console.log('📱 [MOBILE TEXT-TO-FLOW] Event:', event.type, event.data)

        switch (event.type) {
          case 'executing_step':
            setCaptureProgress({
              currentStepIndex: event.data.index,
              totalSteps: event.data.total,
              status: 'running',
              message: `Executing step ${event.data.index + 1}/${event.data.total}...`
            })
            break
          case 'getting_hierarchy':
            setCaptureProgress(prev => ({
              ...prev,
              message: 'Getting view hierarchy from device...'
            }))
            break
          case 'hierarchy_received':
            setCaptureProgress(prev => ({
              ...prev,
              message: 'Analyzing view hierarchy with AI...'
            }))
            break
        }
      })

      // Execute steps and get enriched steps with XPaths
      const enrichedSteps = await controller.executeSteps(steps)

      console.log('✅ [MOBILE TEXT-TO-FLOW] Enrichment complete. Updating feature...')

      // Update feature with enriched steps
      updateFeature(featureId, {
        stepsMobile: enrichedSteps,
        status: 'generated' as const
      })

      // Wait a bit to show completion
      setTimeout(() => {
        setCapturingFeatureId(null)
      }, 2000)

      alert('✅ XPaths captured successfully! Your mobile feature is now ready to simulate.')
    } catch (error) {
      console.error('Mobile text-to-flow simulation failed:', error)
      setCaptureProgress({
        currentStepIndex: 0,
        totalSteps: steps.length,
        status: 'error',
        message: error instanceof Error ? error.message : 'Simulation failed'
      })

      setTimeout(() => {
        setCapturingFeatureId(null)
      }, 3000)

      alert(`Failed to simulate: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Features</h2>
        <button
          onClick={onCreateFeature}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Feature
        </button>
      </div>

      {/* Platform Indicator */}
      {currentPlatform && (
        <div className="px-4 py-2 bg-gray-100 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Viewing:</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPlatformBadgeColor(currentPlatform)}`}>
              {currentPlatform.toUpperCase()} Steps
            </span>
          </div>
        </div>
      )}

      {/* Features List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {projectFeatures.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-2">No features yet</p>
            <p className="text-gray-400 text-xs">
              Click "New Feature" to create your first feature
            </p>
          </div>
        ) : (
          projectFeatures.map((feature) => {
            const stepCount = getStepCount(feature)
            const description = getFeatureDescription(feature)
            const isSelected = feature.id === selectedFeatureId
            const steps = filterSteps(feature)
            const hasWebSteps = feature.stepsWeb.length > 0
            const hasMobileSteps = feature.stepsMobile.length > 0
            const hasOtherPlatformSteps = currentPlatform === 'web' ? hasMobileSteps : hasWebSteps
            const isExpanded = expandedFeatures.has(feature.id)
            const isSimulating = simulatingFeatureId === feature.id && simulationProgress.status === 'running'
            const isCapturing = capturingFeatureId === feature.id
            const anyCaptureInProgress = capturingFeatureId !== null

            return (
              <div
                key={feature.id}
                onClick={() => onSelectFeature(feature.id)}
                className={`
                  p-4 rounded-lg cursor-pointer transition-all
                  ${isSelected
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-white border-2 border-transparent hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                {/* Header with Title and Actions */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg mb-1 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {feature.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {stepCount > 0 && (
                      <>
                        {/* Capture Selectors button - Web platform when status is 'needs_selectors' */}
                        {feature.status === 'needs_selectors' && currentPlatform === 'web' && (
                          <button
                            onClick={(e) => handleCaptureSelectors(feature.id, e)}
                            className={`transition-colors p-1.5 rounded ${
                              anyCaptureInProgress && !isCapturing
                                ? 'text-gray-400 cursor-not-allowed opacity-50'
                                : 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                            }`}
                            title={anyCaptureInProgress && !isCapturing ? 'Another feature is being captured' : 'Capture XPath selectors using AI'}
                            disabled={anyCaptureInProgress && !isCapturing}
                          >
                            <Target size={18} className={isCapturing ? 'animate-pulse' : ''} />
                          </button>
                        )}
                        {/* Simulate & Find XPaths button - Mobile platform when status is 'needs_selectors' */}
                        {feature.status === 'needs_selectors' && currentPlatform === 'mobile' && (
                          <button
                            onClick={(e) => handleSimulateMobileTextFlow(feature.id, e)}
                            className={`transition-colors p-1.5 rounded ${
                              anyCaptureInProgress && !isCapturing
                                ? 'text-gray-400 cursor-not-allowed opacity-50'
                                : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
                            }`}
                            title={anyCaptureInProgress && !isCapturing ? 'Another feature is being simulated' : 'Simulate & Find XPaths with AI'}
                            disabled={anyCaptureInProgress && !isCapturing}
                          >
                            <Target size={18} className={isCapturing ? 'animate-pulse' : ''} />
                          </button>
                        )}
                        {/* Simulate button - disabled when needs_selectors or any capture in progress */}
                        <button
                          onClick={(e) => handleSimulateFeature(feature.id, e)}
                          className={`transition-colors p-1.5 rounded ${
                            feature.status === 'needs_selectors' || anyCaptureInProgress
                              ? 'text-gray-400 cursor-not-allowed opacity-50'
                              : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                          }`}
                          title={
                            anyCaptureInProgress ? 'Cannot simulate during selector capture' :
                            feature.status === 'needs_selectors' ? 'Capture selectors first' :
                            'Simulate feature'
                          }
                          disabled={feature.status === 'needs_selectors' || anyCaptureInProgress}
                        >
                          <Play size={18} />
                        </button>
                        <button
                          onClick={(e) => handleGenerateCode(feature.id, e)}
                          className={`transition-colors p-1.5 rounded ${
                            anyCaptureInProgress
                              ? 'text-gray-400 cursor-not-allowed opacity-50'
                              : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                          }`}
                          title={anyCaptureInProgress ? 'Cannot generate code during selector capture' : 'Generate code'}
                          disabled={anyCaptureInProgress}
                        >
                          <Code size={18} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => onSelectFeature(feature.id)}
                      className={`transition-colors p-1.5 rounded ${
                        anyCaptureInProgress
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                      title={anyCaptureInProgress ? 'Cannot edit during selector capture' : 'Edit feature'}
                      disabled={anyCaptureInProgress}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteFeature(feature.id, e)}
                      className={`transition-colors p-1.5 rounded ${
                        anyCaptureInProgress
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                      }`}
                      title={anyCaptureInProgress ? 'Cannot delete during selector capture' : 'Delete feature'}
                      disabled={anyCaptureInProgress}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Description or Current Step (when simulating while collapsed) */}
                {!isExpanded && isSimulating && steps[simulationProgress.currentStepIndex] ? (
                  <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                    <p className="text-sm font-bold text-green-900">
                      Currently running: {steps[simulationProgress.currentStepIndex].name}
                    </p>
                  </div>
                ) : !isExpanded && capturingFeatureId === feature.id ? (
                  <div className="mb-3 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
                    <p className="text-sm font-bold text-orange-900">
                      {captureProgress.message}
                    </p>
                    <div className="mt-2 text-xs text-orange-700">
                      Step {captureProgress.currentStepIndex + 1} of {captureProgress.totalSteps}
                    </div>
                  </div>
                ) : description ? (
                  <p className="text-sm text-gray-600 mb-3 italic">
                    {description}
                  </p>
                ) : null}

                {/* Warning banner for features needing selectors */}
                {feature.status === 'needs_selectors' && !isExpanded && capturingFeatureId !== feature.id && (
                  <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800 flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      {currentPlatform === 'web'
                        ? 'Selectors missing. Click the '
                        : 'XPaths missing. Click the '}
                      <Target size={12} className="inline" />
                      {currentPlatform === 'web'
                        ? ' button to capture XPath using AI.'
                        : ' button to simulate & find XPaths with AI.'}
                    </span>
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <button
                  onClick={(e) => toggleExpand(feature.id, e)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors mb-3"
                >
                  {isExpanded ? (
                    <>
                      <ChevronDown size={16} />
                      <span>Hide Details</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight size={16} />
                      <span>Show Details</span>
                    </>
                  )}
                </button>

                {/* Expanded Content - Only show when expanded */}
                {isExpanded && (
                  <>
                    {/* Advanced Mode Status Badge */}
                    {advancedMode && (
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-medium mb-3
                        ${feature.status === 'draft' ? 'bg-gray-100 text-gray-700' : ''}
                        ${feature.status === 'generated' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${feature.status === 'needs_selectors' ? 'bg-orange-100 text-orange-700' : ''}
                        ${feature.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                      `}>
                        {feature.status === 'needs_selectors' ? 'Needs Selectors' : feature.status.charAt(0).toUpperCase() + feature.status.slice(1)}
                      </span>
                    )}

                    {/* Platform Indicator */}
                    <div className="mb-3">
                      <PlatformIndicator
                        hasWebSteps={hasWebSteps}
                        hasMobileSteps={hasMobileSteps}
                        size="small"
                      />
                    </div>

                    {/* Steps List */}
                    {steps.length > 0 ? (
                      <div className="mt-4 border-t pt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                          <span>Steps ({steps.length}):</span>
                          {simulatingFeatureId === feature.id && simulationProgress.status !== 'idle' && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              simulationProgress.status === 'running' ? 'bg-blue-100 text-blue-700' :
                              simulationProgress.status === 'completed' ? 'bg-green-100 text-green-700' :
                              simulationProgress.status === 'error' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {simulationProgress.status === 'running' && '▶️ Running'}
                              {simulationProgress.status === 'completed' && '✅ Completed'}
                              {simulationProgress.status === 'error' && '❌ Error'}
                              {simulationProgress.status === 'paused' && '⏸️ Paused'}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {steps.map((step, index) => {
                            const isCurrentSimulationStep = simulatingFeatureId === feature.id &&
                                                index === simulationProgress.currentStepIndex &&
                                                simulationProgress.status === 'running'
                            const isCurrentCaptureStep = isCapturing &&
                                                index === captureProgress.currentStepIndex &&
                                                captureProgress.status === 'running'
                            return (
                              <div
                                key={step.id}
                                className={`text-sm p-2 rounded transition-colors ${
                                  isCurrentSimulationStep ? 'bg-blue-50 border-l-4 border-blue-500' :
                                  isCurrentCaptureStep ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                                }`}
                              >
                                <div className={`font-medium ${
                                  isCurrentSimulationStep ? 'text-blue-900' :
                                  isCurrentCaptureStep ? 'text-orange-900' :
                                  'text-gray-800'
                                }`}>
                                  {isCurrentSimulationStep && <span className="mr-2">▶️</span>}
                                  {isCurrentCaptureStep && <span className="mr-2">🎯</span>}
                                  {index + 1}. {step.name}
                                </div>
                                {/* Show waiting for page load status */}
                                {isCurrentSimulationStep && simulationProgress.waitingForPageLoad && (
                                  <div className="mt-1 text-xs text-blue-600 italic">
                                    ⏳ waiting for page load...
                                  </div>
                                )}
                                {/* Show self-healing status */}
                                {isCurrentSimulationStep && simulationProgress.selfHealing && (
                                  <div className="mt-1 text-xs text-purple-600 italic font-medium">
                                    🔧 Self healing with AI...
                                  </div>
                                )}
                                {step.actions.length > 0 && (
                                  <div className="ml-4 mt-1 space-y-1">
                                    {step.actions.map((action, actionIndex) => {
                                      const isCurrentSimulationAction = isCurrentSimulationStep &&
                                                            actionIndex === simulationProgress.currentActionIndex
                                      // During capture, we don't track individual actions, so just highlight all actions in the current step
                                      const isCurrentCaptureAction = isCurrentCaptureStep
                                      return (
                                        <div
                                          key={action.id}
                                          className={`text-xs flex items-start ${
                                            isCurrentSimulationAction ? 'text-blue-700 font-medium' :
                                            isCurrentCaptureAction ? 'text-orange-700 font-medium' :
                                            'text-gray-600'
                                          }`}
                                        >
                                          <span className="mr-1">•</span>
                                          <span className="flex-1">
                                            {action.type}
                                            {action.isPassword && <span className="ml-1">🔒</span>}
                                            {action.value && ` "${action.value}"`}
                                            {action.selector && ` → ${action.selector.substring(0, 40)}${action.selector.length > 40 ? '...' : ''}`}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Action Buttons for Steps */}
                        <div className="mt-3 flex gap-2">
                          {simulatingFeatureId === feature.id ? (
                            <button
                              onClick={handleStopSimulation}
                              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                              ⏹ Stop Simulation
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleRegenerateSteps(feature.id, e)}
                                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                              >
                                Regenerate Steps
                              </button>
                              <button
                                onClick={(e) => handleSimulateFeature(feature.id, e)}
                                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              >
                                ▶️ Simulate {currentPlatform === 'web' ? 'Web' : 'Mobile'}
                              </button>
                            </>
                          )}
                        </div>

                        {/* Info Banner for Hidden Steps */}
                        {hasOtherPlatformSteps && (
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                            <span>
                              {currentPlatform === 'web' ? 'Mobile' : 'Web'} steps hidden in {currentPlatform === 'web' ? 'Web' : 'Mobile'} mode
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 border-t pt-3 text-sm text-gray-500">
                        No {currentPlatform} steps created yet.
                      </div>
                    )}

                    {/* Date - Only in Advanced Mode */}
                    {advancedMode && (
                      <div className="mt-3 text-xs text-gray-400">
                        Last edited: {formatDate(feature.lastEdited)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Code Generation Modal */}
      <CodeGenerationModal
        isOpen={showCodeModal}
        generatedCode={generatedCode}
        onClose={handleCloseCodeModal}
        onExport={handleExportCode}
      />
    </div>
  )
}
