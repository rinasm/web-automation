/**
 * Simulation Service
 *
 * Orchestrates real-time execution of test steps with visual feedback
 * Supports both web and mobile platforms
 */

import { Step, Action } from '../store/stepStore'
import { PlatformType } from '../types/feature'
import { useStepStore } from '../store/stepStore'

export interface SimulationProgress {
  currentStepIndex: number
  currentActionIndex: number
  currentStep?: Step
  currentAction?: Action
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  message: string
  waitingForPageLoad?: boolean
  selfHealing?: boolean
}

export interface SimulationResult {
  success: boolean
  stepsExecuted: number
  errors: SimulationError[]
  duration: number
}

export interface SimulationError {
  stepIndex: number
  actionIndex: number
  step: Step
  action: Action
  error: string
}

type ProgressCallback = (progress: SimulationProgress) => void

class SimulationService {
  private isPaused = false
  private isStopped = false
  private progressCallback?: ProgressCallback
  private currentProgress: Partial<SimulationProgress> = {}

  /**
   * Simulate execution of steps
   */
  async simulateSteps(
    steps: Step[],
    platform: PlatformType,
    onProgress?: ProgressCallback
  ): Promise<SimulationResult> {
    this.progressCallback = onProgress
    this.isPaused = false
    this.isStopped = false
    this.currentProgress = {}

    // Set up self-healing status callback
    useStepStore.getState().setSelfHealingStatusCallback((isSelfHealing: boolean) => {
      // Update current progress with self-healing status
      this.updateProgress({
        ...this.currentProgress,
        selfHealing: isSelfHealing
      })
    })

    const startTime = Date.now()
    const errors: SimulationError[] = []
    let stepsExecuted = 0

    try {
      for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
        if (this.isStopped) break

        const step = steps[stepIndex]

        // Wait if paused
        await this.waitWhilePaused()

        // Update progress - starting step
        this.updateProgress({
          currentStepIndex: stepIndex,
          currentActionIndex: 0,
          currentStep: step,
          status: 'running',
          message: `Executing step: ${step.name}`
        })

        // Execute each action in the step
        for (let actionIndex = 0; actionIndex < step.actions.length; actionIndex++) {
          if (this.isStopped) break

          await this.waitWhilePaused()

          const action = step.actions[actionIndex]

          // Update progress - executing action
          this.updateProgress({
            currentStepIndex: stepIndex,
            currentActionIndex: actionIndex,
            currentStep: step,
            currentAction: action,
            status: 'running',
            message: `${action.type} ${action.selector || ''}`
          })

          // Execute action
          try {
            await this.executeAction(action, platform, step.name)

            // Wait for page to stabilize and load
            this.updateProgress({
              currentStepIndex: stepIndex,
              currentActionIndex: actionIndex,
              currentStep: step,
              currentAction: action,
              status: 'running',
              message: `${action.type} ${action.selector || ''}`,
              waitingForPageLoad: true
            })

            await this.waitForPageLoad(platform)

            this.updateProgress({
              currentStepIndex: stepIndex,
              currentActionIndex: actionIndex,
              currentStep: step,
              currentAction: action,
              status: 'running',
              message: `${action.type} ${action.selector || ''}`,
              waitingForPageLoad: false
            })

            await this.delay(500) // Visual delay between actions
          } catch (error) {
            errors.push({
              stepIndex,
              actionIndex,
              step,
              action,
              error: error instanceof Error ? error.message : 'Unknown error'
            })

            // Log warning but continue execution
            console.warn(`⚠️ [SimulationService] Action failed but continuing: ${action.type} ${action.selector || ''}`)
            console.warn(`⚠️ [SimulationService] Error: ${error instanceof Error ? error.message : 'Unknown error'}`)

            // Update progress - warning occurred
            this.updateProgress({
              currentStepIndex: stepIndex,
              currentActionIndex: actionIndex,
              currentStep: step,
              currentAction: action,
              status: 'running',
              message: `⚠️ Failed: ${action.type} ${action.selector || ''} - continuing...`
            })

            // DO NOT pause or break - continue with next action
            await this.delay(500) // Visual delay before next action
          }
        }

        if (!this.isStopped && !this.isPaused) {
          stepsExecuted++
        }
      }

      // Final status
      const finalStatus = this.isStopped ? 'idle' : errors.length > 0 ? 'error' : 'completed'
      this.updateProgress({
        currentStepIndex: steps.length - 1,
        currentActionIndex: 0,
        status: finalStatus,
        message: finalStatus === 'completed' ? 'Simulation completed successfully' : 'Simulation stopped'
      })

      // Clean up self-healing callback
      useStepStore.getState().setSelfHealingStatusCallback(null)

      return {
        success: errors.length === 0 && !this.isStopped,
        stepsExecuted,
        errors,
        duration: Date.now() - startTime
      }
    } catch (error) {
      console.error('Simulation failed:', error)
      this.updateProgress({
        currentStepIndex: 0,
        currentActionIndex: 0,
        status: 'error',
        message: 'Simulation failed'
      })

      // Clean up self-healing callback
      useStepStore.getState().setSelfHealingStatusCallback(null)

      return {
        success: false,
        stepsExecuted,
        errors,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: Action, platform: PlatformType, stepName?: string): Promise<void> {
    // Platform-specific execution
    if (platform === 'web') {
      await this.executeWebAction(action, stepName)
    } else {
      await this.executeMobileAction(action)
    }
  }

  /**
   * Execute web action
   */
  private async executeWebAction(action: Action, stepName?: string): Promise<void> {
    // Get the execute callback from the store
    const executeCallback = useStepStore.getState().executeStepCallback

    if (!executeCallback) {
      throw new Error('WebView not ready. Please ensure the WebView is loaded before simulating.')
    }

    // Execute the action through the WebView callback with step name for self-healing
    await executeCallback([action], stepName)
  }

  /**
   * Execute mobile action
   */
  private async executeMobileAction(action: Action): Promise<void> {
    // Get the execute callback from the store
    const executeCallback = useStepStore.getState().executeStepCallback

    if (!executeCallback) {
      throw new Error('Mobile WebView not ready. Please ensure the Mobile WebView is loaded before simulating.')
    }

    // Execute the action through the MobileWebView callback
    await executeCallback([action])
  }

  /**
   * Wait for page to finish loading
   */
  private async waitForPageLoad(platform: PlatformType): Promise<void> {
    // Initial stabilization wait
    await this.delay(1000)

    // For web platform, check document.readyState via the webview
    if (platform === 'web') {
      try {
        // We need to access the webview through a different mechanism
        // For now, just do a fixed wait - the WebView's executeActions already handles page load waiting
        // This is just an additional safety margin
        await this.delay(500)
      } catch (error) {
        console.warn('⚠️ Could not check page load state, using fixed delay')
        await this.delay(1000)
      }
    } else {
      // For mobile, just wait a bit longer
      await this.delay(1500)
    }
  }

  /**
   * Pause simulation
   */
  pause(): void {
    this.isPaused = true
    this.updateProgress({
      currentStepIndex: 0,
      currentActionIndex: 0,
      status: 'paused',
      message: 'Simulation paused'
    })
  }

  /**
   * Resume simulation
   */
  resume(): void {
    this.isPaused = false
    this.updateProgress({
      currentStepIndex: 0,
      currentActionIndex: 0,
      status: 'running',
      message: 'Resuming simulation...'
    })
  }

  /**
   * Stop simulation
   */
  stop(): void {
    this.isStopped = true
    this.isPaused = false
    this.updateProgress({
      currentStepIndex: 0,
      currentActionIndex: 0,
      status: 'idle',
      message: 'Simulation stopped'
    })
  }

  /**
   * Wait while paused
   */
  private async waitWhilePaused(): Promise<void> {
    while (this.isPaused && !this.isStopped) {
      await this.delay(100)
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update progress
   */
  private updateProgress(progress: Partial<SimulationProgress>): void {
    // Store current progress for self-healing updates
    this.currentProgress = { ...this.currentProgress, ...progress }

    if (this.progressCallback) {
      this.progressCallback(this.currentProgress as SimulationProgress)
    }
  }

  /**
   * Check if simulation is running
   */
  isRunning(): boolean {
    return !this.isStopped && !this.isPaused
  }

  /**
   * Check if simulation is paused
   */
  isPausedState(): boolean {
    return this.isPaused
  }
}

export const simulationService = new SimulationService()
