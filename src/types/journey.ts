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
