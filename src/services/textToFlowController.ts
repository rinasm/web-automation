import { aiDecisionService } from './aiDecisionService'
import { FlowExtractor } from '../utils/flowExtractor'
import { ExploredJourney, JourneyStep, PageContext } from '../types/journey'

export type TextToFlowEventType =
  | 'started'
  | 'parsing_flow'
  | 'parsed_flow'
  | 'executing_step'
  | 'step_completed'
  | 'step_failed'
  | 'completed'
  | 'error'

export interface TextToFlowEvent {
  type: TextToFlowEventType
  data?: any
  timestamp: number
}

export type TextToFlowEventListener = (event: TextToFlowEvent) => void

interface ParsedStep {
  description: string
  order: number
}

/**
 * Controller for Text to Flow feature
 * Parses user's natural language flow description and executes it step by step
 */
export class TextToFlowController {
  private webview: any
  private flowExtractor: FlowExtractor
  private eventListeners: TextToFlowEventListener[] = []
  private isExecuting: boolean = false
  private parsedSteps: ParsedStep[] = []
  private executedSteps: JourneyStep[] = []
  private currentStepIndex: number = 0

  constructor(webview: any) {
    this.webview = webview
    this.flowExtractor = new FlowExtractor(webview)
  }

  /**
   * Start text to flow execution
   */
  async executeFlow(flowDescription: string): Promise<ExploredJourney | null> {
    console.log('🚀 [TEXT TO FLOW] Starting flow execution...')
    console.log('📝 [TEXT TO FLOW] Flow description:', flowDescription)

    this.isExecuting = true
    this.parsedSteps = []
    this.executedSteps = []
    this.currentStepIndex = 0

    this.emitEvent({ type: 'started', timestamp: Date.now() })

    try {
      // Step 1: Parse the flow description into steps
      this.emitEvent({
        type: 'parsing_flow',
        data: { description: flowDescription },
        timestamp: Date.now()
      })

      const currentUrl = await this.getCurrentUrl()
      const parseResult = await aiDecisionService.parseTextToFlowSteps(
        flowDescription,
        currentUrl
      )

      this.parsedSteps = parseResult.steps.sort((a, b) => a.order - b.order)
      console.log('✅ [TEXT TO FLOW] Parsed steps:', this.parsedSteps)

      this.emitEvent({
        type: 'parsed_flow',
        data: { steps: this.parsedSteps },
        timestamp: Date.now()
      })

      // Step 2: Execute each step
      for (let i = 0; i < this.parsedSteps.length; i++) {
        if (!this.isExecuting) {
          console.log('⏹️ [TEXT TO FLOW] Execution stopped')
          break
        }

        const step = this.parsedSteps[i]
        this.currentStepIndex = i

        console.log(`\n🎯 [TEXT TO FLOW] Executing step ${i + 1}/${this.parsedSteps.length}`)
        console.log(`   Description: ${step.description}`)

        this.emitEvent({
          type: 'executing_step',
          data: { step, index: i, total: this.parsedSteps.length },
          timestamp: Date.now()
        })

        try {
          const journeyStep = await this.executeSingleStep(step)
          this.executedSteps.push(journeyStep)

          this.emitEvent({
            type: 'step_completed',
            data: { step, index: i },
            timestamp: Date.now()
          })

          console.log(`✅ [TEXT TO FLOW] Step ${i + 1} completed`)

          // Wait between steps
          await this.wait(2000)
        } catch (stepError: any) {
          console.error(`❌ [TEXT TO FLOW] Step ${i + 1} failed:`, stepError)

          this.emitEvent({
            type: 'step_failed',
            data: { step, index: i, error: stepError.message },
            timestamp: Date.now()
          })

          // Continue with next step even if this one fails
        }
      }

      // Step 3: Create journey from executed steps
      const journey: ExploredJourney = {
        id: crypto.randomUUID(),
        name: `Text to Flow: ${flowDescription.substring(0, 50)}${
          flowDescription.length > 50 ? '...' : ''
        }`,
        path: [], // Not using tree structure for text to flow
        confidence: 100, // User-defined flow has 100% confidence
        completionReason: 'User-defined flow completed successfully',
        steps: this.executedSteps,
        createdAt: Date.now(),
        status: 'pending'
      }

      this.isExecuting = false
      this.emitEvent({
        type: 'completed',
        data: { journey },
        timestamp: Date.now()
      })

      console.log('🎉 [TEXT TO FLOW] Flow execution completed!')
      return journey
    } catch (error: any) {
      console.error('❌ [TEXT TO FLOW] Error:', error)
      this.isExecuting = false
      this.emitEvent({ type: 'error', data: error.message, timestamp: Date.now() })
      throw error
    }
  }

  /**
   * Execute a single step
   */
  private async executeSingleStep(step: ParsedStep): Promise<JourneyStep> {
    // Get current page context
    const pageContext = await this.capturePageContext()

    // Extract available elements
    const availableElements = await this.flowExtractor.extractInteractableElements()
    console.log(`   Found ${availableElements.length} interactable elements`)

    // Ask AI to execute this step
    const execution = await aiDecisionService.executeTextFlowStep(
      step.description,
      pageContext.url,
      pageContext.title,
      pageContext.visibleText,
      availableElements
    )

    console.log('   AI decision:', {
      action: execution.action,
      reasoning: execution.reasoning,
      success: execution.success
    })

    if (!execution.success) {
      throw new Error(`Failed to execute step: ${execution.reasoning}`)
    }

    // Execute the action
    switch (execution.action) {
      case 'click':
        if (!execution.elementSelector) {
          throw new Error('No element selector provided for click action')
        }
        await this.clickElement(execution.elementSelector)
        await this.waitForPageLoad()

        // Find the element for journey step
        const clickedElement = availableElements.find(
          (el) => el.selector === execution.elementSelector
        )
        if (!clickedElement) {
          throw new Error('Element not found after click')
        }

        return {
          type: 'click',
          element: clickedElement,
          description: step.description,
          requiresData: false,
          order: step.order
        }

      case 'type':
        if (!execution.elementSelector) {
          throw new Error('No element selector provided for type action')
        }
        if (!execution.inputValue) {
          throw new Error('No input value provided for type action')
        }

        await this.typeInElement(execution.elementSelector, execution.inputValue)
        await this.wait(500)

        const typedElement = availableElements.find(
          (el) => el.selector === execution.elementSelector
        )
        if (!typedElement) {
          throw new Error('Element not found after type')
        }

        return {
          type: 'fill',
          element: typedElement,
          description: step.description,
          requiresData: true,
          dataType: 'text',
          order: step.order
        }

      case 'wait':
        await this.wait(2000)
        return {
          type: 'click', // Generic type for wait
          element: availableElements[0] || ({} as any),
          description: step.description,
          requiresData: false,
          order: step.order
        }

      case 'navigate':
        // Navigation handled by previous actions
        return {
          type: 'navigate',
          element: availableElements[0] || ({} as any),
          description: step.description,
          requiresData: false,
          order: step.order
        }

      case 'complete':
        throw new Error('Step marked as complete by AI - element not found')

      default:
        throw new Error(`Unknown action type: ${execution.action}`)
    }
  }

  /**
   * Click an element
   */
  private async clickElement(selector: string): Promise<void> {
    const script = `
      (function() {
        try {
          const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = result.singleNodeValue;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => el.click(), 100);
            console.log('✅ Clicked element');
          } else {
            throw new Error('Element not found');
          }
        } catch (e) {
          console.error('❌ Click error:', e);
          throw e;
        }
      })();
    `

    await this.webview.executeJavaScript(script)
  }

  /**
   * Type in an element
   */
  private async typeInElement(selector: string, value: string): Promise<void> {
    const script = `
      (function() {
        try {
          const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = result.singleNodeValue;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
            el.value = '${value.replace(/'/g, "\\'")}';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Typed text');
          } else {
            throw new Error('Element not found');
          }
        } catch (e) {
          console.error('❌ Type error:', e);
          throw e;
        }
      })();
    `

    await this.webview.executeJavaScript(script)
  }

  /**
   * Wait for page to load
   */
  private async waitForPageLoad(): Promise<void> {
    await this.wait(2000)

    const checkReady = `
      (function() {
        return document.readyState === 'complete';
      })();
    `

    let attempts = 0
    while (attempts < 10) {
      const ready = await this.webview.executeJavaScript(checkReady)
      if (ready) break
      await this.wait(500)
      attempts++
    }
  }

  /**
   * Wait utility
   */
  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get current URL
   */
  private async getCurrentUrl(): Promise<string> {
    const script = `
      (function() {
        return window.location.href;
      })();
    `
    return await this.webview.executeJavaScript(script)
  }

  /**
   * Capture current page context
   */
  private async capturePageContext(): Promise<PageContext> {
    const script = `
      (function() {
        return {
          url: window.location.href,
          title: document.title,
          mainHeading: document.querySelector('h1')?.textContent?.trim() || null,
          visibleText: document.body.innerText
        };
      })();
    `

    const context = await this.webview.executeJavaScript(script)

    const summarizedText = aiDecisionService.summarizePageText(context.visibleText, 500)

    return {
      url: context.url,
      title: context.title,
      mainHeading: context.mainHeading,
      visibleText: summarizedText,
      timestamp: Date.now()
    }
  }

  /**
   * Stop execution
   */
  stop(): void {
    this.isExecuting = false
    console.log('⏹️ [TEXT TO FLOW] Stopping execution...')
  }

  /**
   * Get parsed steps
   */
  getParsedSteps(): ParsedStep[] {
    return this.parsedSteps
  }

  /**
   * Get executed steps
   */
  getExecutedSteps(): JourneyStep[] {
    return this.executedSteps
  }

  /**
   * Get current step index
   */
  getCurrentStepIndex(): number {
    return this.currentStepIndex
  }

  /**
   * Register event listener
   */
  on(listener: TextToFlowEventListener): void {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  off(listener: TextToFlowEventListener): void {
    this.eventListeners = this.eventListeners.filter((l) => l !== listener)
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: TextToFlowEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in event listener:', error)
      }
    })
  }
}
