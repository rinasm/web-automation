import { aiDecisionService } from './aiDecisionService'
import { Step } from '../types/feature'

export type MobileTextToFlowEventType =
  | 'started'
  | 'executing_step'
  | 'step_completed'
  | 'step_failed'
  | 'completed'
  | 'error'
  | 'getting_hierarchy'
  | 'hierarchy_received'

export interface MobileTextToFlowEvent {
  type: MobileTextToFlowEventType
  data?: any
  timestamp: number
}

export type MobileTextToFlowEventListener = (event: MobileTextToFlowEvent) => void

/**
 * Controller for Mobile Text to Flow feature
 * Executes mobile test steps using SDK to get view hierarchy and AI to find elements
 */
export class MobileTextToFlowController {
  private deviceId: string
  private eventListeners: MobileTextToFlowEventListener[] = []
  private isExecuting: boolean = false
  private currentStepIndex: number = 0
  private hierarchyResponsePromise: {
    resolve: (hierarchy: string) => void
    reject: (error: Error) => void
  } | null = null
  private actionResponsePromises: Map<
    string,
    {
      resolve: () => void
      reject: (error: Error) => void
    }
  > = new Map()

  constructor(deviceId: string) {
    this.deviceId = deviceId
    this.setupHierarchyResponseListener()
    this.setupActionResponseListener()
  }

  /**
   * Setup listener for view hierarchy responses from SDK
   */
  private setupHierarchyResponseListener() {
    if (window.electronAPI?.onSDKViewHierarchyResponse) {
      window.electronAPI.onSDKViewHierarchyResponse((data) => {
        // Only handle responses for this device
        if (data.deviceId !== this.deviceId) return

        console.log('🌳 [MOBILE TEXT TO FLOW] Received view hierarchy response')

        if (this.hierarchyResponsePromise) {
          if (data.response.success) {
            this.hierarchyResponsePromise.resolve(data.response.hierarchy)
          } else {
            this.hierarchyResponsePromise.reject(
              new Error(data.response.error || 'Failed to get view hierarchy')
            )
          }
          this.hierarchyResponsePromise = null
        }
      })
    }
  }

  /**
   * Setup listener for action execution results from SDK
   */
  private setupActionResponseListener() {
    if (window.electronAPI?.onSDKActionResult) {
      window.electronAPI.onSDKActionResult((data) => {
        // Only handle responses for this device
        if (data.deviceId !== this.deviceId) return

        console.log(`🎬 [MOBILE TEXT TO FLOW] Received action result for: ${data.result.actionId}`)

        const promise = this.actionResponsePromises.get(data.result.actionId)
        if (promise) {
          if (data.result.success) {
            promise.resolve()
          } else {
            promise.reject(new Error(data.result.error || 'Action execution failed'))
          }
          this.actionResponsePromises.delete(data.result.actionId)
        }
      })
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: MobileTextToFlowEventListener) {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: MobileTextToFlowEventListener) {
    this.eventListeners = this.eventListeners.filter((l) => l !== listener)
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: MobileTextToFlowEvent) {
    this.eventListeners.forEach((listener) => listener(event))
  }

  /**
   * Execute mobile text-to-flow simulation
   * This will execute each step by:
   * 1. Getting view hierarchy from SDK
   * 2. Asking AI to find element and determine action
   * 3. Executing action via SDK
   * 4. Waiting for response
   * 5. Repeating for next step
   */
  async executeSteps(steps: Step[]): Promise<Step[]> {
    console.log('📱 [MOBILE TEXT TO FLOW] Starting step execution...')
    console.log(`📱 [MOBILE TEXT TO FLOW] Device ID: ${this.deviceId}`)
    console.log(`📱 [MOBILE TEXT TO FLOW] Steps to execute: ${steps.length}`)

    this.isExecuting = true
    this.currentStepIndex = 0
    const enrichedSteps: Step[] = []

    this.emitEvent({ type: 'started', timestamp: Date.now() })

    try {
      // Execute each step
      for (let i = 0; i < steps.length; i++) {
        if (!this.isExecuting) {
          console.log('⏹️ [MOBILE TEXT TO FLOW] Execution stopped')
          break
        }

        const step = steps[i]
        this.currentStepIndex = i

        console.log(`\n🎯 [MOBILE TEXT TO FLOW] Executing step ${i + 1}/${steps.length}`)
        console.log(`   Step name: ${step.name}`)

        this.emitEvent({
          type: 'executing_step',
          data: { step, index: i, total: steps.length },
          timestamp: Date.now()
        })

        try {
          const enrichedStep = await this.executeSingleStep(step)
          enrichedSteps.push(enrichedStep)

          this.emitEvent({
            type: 'step_completed',
            data: { step: enrichedStep, index: i },
            timestamp: Date.now()
          })

          console.log(`✅ [MOBILE TEXT TO FLOW] Step ${i + 1} completed`)

          // Wait between steps
          await this.wait(2000)
        } catch (stepError: any) {
          console.error(`❌ [MOBILE TEXT TO FLOW] Step ${i + 1} failed:`, stepError)

          this.emitEvent({
            type: 'step_failed',
            data: { step, index: i, error: stepError.message },
            timestamp: Date.now()
          })

          // Add failed step as-is
          enrichedSteps.push(step)
        }
      }

      this.isExecuting = false
      this.emitEvent({
        type: 'completed',
        data: { steps: enrichedSteps },
        timestamp: Date.now()
      })

      console.log('🎉 [MOBILE TEXT TO FLOW] Flow execution completed!')
      return enrichedSteps
    } catch (error: any) {
      console.error('❌ [MOBILE TEXT TO FLOW] Error:', error)
      this.isExecuting = false
      this.emitEvent({ type: 'error', data: error.message, timestamp: Date.now() })
      throw error
    }
  }

  /**
   * Execute a single step
   */
  private async executeSingleStep(step: Step): Promise<Step> {
    // Step 1: Get current view hierarchy from SDK
    this.emitEvent({
      type: 'getting_hierarchy',
      data: { deviceId: this.deviceId },
      timestamp: Date.now()
    })

    console.log('   Requesting view hierarchy from SDK...')
    const viewHierarchy = await this.getViewHierarchy()

    this.emitEvent({
      type: 'hierarchy_received',
      data: { hierarchyLength: viewHierarchy.length },
      timestamp: Date.now()
    })

    console.log(`   Received view hierarchy (${viewHierarchy.length} characters)`)

    // Step 2: For each action in the step, ask AI to find element
    const enrichedActions = []

    for (let actionIndex = 0; actionIndex < step.actions.length; actionIndex++) {
      const action = step.actions[actionIndex]
      console.log(`   Processing action ${actionIndex + 1}/${step.actions.length}: ${action.type}`)

      // Build step description with context
      let stepDescription = action.type
      if (action.value) {
        stepDescription += ` with value "${action.value}"`
      }
      if (action.context) {
        stepDescription += ` on element: ${action.context}`
      }

      // Ask AI to find element and determine execution details
      const execution = await aiDecisionService.executeMobileTextFlowStep(
        stepDescription,
        viewHierarchy,
        step.name
      )

      console.log('   AI decision:', {
        action: execution.action,
        elementXPath: execution.elementXPath,
        reasoning: execution.reasoning,
        success: execution.success
      })

      if (!execution.success) {
        throw new Error(`Failed to find element for action: ${execution.reasoning}`)
      }

      // Create enriched action with XPath
      const enrichedAction = {
        ...action,
        selector: execution.elementXPath || action.selector,
        value: execution.inputValue || action.value
      }

      enrichedActions.push(enrichedAction)

      // Step 3: Execute the action via SDK
      if (execution.elementXPath) {
        await this.executeAction(execution.action, execution.elementXPath, execution.inputValue)

        // Wait for UI to update after each action
        await this.wait(1500)

        // Get new hierarchy after action (for next action in same step)
        if (actionIndex < step.actions.length - 1) {
          console.log('   Refreshing view hierarchy for next action...')
          // View hierarchy will be re-fetched at start of next loop
        }
      }
    }

    // Return enriched step with XPaths
    return {
      ...step,
      actions: enrichedActions
    }
  }

  /**
   * Get view hierarchy from SDK-connected device
   */
  private async getViewHierarchy(): Promise<string> {
    try {
      console.log('📤 [MOBILE TEXT TO FLOW] Sending getViewHierarchy command to SDK...')

      // Create promise that will be resolved when response arrives
      const responsePromise = new Promise<string>((resolve, reject) => {
        this.hierarchyResponsePromise = { resolve, reject }

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.hierarchyResponsePromise) {
            this.hierarchyResponsePromise = null
            reject(new Error('View hierarchy request timed out after 10 seconds'))
          }
        }, 10000)
      })

      // Send command to SDK (must match SDKCommand structure from SDK)
      const sendResult = await (window as any).electronAPI.sendToMobileDevice(this.deviceId, {
        type: 'getViewHierarchy',
        timestamp: Date.now() / 1000 // SDK expects TimeInterval (seconds since epoch)
        // Omit payload field entirely for commands that don't need it
      })

      if (!sendResult.success) {
        this.hierarchyResponsePromise = null
        throw new Error(sendResult.error || 'Failed to send getViewHierarchy command')
      }

      console.log('📤 [MOBILE TEXT TO FLOW] Command sent, waiting for response...')

      // Wait for response from SDK
      const hierarchy = await responsePromise
      return hierarchy
    } catch (error) {
      console.error('Failed to get view hierarchy:', error)
      throw new Error(`Failed to get view hierarchy: ${error}`)
    }
  }

  /**
   * Execute action on mobile device via SDK
   */
  private async executeAction(
    action: 'tap' | 'type' | 'swipe' | 'wait',
    xpath: string,
    value?: string
  ): Promise<void> {
    console.log(`   Executing ${action} on element: ${xpath}${value ? ` with value: "${value}"` : ''}`)

    if (action === 'wait') {
      await this.wait(2000)
      return
    }

    try {
      // Create unique action ID
      const actionId = `textflow_${this.deviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Build command matching SDKCommand structure
      const command: any = {
        type: 'executeAction',
        timestamp: Date.now() / 1000, // TimeInterval (seconds since epoch)
        payload: {
          actionId: actionId,
          actionType: action,  // "tap", "type", "swipe"
          selector: xpath,     // accessibility ID (not XPath!)
          value: value || null,
          swipeDirection: null
        }
      }

      console.log(`   📤 Sending SDK command:`, command)

      // Create promise that will be resolved when action result arrives
      const resultPromise = new Promise<void>((resolve, reject) => {
        this.actionResponsePromises.set(actionId, { resolve, reject })

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.actionResponsePromises.has(actionId)) {
            this.actionResponsePromises.delete(actionId)
            reject(new Error(`Action execution timed out after 10 seconds (${action} on ${xpath})`))
          }
        }, 10000)
      })

      // Send command to SDK
      const sendResult = await (window as any).electronAPI.sendToMobileDevice(
        this.deviceId,
        command
      )

      if (!sendResult.success) {
        this.actionResponsePromises.delete(actionId)
        throw new Error(sendResult.error || `Failed to send ${action} command`)
      }

      console.log(`   📤 Command sent, waiting for execution result...`)

      // Wait for action to complete on device
      await resultPromise

      console.log(`   ✅ ${action} executed successfully on device`)
    } catch (error) {
      console.error(`Failed to execute ${action}:`, error)
      throw new Error(`Failed to execute ${action}: ${error}`)
    }
  }

  /**
   * Wait for specified duration
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Stop execution
   */
  stop() {
    console.log('⏹️ [MOBILE TEXT TO FLOW] Stopping execution...')
    this.isExecuting = false
  }

  /**
   * Check if currently executing
   */
  isRunning(): boolean {
    return this.isExecuting
  }

  /**
   * Get current step index
   */
  getCurrentStepIndex(): number {
    return this.currentStepIndex
  }
}
