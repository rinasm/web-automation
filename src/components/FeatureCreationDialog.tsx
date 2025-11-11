/**
 * Feature Creation Dialog
 *
 * Supports multi-platform feature creation with 3 input methods:
 * 1. Manual typing
 * 2. Voice-to-text
 * 3. Record actions
 */

import { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { useFeatureStore } from '../store/featureStore'
import { useProjectStore } from '../store/projectStore'
import { stepGenerationService } from '../services/stepGenerationService'
import { PlatformDescriptionInput } from './PlatformDescriptionInput'
import { convertRecordingToSteps } from '../utils/recordingToSteps'
import { RecordedEvent } from '../utils/recordingToDescription'

type CreationMethod = 'manual' | 'voice' | 'record'

interface FeatureCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (featureId: string) => void
  projectId: string
  onStartRecording: (platform: 'web' | 'mobile', onComplete: (events: RecordedEvent[]) => void) => void
}

export function FeatureCreationDialog({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  onStartRecording
}: FeatureCreationDialogProps) {
  const { createFeature, updateFeature, addStepToFeature } = useFeatureStore()
  const { getProjectById } = useProjectStore()

  // Feature name
  const [name, setName] = useState('')

  // Web platform state
  const [webDescription, setWebDescription] = useState('')
  const [webRecordedEvents, setWebRecordedEvents] = useState<RecordedEvent[]>([])
  const [webCreationMethod, setWebCreationMethod] = useState<CreationMethod>('manual')

  // Mobile platform state
  const [mobileDescription, setMobileDescription] = useState('')
  const [mobileRecordedEvents, setMobileRecordedEvents] = useState<RecordedEvent[]>([])
  const [mobileCreationMethod, setMobileCreationMethod] = useState<CreationMethod>('manual')

  // UI state
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')

  const project = getProjectById(projectId)
  const hasWebConfig = Boolean(project?.webUrl)
  const hasMobileConfig = Boolean(project?.mobileApps?.ios || project?.mobileApps?.android)

  if (!isOpen) return null

  const handlePlatformStartRecording = (platform: 'web' | 'mobile') => {
    // Call parent's recording handler with callback
    onStartRecording(platform, (events: RecordedEvent[]) => {
      console.log('📹 [DIALOG CALLBACK] Received events:', events.length, events)

      // Generate a brief description from events
      const description = generateDescriptionFromEvents(events)
      console.log('📹 [DIALOG CALLBACK] Generated description:', description)

      // When recording completes, store the recorded events AND description
      if (platform === 'web') {
        console.log('📹 [DIALOG CALLBACK] Setting web recorded events and description')
        setWebRecordedEvents(events)
        setWebDescription(description)
        setWebCreationMethod('record')
      } else {
        console.log('📹 [DIALOG CALLBACK] Setting mobile recorded events and description')
        setMobileRecordedEvents(events)
        setMobileDescription(description)
        setMobileCreationMethod('record')
      }
      console.log('📹 [DIALOG CALLBACK] State updated')
    })
  }

  // Generate a human-readable description from recorded events
  const generateDescriptionFromEvents = (events: RecordedEvent[]): string => {
    if (events.length === 0) return ''

    const descriptions: string[] = []

    for (let i = 0; i < events.length; i++) {
      const event = events[i]

      if (event.type === 'navigate') {
        const url = event.url || 'page'
        const domain = url.includes('://') ? url.split('://')[1].split('/')[0] : url
        descriptions.push(`Navigate to ${domain}`)
      } else if (event.type === 'click' || event.type === 'tap') {
        const text = event.elementText?.trim()
        const selector = event.selector || ''

        // Try to determine what was clicked based on text or selector
        if (text) {
          descriptions.push(`Click on "${text}" button`)
        } else if (selector.includes('submit') || selector.includes('button')) {
          descriptions.push('Click submit button')
        } else if (selector.includes('login')) {
          descriptions.push('Click login button')
        } else if (selector.includes('search')) {
          descriptions.push('Click search button')
        } else if (selector.includes('link')) {
          descriptions.push('Click link')
        } else {
          descriptions.push('Click element')
        }
      } else if (event.type === 'type') {
        const selector = event.selector?.toLowerCase() || ''
        const value = event.value || ''

        // Determine field type from selector
        if (selector.includes('password')) {
          descriptions.push('Enter password')
        } else if (selector.includes('email')) {
          descriptions.push('Enter email address')
        } else if (selector.includes('username') || selector.includes('user')) {
          descriptions.push('Enter username')
        } else if (selector.includes('search')) {
          descriptions.push(`Search for "${value}"`)
        } else if (selector.includes('name')) {
          descriptions.push('Enter name')
        } else if (selector.includes('phone') || selector.includes('mobile')) {
          descriptions.push('Enter phone number')
        } else if (selector.includes('address')) {
          descriptions.push('Enter address')
        } else if (selector.includes('message') || selector.includes('comment')) {
          descriptions.push('Enter message')
        } else {
          // Generic fallback
          descriptions.push('Fill in text field')
        }
      } else if (event.type === 'scroll') {
        descriptions.push('Scroll down the page')
      } else if (event.type === 'swipe') {
        descriptions.push('Swipe screen')
      }
    }

    // Remove duplicates while preserving order
    const uniqueDescriptions = descriptions.filter((desc, index) => {
      // Keep if it's the first occurrence OR if it's not the same as the previous one
      return index === 0 || desc !== descriptions[index - 1]
    })

    return uniqueDescriptions.join(', then ')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!name.trim()) {
      setError('Feature name is required')
      return
    }

    const hasWebInput = webDescription.trim() || webRecordedEvents.length > 0
    const hasMobileInput = mobileDescription.trim() || mobileRecordedEvents.length > 0

    if (!hasWebInput && !hasMobileInput) {
      setError('Please provide a description or recording for at least one platform')
      return
    }

    setIsGenerating(true)
    setGenerationStatus('Creating feature...')

    try {
      // 1. Create feature
      const featureId = createFeature(projectId, name.trim())

      let webStepsCount = 0
      let mobileStepsCount = 0

      // 2. Handle WEB platform
      if (hasWebConfig && hasWebInput) {
        // If recorded, convert events directly to steps (with selectors!)
        if (webRecordedEvents.length > 0) {
          setGenerationStatus('Converting recorded actions to steps...')

          // Save the description
          updateFeature(featureId, {
            descriptionWeb: webDescription.trim()
          })

          const recordedSteps = convertRecordingToSteps(webRecordedEvents)

          setGenerationStatus(`Created ${recordedSteps.length} web steps from recording. Adding to feature...`)

          for (const generatedStep of recordedSteps) {
            const step = {
              id: crypto.randomUUID(),
              name: generatedStep.name,
              actions: generatedStep.actions,
              createdAt: Date.now(),
              order: generatedStep.order,
              featureId: featureId,
              platform: 'web' as const
            }
            addStepToFeature(featureId, 'web', step)
            webStepsCount++
          }
        }
        // If description, use AI to generate steps (empty selectors)
        else if (webDescription.trim()) {
        setGenerationStatus('Generating web test steps with AI...')

        updateFeature(featureId, {
          descriptionWeb: webDescription.trim()
        })

        const webResult = await stepGenerationService.generateStepsFromDescription(
          webDescription.trim(),
          'web',
          { url: project?.webUrl }
        )

        setGenerationStatus(`Generated ${webResult.steps.length} web steps. Adding to feature...`)

        // Add generated steps to feature.stepsWeb
        for (const generatedStep of webResult.steps) {
          const step = {
            id: crypto.randomUUID(),
            name: generatedStep.name,
            actions: generatedStep.actions,
            createdAt: Date.now(),
            order: generatedStep.order,
            featureId: featureId,
            platform: 'web' as const
          }
          addStepToFeature(featureId, 'web', step)
          webStepsCount++
        }

        if (webResult.warnings.length > 0) {
          console.warn('Web generation warnings:', webResult.warnings)
        }
        }
      }

      // 3. Handle MOBILE platform
      if (hasMobileConfig && hasMobileInput) {
        // If recorded, convert events directly to steps (with selectors!)
        if (mobileRecordedEvents.length > 0) {
          setGenerationStatus('Converting recorded mobile actions to steps...')

          // Save the description
          updateFeature(featureId, {
            descriptionMobile: mobileDescription.trim()
          })

          const recordedSteps = convertRecordingToSteps(mobileRecordedEvents)

          setGenerationStatus(`Created ${recordedSteps.length} mobile steps from recording. Adding to feature...`)

          for (const generatedStep of recordedSteps) {
            const step = {
              id: crypto.randomUUID(),
              name: generatedStep.name,
              actions: generatedStep.actions,
              createdAt: Date.now(),
              order: generatedStep.order,
              featureId: featureId,
              platform: 'mobile' as const
            }
            addStepToFeature(featureId, 'mobile', step)
            mobileStepsCount++
          }
        }
        // If description, use AI to generate steps (empty selectors)
        else if (mobileDescription.trim()) {
          setGenerationStatus('Generating mobile test steps with AI...')

          updateFeature(featureId, {
            descriptionMobile: mobileDescription.trim()
          })

          const mobileResult = await stepGenerationService.generateStepsFromDescription(
            mobileDescription.trim(),
            'mobile',
            { appInfo: project?.mobileApps }
          )

          setGenerationStatus(`Generated ${mobileResult.steps.length} mobile steps. Adding to feature...`)

          // Add generated steps to feature.stepsMobile
          for (const generatedStep of mobileResult.steps) {
            const step = {
              id: crypto.randomUUID(),
              name: generatedStep.name,
              actions: generatedStep.actions,
              createdAt: Date.now(),
              order: generatedStep.order,
              featureId: featureId,
              platform: 'mobile' as const
            }
            addStepToFeature(featureId, 'mobile', step)
            mobileStepsCount++
          }

          if (mobileResult.warnings.length > 0) {
            console.warn('Mobile generation warnings:', mobileResult.warnings)
          }
        }
      }

      // 4. Update feature status
      if (webStepsCount > 0 || mobileStepsCount > 0) {
        // Check if any steps were generated from AI (text/voice) vs recording
        const hasWebAIGenerated = webDescription.trim() && webRecordedEvents.length === 0 && webStepsCount > 0
        const hasMobileAIGenerated = mobileDescription.trim() && mobileRecordedEvents.length === 0 && mobileStepsCount > 0

        if (hasWebAIGenerated || hasMobileAIGenerated) {
          // AI-generated steps need selectors to be captured
          updateFeature(featureId, {
            status: 'needs_selectors' as const
          })
          setGenerationStatus(`Complete! Generated ${webStepsCount} web steps and ${mobileStepsCount} mobile steps. Click "Capture Selectors" to record XPath.`)
        } else {
          // Recorded steps already have selectors
          updateFeature(featureId, {
            status: 'generated' as const
          })
          setGenerationStatus(`Complete! Generated ${webStepsCount} web steps and ${mobileStepsCount} mobile steps.`)
        }
      } else {
        updateFeature(featureId, {
          status: 'draft' as const
        })
        setGenerationStatus('Feature created! Steps will be generated when you add descriptions.')
      }

      // Wait a moment to show completion message
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 5. Reset form and close
      setName('')
      setWebDescription('')
      setMobileDescription('')
      setWebCreationMethod('manual')
      setMobileCreationMethod('manual')
      setGenerationStatus('')
      setIsGenerating(false)

      onSuccess(featureId)
    } catch (err) {
      console.error('Feature creation failed:', err)
      setError('Failed to generate steps. Please try again.')
      setIsGenerating(false)
      setGenerationStatus('')
    }
  }

  const handleClose = () => {
    if (!isGenerating) {
      setName('')
      setWebDescription('')
      setMobileDescription('')
      setError('')
      setGenerationStatus('')
      onClose()
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b z-10">
            <h2 className="text-xl font-semibold">Create New Feature</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isGenerating}
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Feature Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feature Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., User Login, Add to Cart, Search Products"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                required
                disabled={isGenerating}
              />
              <p className="mt-1 text-xs text-gray-500">
                A clear, descriptive name for this feature
              </p>
            </div>

            {/* Web Platform Description */}
            {hasWebConfig && (
              <PlatformDescriptionInput
                platform="web"
                value={webDescription}
                onChange={setWebDescription}
                creationMethod={webCreationMethod}
                onCreationMethodChange={setWebCreationMethod}
                onStartRecording={() => handlePlatformStartRecording('web')}
                disabled={isGenerating}
                required={!hasMobileConfig}
              />
            )}

            {/* Mobile Platform Description */}
            {hasMobileConfig && (
              <PlatformDescriptionInput
                platform="mobile"
                value={mobileDescription}
                onChange={setMobileDescription}
                creationMethod={mobileCreationMethod}
                onCreationMethodChange={setMobileCreationMethod}
                onStartRecording={() => handlePlatformStartRecording('mobile')}
                disabled={isGenerating}
                required={!hasWebConfig}
              />
            )}

            {/* Platform Configuration Warning */}
            {!hasWebConfig && !hasMobileConfig && (
              <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded">
                <p className="text-sm text-yellow-800">
                  No platforms configured for this project. Please configure at least one platform in project settings.
                </p>
              </div>
            )}

            {/* Generation Status */}
            {isGenerating && (
              <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded flex items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={20} />
                <span className="text-sm text-blue-800">{generationStatus}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isGenerating || (!hasWebConfig && !hasMobileConfig)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Create Feature & Generate Steps
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
