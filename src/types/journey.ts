import { InteractableElement } from '../utils/flowExtractor'

export type JourneyType =
  | 'login'
  | 'registration'
  | 'search'
  | 'form'
  | 'navigation'
  | 'ecommerce'
  | 'unknown'

export type StepType = 'fill' | 'click' | 'select' | 'check' | 'navigate'

export interface JourneyStep {
  type: StepType
  element: InteractableElement
  description: string
  requiresData: boolean
  dataType?: 'text' | 'email' | 'password' | 'phone' | 'number' | 'date' | 'select' | 'checkbox'
  order: number
}

export interface Journey {
  id: string
  name: string
  type: JourneyType
  confidence: number // 0-100
  steps: JourneyStep[]
  metadata?: {
    formId?: string
    startUrl?: string
    estimatedDuration?: number
    complexity?: 'low' | 'medium' | 'high'
  }
}

export type NodeType = 'page' | 'action' | 'decision'

export interface JourneyNode {
  id: string
  type: NodeType
  label: string
  data?: any
  children: JourneyNode[]
  parent?: JourneyNode
}

export interface PageNode extends JourneyNode {
  type: 'page'
  url: string
}

export interface ActionNode extends JourneyNode {
  type: 'action'
  step: JourneyStep
}

export interface DecisionNode extends JourneyNode {
  type: 'decision'
  condition: string
  branches: {
    true: JourneyNode
    false: JourneyNode
  }
}

export interface JourneyPath {
  nodes: JourneyNode[]
  description: string
  length: number
}

export interface JourneyGraphData {
  root: JourneyNode
  nodes: JourneyNode[]
  paths: JourneyPath[]
}

// ========== AI-Powered Journey Exploration Types ==========

export interface PageContext {
  url: string
  title: string
  mainHeading: string | null
  visibleText: string // Summarized key text on page
  screenshot?: string // Base64 encoded screenshot
  timestamp: number
}

export interface AIDecision {
  action: 'click' | 'fill' | 'wait' | 'complete' | 'backtrack'
  elementSelector?: string // XPath of element to interact with
  elementDescription?: string // Human-readable description
  reasoning: string // AI's explanation for the decision
  confidence: number // 0-100
  isComplete: boolean // Whether journey is complete
  journeyName?: string // Name for completed journey
  completionReason?: string // Why journey is considered complete
}

export interface ExplorationState {
  currentNode: JourneyTreeNode | null
  visitedPaths: Set<string> // Serialized path hashes to avoid loops
  depth: number // Current depth in exploration
  maxDepth: number // Maximum depth allowed
  journeysFound: ExploredJourney[]
  isExploring: boolean
  isPaused: boolean
  error: string | null
}

export interface JourneyTreeNode {
  id: string
  type: 'root' | 'click' | 'form' | 'navigation' | 'completion'
  label: string // Human-readable label (e.g., "Click Accounts", "Account Details Page")
  element?: InteractableElement // The element that was clicked to reach this node
  pageContext: PageContext
  parent: JourneyTreeNode | null
  children: JourneyTreeNode[]
  depth: number
  timestamp: number
  aiReasoning?: string // Why AI chose to click this element
}

export interface ExploredJourney {
  id: string
  name: string // AI-generated name
  path: JourneyTreeNode[] // Sequence of nodes from root to completion
  confidence: number
  completionReason: string
  steps: JourneyStep[] // Converted to manual flow format
  createdAt: number
  status: 'pending' | 'confirmed' | 'discarded'
}

export interface ExplorationConfig {
  maxDepth: number // Default: 10
  waitTimeBetweenActions: number // Default: 2000ms
  ignoreElements: string[] // Patterns to ignore (logout, settings, etc.)
  autoSaveJourneys: boolean // Default: false (ask user for confirmation)
  explorationStrategy: 'depth-first' | 'breadth-first' | 'ai-guided'
}

// ========== New AI Journeys Map Structure ==========

export interface MeaningfulElement {
  type: string // button, link, input, etc.
  label: string // Element text or label
  context: string // Brief AI-generated context
  selector: string // XPath
  visited: boolean // Has this been explored?
  text?: string
  ariaLabel?: string
  href?: string
}

export interface AIJourneyNode {
  parent: string | null // Key of parent node
  meaningfulElements: MeaningfulElement[] // AI-filtered elements
  interactableElements: InteractableElement[] // All detected elements
  pageContext: string // AI-generated page summary
  children: string[] // Array of child node keys
  url: string // Page URL
  timestamp: number
  scannedAt: number // When this page was first scanned
}

export interface AIJourneysMap {
  [key: string]: AIJourneyNode // key format: "URL_ACTIONLABEL" or "URL_default"
}
