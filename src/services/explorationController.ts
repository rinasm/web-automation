import { aiDecisionService } from './aiDecisionService'
import { FlowExtractor, InteractableElement } from '../utils/flowExtractor'
import {
  ExplorationState,
  ExplorationConfig,
  JourneyTreeNode,
  PageContext,
  ExploredJourney,
  JourneyStep
} from '../types/journey'

export type ExplorationEventType =
  | 'started'
  | 'node_explored'
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
 * Core exploration controller that orchestrates intelligent journey discovery
 */
export class ExplorationController {
  private webview: any
  private flowExtractor: FlowExtractor
  private state: ExplorationState
  private config: ExplorationConfig
  private eventListeners: ExplorationEventListener[] = []
  private visitedSelectors: Set<string> = new Set()

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

    this.state = {
      currentNode: null,
      visitedPaths: new Set(),
      depth: 0,
      maxDepth: this.config.maxDepth,
      journeysFound: [],
      isExploring: false,
      isPaused: false,
      error: null
    }
  }

  /**
   * Start the exploration from the current page
   */
  async startExploration(): Promise<void> {
    console.log('🚀 [EXPLORATION] Starting intelligent exploration...')

    this.state.isExploring = true
    this.state.error = null
    this.state.journeysFound = [] // Clear journeys from previous exploration
    this.state.visitedPaths.clear() // Clear visited paths
    this.visitedSelectors.clear()

    this.emitEvent({ type: 'started', timestamp: Date.now() })

    try {
      // Capture initial page state
      const initialContext = await this.capturePageContext()

      // Create root node
      const rootNode: JourneyTreeNode = {
        id: crypto.randomUUID(),
        type: 'root',
        label: `Start: ${initialContext.title}`,
        pageContext: initialContext,
        parent: null,
        children: [],
        depth: 0,
        timestamp: Date.now()
      }

      this.state.currentNode = rootNode
      console.log('✅ [EXPLORATION] Root node created:', rootNode.label)

      // Start exploring - keep exploring from root until all paths exhausted
      let explorationRound = 1
      while (!this.state.isPaused) {
        console.log(`\n🔄 [EXPLORATION] Starting exploration round ${explorationRound}...`)

        // Get available unvisited elements from root
        const rootElements = await this.flowExtractor.extractInteractableElements()
        const unvisitedFromRoot = rootElements.filter(el => !this.visitedSelectors.has(el.selector))

        if (unvisitedFromRoot.length === 0) {
          console.log('✅ [EXPLORATION] All paths from root have been explored')
          break
        }

        console.log(`📍 [EXPLORATION] ${unvisitedFromRoot.length} unvisited paths from root`)

        // Explore one path
        await this.exploreNode(rootNode)

        explorationRound++

        // Limit exploration rounds to prevent infinite loops
        if (explorationRound > 20) {
          console.log('⚠️ [EXPLORATION] Maximum exploration rounds reached')
          break
        }
      }

      this.state.isExploring = false
      this.emitEvent({ type: 'completed', timestamp: Date.now() })
      console.log('🎉 [EXPLORATION] Exploration completed!', {
        journeysFound: this.state.journeysFound.length,
        rounds: explorationRound - 1
      })
    } catch (error: any) {
      console.error('❌ [EXPLORATION] Error:', error)
      this.state.error = error.message
      this.state.isExploring = false
      this.emitEvent({ type: 'error', data: error.message, timestamp: Date.now() })
      throw error
    }
  }

  /**
   * Explore a single node by getting AI decision and executing action
   */
  private async exploreNode(node: JourneyTreeNode): Promise<void> {
    if (this.state.isPaused) {
      console.log('⏸️ [EXPLORATION] Paused')
      return
    }

    if (node.depth >= this.state.maxDepth) {
      console.log('🛑 [EXPLORATION] Max depth reached')
      return
    }

    console.log(`📍 [EXPLORATION] Exploring node at depth ${node.depth}:`, node.label)

    this.emitEvent({
      type: 'node_explored',
      data: node,
      timestamp: Date.now()
    })

    // Extract available elements
    const elements = await this.flowExtractor.extractInteractableElements()
    console.log(`🔍 [EXPLORATION] Found ${elements.length} interactable elements`)

    // Filter out already visited elements to find unexplored options
    const unvisitedElements = elements.filter(el => !this.visitedSelectors.has(el.selector))
    console.log(`🔍 [EXPLORATION] Found ${unvisitedElements.length} unvisited elements`)

    // If no unvisited elements, we've explored everything from this node
    if (unvisitedElements.length === 0) {
      console.log('✅ [EXPLORATION] All elements explored from this node')
      return
    }

    // Get current path
    const currentPath = this.buildPathFromNode(node)

    // Auto-complete if we've reached a reasonable depth with meaningful content
    // This ensures we capture journeys even if AI doesn't explicitly mark them complete
    if (node.depth >= 2 && this.shouldAutoComplete(currentPath, elements)) {
      console.log('🎯 [AUTO-COMPLETE] Journey meets auto-completion criteria')
      const autoDecision = {
        action: 'complete',
        confidence: 85,
        isComplete: true,
        reasoning: `Auto-completed after ${node.depth + 1} meaningful steps`,
        completionReason: `Journey reached depth ${node.depth + 1} with significant content displayed`,
        journeyName: null // Will be generated
      }
      await this.handleJourneyCompletion(currentPath, autoDecision)

      // Continue exploring other paths from this node
      console.log('🔄 [EXPLORATION] Journey saved, continuing to explore other paths from this node...')
      return // Will backtrack and try other branches
    }

    // Ask AI what to do next
    console.log('🤖 [AI] Asking AI for next action...')
    const decision = await aiDecisionService.decideNextAction(
      currentPath,
      node.pageContext,
      unvisitedElements, // Only show unvisited elements
      this.visitedSelectors
    )

    console.log('🤖 [AI] Decision:', {
      action: decision.action,
      isComplete: decision.isComplete,
      confidence: decision.confidence,
      reasoning: decision.reasoning
    })

    // Handle completion
    if (decision.isComplete) {
      console.log('✅ [JOURNEY] Journey complete!')
      await this.handleJourneyCompletion(currentPath, decision)

      // After completing a journey, continue exploring other paths from this node
      console.log('🔄 [EXPLORATION] Journey saved, will backtrack to explore alternative paths...')
      return // Return to let backtracking happen in executeClickAction
    }

    // Handle click action
    if (decision.action === 'click' && decision.elementSelector) {
      await this.executeClickAction(node, decision, elements)
    } else if (decision.action === 'click' && !decision.elementSelector) {
      // No element selected but wants to click - this means AI couldn't find a good next step
      console.log('⚠️ [EXPLORATION] AI wants to click but no element selected, done with this branch')
    } else {
      // No action decided - try exploring other branches from parent
      console.log('⚠️ [EXPLORATION] No clear action, done with this branch')
    }
  }

  /**
   * Check if journey should be auto-completed based on depth and content
   */
  private shouldAutoComplete(path: JourneyTreeNode[], elements: InteractableElement[]): boolean {
    // Don't auto-complete if path is too short - require at least 4 nodes (3 clicks)
    if (path.length < 4) return false

    const currentNode = path[path.length - 1]

    // Auto-complete if we have substantial content (lots of elements = data displayed)
    if (elements.length > 100) {
      console.log('🎯 [AUTO-COMPLETE CHECK] Substantial content detected:', elements.length, 'elements')
      return true
    }

    // Auto-complete if we've gone 4+ steps deep and have reasonable content
    if (path.length >= 4 && elements.length > 30) {
      console.log('🎯 [AUTO-COMPLETE CHECK] Sufficient depth and content')
      return true
    }

    // Auto-complete if we've gone really deep (5+ steps)
    if (path.length >= 5) {
      console.log('🎯 [AUTO-COMPLETE CHECK] Deep exploration reached:', path.length, 'steps')
      return true
    }

    return false
  }

  /**
   * Execute a click action and explore the resulting state
   */
  private async executeClickAction(
    parentNode: JourneyTreeNode,
    decision: any,
    elements: InteractableElement[]
  ): Promise<void> {
    const element = elements.find(el => el.selector === decision.elementSelector)
    if (!element) {
      console.warn('⚠️ [EXPLORATION] Element not found:', decision.elementSelector)
      return
    }

    // Mark as visited
    this.visitedSelectors.add(element.selector)

    console.log(`👆 [ACTION] Clicking element: ${decision.elementDescription}`)

    // Execute click in webview
    await this.clickElement(element.selector)

    // Wait for page to load/settle
    await this.waitForPageLoad()

    // Capture new page state
    const newContext = await this.capturePageContext()

    // Create child node
    const childNode: JourneyTreeNode = {
      id: crypto.randomUUID(),
      type: 'click',
      label: decision.elementDescription || `Click: ${element.text}`,
      element: element,
      pageContext: newContext,
      parent: parentNode,
      children: [],
      depth: parentNode.depth + 1,
      timestamp: Date.now(),
      aiReasoning: decision.reasoning
    }

    parentNode.children.push(childNode)
    this.state.currentNode = childNode
    this.state.depth = childNode.depth

    console.log(`✅ [NODE] Created child node:`, childNode.label)

    // Check for loops
    const pathHash = this.hashPath(newContext)
    if (this.state.visitedPaths.has(pathHash)) {
      console.log('🔄 [LOOP] Already visited this page, backtracking...')
      await this.backtrack(childNode)
      return
    }

    this.state.visitedPaths.add(pathHash)

    // Continue exploring from this node
    await this.exploreNode(childNode)

    // Backtrack after exploring
    await this.backtrack(childNode)
  }

  /**
   * Handle journey completion
   */
  private async handleJourneyCompletion(
    path: JourneyTreeNode[],
    decision: any
  ): Promise<void> {
    console.log('🎯 [JOURNEY] Handling journey completion...')
    console.log('🎯 [JOURNEY] Path length:', path.length)
    console.log('🎯 [JOURNEY] Decision:', decision)

    // Generate journey name (use AI-provided name or generate one)
    const journeyName = decision.journeyName ||
      await aiDecisionService.generateJourneyName(path)

    console.log('🎯 [JOURNEY] Generated name:', journeyName)

    // Convert path to steps
    const steps = this.convertPathToSteps(path)
    console.log('🎯 [JOURNEY] Generated steps:', steps.length)

    // Serialize path to remove circular references
    const serializedPath = this.serializePath(path)
    console.log('🎯 [JOURNEY] Serialized path (no circular refs)')

    const exploredJourney: ExploredJourney = {
      id: crypto.randomUUID(),
      name: journeyName,
      path: serializedPath,
      confidence: decision.confidence,
      completionReason: decision.completionReason || decision.reasoning,
      steps: steps,
      createdAt: Date.now(),
      status: 'pending' // User needs to confirm
    }

    console.log('🎯 [JOURNEY] Created journey object:', {
      id: exploredJourney.id,
      name: exploredJourney.name,
      steps: exploredJourney.steps.length,
      pathLength: exploredJourney.path.length
    })

    this.state.journeysFound.push(exploredJourney)
    console.log('🎯 [JOURNEY] Added to state. Total journeys now:', this.state.journeysFound.length)
    console.log('🎯 [JOURNEY] All journeys:', this.state.journeysFound.map(j => ({ id: j.id, name: j.name })))

    console.log('📡 [EVENT] Emitting journey_found event...')
    this.emitEvent({
      type: 'journey_found',
      data: exploredJourney,
      timestamp: Date.now()
    })
    console.log('📡 [EVENT] journey_found event emitted successfully')

    console.log('✅ [JOURNEY] Journey added:', journeyName)
  }

  /**
   * Serialize path by removing circular references (parent/children)
   * Creates a clean, JSON-serializable version of the journey path
   */
  private serializePath(path: JourneyTreeNode[]): JourneyTreeNode[] {
    return path.map(node => ({
      id: node.id,
      type: node.type,
      label: node.label,
      element: node.element,
      pageContext: node.pageContext,
      parent: null, // Remove circular parent reference
      children: [], // Remove circular children reference
      depth: node.depth,
      timestamp: node.timestamp,
      aiReasoning: node.aiReasoning
    }))
  }

  /**
   * Convert journey path to action steps
   */
  private convertPathToSteps(path: JourneyTreeNode[]): JourneyStep[] {
    const steps: JourneyStep[] = []
    let order = 1

    // Skip root node (it's just the starting page)
    for (let i = 1; i < path.length; i++) {
      const node = path[i]
      if (!node.element) continue

      steps.push({
        type: 'click',
        element: node.element,
        description: node.label,
        requiresData: false,
        order: order++
      })
    }

    return steps
  }

  /**
   * Backtrack to parent node
   */
  private async backtrack(node: JourneyTreeNode): Promise<void> {
    if (!node.parent) return

    console.log('⬅️ [BACKTRACK] Returning to parent node')

    // Navigate back (browser back or re-navigate to parent URL)
    await this.navigateBack()

    // Wait for page to stabilize
    await this.waitForPageLoad()

    this.state.currentNode = node.parent
    this.state.depth = node.parent.depth
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
    // Wait for configured time
    await new Promise(resolve => setTimeout(resolve, this.config.waitTimeBetweenActions))

    // Additional check: wait for document ready
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

    // Summarize visible text
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
   * Build path from node to root
   */
  private buildPathFromNode(node: JourneyTreeNode): JourneyTreeNode[] {
    const path: JourneyTreeNode[] = []
    let current: JourneyTreeNode | null = node

    while (current) {
      path.unshift(current)
      current = current.parent
    }

    return path
  }

  /**
   * Hash path to detect loops - includes the full journey path, not just URL
   * This allows multiple different journeys to the same page
   */
  private hashPath(context: PageContext): string {
    // Build a path signature that includes how we got here
    const currentPath = this.buildPathFromNode(this.state.currentNode!)
    const pathSignature = currentPath
      .map(node => {
        // Include the action taken (what was clicked)
        if (node.element) {
          return `${node.pageContext.url}::${node.element.selector}`
        }
        return node.pageContext.url
      })
      .join(' → ')

    return pathSignature
  }

  /**
   * Pause exploration
   */
  pause(): void {
    this.state.isPaused = true
    this.emitEvent({ type: 'paused', timestamp: Date.now() })
  }

  /**
   * Resume exploration
   */
  resume(): void {
    this.state.isPaused = false
  }

  /**
   * Get current exploration state
   */
  getState(): ExplorationState {
    return { ...this.state }
  }

  /**
   * Get discovered journeys
   */
  getJourneys(): ExploredJourney[] {
    return this.state.journeysFound
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
