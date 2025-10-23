import {
  Journey,
  JourneyNode,
  PageNode,
  ActionNode,
  JourneyPath,
  JourneyGraphData
} from '../types/journey'

/**
 * Journey Graph Builder - Creates tree/graph structure from detected journeys
 */
export class JourneyGraph {
  private root: PageNode | null = null
  private allNodes: JourneyNode[] = []

  constructor(private currentUrl: string) {}

  /**
   * Build graph from detected journeys
   */
  buildFromJourneys(journeys: Journey[]): JourneyGraphData {
    // Create root page node
    this.root = {
      id: `page-root`,
      type: 'page',
      label: 'Current Page',
      url: this.currentUrl,
      data: { isRoot: true },
      children: []
    }

    this.allNodes = [this.root]

    // Add each journey as a branch from root
    journeys.forEach((journey, index) => {
      const journeyBranch = this.createJourneyBranch(journey, index)
      this.root!.children.push(journeyBranch)
      this.collectNodes(journeyBranch)
    })

    // Extract all paths
    const paths = this.extractPaths()

    return {
      root: this.root,
      nodes: this.allNodes,
      paths
    }
  }

  /**
   * Create a branch (subtree) for a journey
   */
  private createJourneyBranch(journey: Journey, index: number): JourneyNode {
    // Create journey container node
    const journeyNode: JourneyNode = {
      id: journey.id,
      type: 'action',
      label: journey.name,
      data: { journey, confidence: journey.confidence },
      children: []
    }

    let currentNode: JourneyNode = journeyNode

    // Create node for each step
    journey.steps.forEach((step, stepIndex) => {
      const stepNode: ActionNode = {
        id: `${journey.id}-step-${stepIndex}`,
        type: 'action',
        label: step.description,
        step,
        data: {
          stepNumber: step.order,
          requiresData: step.requiresData,
          dataType: step.dataType
        },
        children: []
      }

      currentNode.children.push(stepNode)
      currentNode = stepNode
    })

    return journeyNode
  }

  /**
   * Collect all nodes recursively
   */
  private collectNodes(node: JourneyNode): void {
    this.allNodes.push(node)
    node.children.forEach(child => this.collectNodes(child))
  }

  /**
   * Extract all unique paths from root to leaves
   */
  private extractPaths(): JourneyPath[] {
    const paths: JourneyPath[] = []

    const traverse = (node: JourneyNode, currentPath: JourneyNode[]): void => {
      const newPath = [...currentPath, node]

      if (node.children.length === 0) {
        // Leaf node - create path
        paths.push({
          nodes: newPath,
          description: newPath.map(n => n.label).join(' → '),
          length: newPath.length
        })
      } else {
        // Continue traversing
        node.children.forEach(child => traverse(child, newPath))
      }
    }

    if (this.root) {
      traverse(this.root, [])
    }

    return paths
  }

  /**
   * Get all leaf nodes (end points)
   */
  getLeafNodes(): JourneyNode[] {
    return this.allNodes.filter(node => node.children.length === 0)
  }

  /**
   * Get journey statistics
   */
  getStatistics() {
    const journeyNodes = this.root?.children || []
    const totalPaths = this.extractPaths().length
    const avgPathLength =
      totalPaths > 0
        ? this.extractPaths().reduce((sum, path) => sum + path.length, 0) / totalPaths
        : 0

    return {
      totalJourneys: journeyNodes.length,
      totalNodes: this.allNodes.length,
      totalPaths,
      averagePathLength: Math.round(avgPathLength * 10) / 10,
      maxDepth: Math.max(...this.extractPaths().map(p => p.length))
    }
  }

  /**
   * Export graph for visualization libraries (D3, vis.js, etc.)
   */
  exportForVisualization(): {
    nodes: Array<{ id: string; label: string; type: string; data?: any }>
    edges: Array<{ from: string; to: string; label?: string }>
  } {
    const nodes: Array<{ id: string; label: string; type: string; data?: any }> = []
    const edges: Array<{ from: string; to: string; label?: string }> = []

    const traverse = (node: JourneyNode, parent?: JourneyNode): void => {
      nodes.push({
        id: node.id,
        label: node.label,
        type: node.type,
        data: node.data
      })

      if (parent) {
        edges.push({
          from: parent.id,
          to: node.id
        })
      }

      node.children.forEach(child => traverse(child, node))
    }

    if (this.root) {
      traverse(this.root)
    }

    return { nodes, edges }
  }
}

/**
 * Helper to create a simple visualization of the graph (ASCII tree)
 */
export function visualizeGraphAsText(graphData: JourneyGraphData): string {
  const lines: string[] = []

  const traverse = (node: JourneyNode, prefix: string, isLast: boolean): void => {
    const connector = isLast ? '└── ' : '├── '
    const confidence =
      node.data?.confidence !== undefined ? ` (${node.data.confidence}%)` : ''

    lines.push(prefix + connector + node.label + confidence)

    const newPrefix = prefix + (isLast ? '    ' : '│   ')

    node.children.forEach((child, index) => {
      traverse(child, newPrefix, index === node.children.length - 1)
    })
  }

  lines.push(graphData.root.label)
  graphData.root.children.forEach((child, index) => {
    traverse(child, '', index === graphData.root.children.length - 1)
  })

  return lines.join('\n')
}
