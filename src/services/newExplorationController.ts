import { aiDecisionService } from './aiDecisionService'
import { FlowExtractor, InteractableElement } from '../utils/flowExtractor'
import {
  ExplorationConfig,
  ExploredJourney,
  JourneyStep,
  MeaningfulElement,
  PageContext
} from '../types/journey'
import { useAIJourneysStore } from '../store/aiJourneysStore'

export type ExplorationEventType =
  | 'started'
  | 'page_scanned'
  | 'journey_found'
  | 'completed'
  | 'paused'
  | 'error'

export interface ExplorationEvent {
  type: ExplorationEventType
  data?: any
  timestamp: number
}

export type ExplorationEventListener = (event: ExplorationEvent) => void

/**
 * Re-engineered exploration controller with intelligent caching and 3-phase process
 */
export class NewExplorationController {
  private webview: any
  private flowExtractor: FlowExtractor
  private config: ExplorationConfig
  private eventListeners: ExplorationEventListener[] = []
  private isExploring: boolean = false
  private isPaused: boolean = false
  private currentJourney: MeaningfulElement[] = []
  private journeysFound: ExploredJourney[] = []

  constructor(webview: any, config?: Partial<ExplorationConfig>) {
    this.webview = webview
    this.flowExtractor = new FlowExtractor(webview)

    this.config = {
      maxDepth: config?.maxDepth || 10,
      waitTimeBetweenActions: config?.waitTimeBetweenActions || 2000,
      ignoreElements: config?.ignoreElements || [],
      autoSaveJourneys: config?.autoSaveJourneys || false,
      explorationStrategy: config?.explorationStrategy || 'ai-guided'
    }
  }

  /**
   * Start intelligent exploration
   */
  async startExploration(): Promise<void> {
    console.log('🚀 [NEW EXPLORATION] Starting intelligent exploration...')

    this.isExploring = true
    this.isPaused = false
    this.currentJourney = []
    this.emitEvent({ type: 'started', timestamp: Date.now() })

    try {
      const store = useAIJourneysStore.getState()

      // Get initial page context
      const initialContext = await this.capturePageContext()
      const initialKey = store.generateKey(initialContext.url, undefined)

      console.log('📍 [NEW EXPLORATION] Starting at:', initialKey)

      // Explore from the root
      await this.exploreFromNode(initialKey, null)

      this.isExploring = false
      this.emitEvent({ type: 'completed', timestamp: Date.now() })
      console.log('🎉 [NEW EXPLORATION] Exploration completed!', {
        journeysFound: this.journeysFound.length
      })
    } catch (error: any) {
      console.error('❌ [NEW EXPLORATION] Error:', error)
      this.isExploring = false
      this.emitEvent({ type: 'error', data: error.message, timestamp: Date.now() })
      throw error
    }
  }

  /**
   * Core exploration logic - recursively explore nodes
   */
  private async exploreFromNode(
    currentKey: string,
    previousAction: string | null
  ): Promise<void> {
    if (this.isPaused) {
      console.log('⏸️ [NEW EXPLORATION] Paused')
      return
    }

    if (this.currentJourney.length >= this.config.maxDepth) {
      console.log('🛑 [NEW EXPLORATION] Max depth reached')
      return
    }

    console.log(`\n📍 [NEW EXPLORATION] Exploring node: ${currentKey}`)
    console.log(`   Current journey depth: ${this.currentJourney.length}`)

    const store = useAIJourneysStore.getState()

    // PHASE 1: Check if page has been scanned
    let node = store.getNode(currentKey)

    if (!node) {
      console.log('🔍 [PHASE 1] Page not scanned yet, scanning...')
      node = await this.scanAndStoreNode(currentKey, previousAction)
    } else {
      console.log('✅ [PHASE 1] Page already scanned, using cached data')
    }

    // PHASE 3: Decide next action
    console.log('🤖 [PHASE 3] Deciding next action...')
    const decision = await aiDecisionService.decideNextActionFromMeaningful(
      node.meaningfulElements,
      node.pageContext,
      this.currentJourney,
      node.url
    )

    console.log('🤖 [PHASE 3] Decision:', {
      action: decision.action,
      isComplete: decision.isComplete,
      reasoning: decision.reasoning
    })

    // Handle completion
    if (decision.isComplete) {
      console.log('✅ [JOURNEY COMPLETE]')
      await this.handleJourneyCompletion(decision)

      // Continue exploring other paths by backtracking
      console.log('🔄 [EXPLORATION] Backtracking to explore other paths...')
      return
    }

    // Handle click action
    if (decision.action === 'click' && decision.elementSelector) {
      const element = node.meaningfulElements.find(el => el.selector === decision.elementSelector)

      if (!element) {
        console.warn('⚠️ [NEW EXPLORATION] Element not found')
        return
      }

      // Mark element as visited
      store.markElementVisited(currentKey, element.selector)

      // Add to current journey
      this.currentJourney.push(element)

      // Execute click
      console.log(`👆 [ACTION] Clicking: ${element.label}`)
      await this.clickElement(element.selector)
      await this.waitForPageLoad()

      // Get new page context
      const newContext = await this.capturePageContext()
      const newKey = store.generateKey(newContext.url, element.label)

      console.log('📍 [NEW PAGE] Navigated to:', newKey)

      // Add child relationship
      store.addChildToNode(currentKey, newKey)

      // Recursively explore the new page
      await this.exploreFromNode(newKey, element.label)

      // Backtrack: remove from journey
      this.currentJourney.pop()
      console.log('⬅️ [BACKTRACK] Returned to:', currentKey)

      // Navigate back
      await this.navigateBack()
      await this.waitForPageLoad()

      // Continue exploring other unvisited elements from this node
      await this.exploreFromNode(currentKey, previousAction)
    }
  }

  /**
   * PHASE 1 & 2: Scan page and store in AIJourneys map
   */
  private async scanAndStoreNode(
    key: string,
    previousAction: string | null
  ): Promise<any> {
    console.log('🔍 [PHASE 1] Extracting interactable elements...')

    // Phase 1: Extract all interactable elements
    const allElements = await this.flowExtractor.extractInteractableElements()
    console.log(`✅ [PHASE 1] Found ${allElements.length} interactable elements`)

    // Get page context
    const pageContext = await this.capturePageContext()

    // Phase 2: Filter meaningful elements using AI
    console.log('🤖 [PHASE 2] Filtering meaningful elements with AI...')
    const { meaningfulElements, pageContext: aiPageContext } =
      await aiDecisionService.filterMeaningfulElements(
        pageContext.url,
        pageContext.title,
        pageContext.visibleText,
        allElements
      )

    console.log(`✅ [PHASE 2] Filtered to ${meaningfulElements.length} meaningful elements`)

    // Store in AIJourneys map
    const store = useAIJourneysStore.getState()
    const node = {
      parent: previousAction,
      meaningfulElements,
      interactableElements: allElements,
      pageContext: aiPageContext,
      children: [],
      url: pageContext.url,
      timestamp: Date.now(),
      scannedAt: Date.now()
    }

    store.addNode(key, node)

    this.emitEvent({
      type: 'page_scanned',
      data: { key, meaningfulCount: meaningfulElements.length },
      timestamp: Date.now()
    })

    return node
  }

  /**
   * Handle journey completion
   */
  private async handleJourneyCompletion(decision: any): Promise<void> {
    console.log('🎯 [JOURNEY] Handling completion...')

    const journeyName = decision.journeyName ||
      `Journey: ${this.currentJourney.map(el => el.label).join(' → ')}`

    // Convert to ExploredJourney format
    const steps: JourneyStep[] = this.currentJourney.map((el, index) => ({
      type: 'click',
      element: {
        selector: el.selector,
        tagName: el.type,
        text: el.text || el.label,
        ariaLabel: el.ariaLabel,
        href: el.href
      } as any,
      description: el.label,
      requiresData: false,
      order: index + 1
    }))

    const exploredJourney: ExploredJourney = {
      id: crypto.randomUUID(),
      name: journeyName,
      path: [], // We don't use the old tree structure anymore
      confidence: decision.confidence,
      completionReason: decision.completionReason || decision.reasoning,
      steps,
      createdAt: Date.now(),
      status: 'pending'
    }

    this.journeysFound.push(exploredJourney)

    this.emitEvent({
      type: 'journey_found',
      data: exploredJourney,
      timestamp: Date.now()
    })

    console.log('✅ [JOURNEY] Journey saved:', journeyName)
  }

  /**
   * Click an element in the webview
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
   * Navigate back in browser
   */
  private async navigateBack(): Promise<void> {
    await this.webview.goBack()
  }

  /**
   * Wait for page to load and stabilize
   */
  private async waitForPageLoad(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.config.waitTimeBetweenActions))

    const checkReady = `
      (function() {
        return document.readyState === 'complete';
      })();
    `

    let attempts = 0
    while (attempts < 10) {
      const ready = await this.webview.executeJavaScript(checkReady)
      if (ready) break
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
    }
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
   * Pause exploration
   */
  pause(): void {
    this.isPaused = true
    this.emitEvent({ type: 'paused', timestamp: Date.now() })
  }

  /**
   * Resume exploration
   */
  resume(): void {
    this.isPaused = false
  }

  /**
   * Get discovered journeys
   */
  getJourneys(): ExploredJourney[] {
    return this.journeysFound
  }

  /**
   * Register event listener
   */
  on(listener: ExplorationEventListener): void {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  off(listener: ExplorationEventListener): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener)
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: ExplorationEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in event listener:', error)
      }
    })
  }
}
