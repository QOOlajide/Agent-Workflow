/**
 * REACT FLOW ZUSTAND STORE
 * 
 * WHAT: Global state management for React Flow nodes and data transfer
 * WHY: Centralized state management for node data flow following cursor rules
 * HOW: Zustand store tracks node outputs and handles data transfer between nodes
 * 
 * KEY FEATURES:
 * - Store output data from each node
 * - Track connections between nodes
 * - Retrieve connected data for any node
 * - Type-safe data transfer
 */

import { create } from 'zustand'

/**
 * TYPE DEFINITION: NodeOutputData
 * 
 * WHAT: Structure for data output from any node type
 * WHY: Provides type-safe data transfer between nodes
 * HOW: Different node types populate different fields based on their output
 */
export interface NodeOutputData {
  nodeId: string              // Source node ID
  nodeType: string            // Type of node (firecrawl, openai, etc.)
  content: string             // Main content/data output
  label?: string              // Optional display label (URL, model name, etc.)
  metadata?: {                // Optional metadata
    timestamp?: number
    [key: string]: unknown
  }
}

/**
 * TYPE DEFINITION: FlowConnection
 * 
 * WHAT: Represents a connection between two nodes
 * WHY: Track which nodes are connected for data flow
 * HOW: Maps source and target node IDs
 */
export interface FlowConnection {
  sourceNodeId: string
  targetNodeId: string
  sourceHandle?: string
  targetHandle?: string
}

/**
 * TYPE DEFINITION: FlowStore
 * 
 * WHAT: Shape of the Zustand store state and actions
 * WHY: Provides TypeScript type safety for store usage
 * HOW: Defines all state properties and action methods
 */
interface FlowStore {
  // ============================================================
  // STATE PROPERTIES
  // ============================================================
  
  // Map of node ID to its output data
  nodeOutputs: Map<string, NodeOutputData>
  
  // Array of connections between nodes
  connections: FlowConnection[]
  
  // ============================================================
  // ACTIONS
  // ============================================================
  
  /**
   * Set output data for a node
   * WHAT: Store or update a node's output data
   * WHY: When a node produces output, store it for connected nodes
   * HOW: Update the nodeOutputs map with new data
   */
  setNodeOutput: (nodeId: string, data: NodeOutputData) => void
  
  /**
   * Get output data for a node
   * WHAT: Retrieve a node's output data
   * WHY: Access stored data when needed
   * HOW: Look up node in nodeOutputs map
   */
  getNodeOutput: (nodeId: string) => NodeOutputData | undefined
  
  /**
   * Add a connection between nodes
   * WHAT: Register a new connection
   * WHY: Track which nodes are connected for data flow
   * HOW: Add to connections array
   */
  addConnection: (connection: FlowConnection) => void
  
  /**
   * Remove a connection
   * WHAT: Unregister a connection
   * WHY: When user deletes an edge, stop data flow
   * HOW: Remove from connections array
   */
  removeConnection: (sourceNodeId: string, targetNodeId: string) => void
  
  /**
   * Get all connected inputs for a node
   * WHAT: Retrieve data from all nodes connected to this node's input
   * WHY: Target node needs to access all source node outputs
   * HOW: Find all connections where this node is target, get their outputs
   */
  getConnectedInputs: (nodeId: string) => NodeOutputData[]
  
  /**
   * Clear all data for a node
   * WHAT: Remove a node's output data and connections
   * WHY: Clean up when node is deleted
   * HOW: Remove from nodeOutputs and filter connections
   */
  clearNode: (nodeId: string) => void
  
  /**
   * Clear all store data
   * WHAT: Reset store to initial state
   * WHY: Clear canvas or reset workflow
   * HOW: Reset all maps and arrays
   */
  clearAll: () => void
}

/**
 * ZUSTAND STORE INSTANCE
 * 
 * WHAT: Create the Zustand store with initial state and actions
 * WHY: Provides global state management for React Flow data
 * HOW: Use create() from Zustand with state and setter functions
 */
export const useFlowStore = create<FlowStore>((set, get) => ({
  // ============================================================
  // INITIAL STATE
  // ============================================================
  
  nodeOutputs: new Map<string, NodeOutputData>(),
  connections: [],
  
  // ============================================================
  // ACTIONS IMPLEMENTATION
  // ============================================================
  
  /**
   * SET NODE OUTPUT
   * 
   * EXAMPLE:
   * setNodeOutput('firecrawl-1', {
   *   nodeId: 'firecrawl-1',
   *   nodeType: 'firecrawl',
   *   content: '# Website Content\n\nMarkdown here...',
   *   label: 'https://example.com',
   *   metadata: { timestamp: Date.now() }
   * })
   */
  setNodeOutput: (nodeId: string, data: NodeOutputData) => {
    set((state) => {
      // Create new Map to trigger React re-render
      const newOutputs = new Map(state.nodeOutputs)
      newOutputs.set(nodeId, {
        ...data,
        metadata: {
          ...data.metadata,
          timestamp: Date.now(),
        },
      })
      
      return { nodeOutputs: newOutputs }
    })
  },
  
  /**
   * GET NODE OUTPUT
   * 
   * EXAMPLE:
   * const output = getNodeOutput('firecrawl-1')
   * if (output) {
   *   console.log(output.content)
   * }
   */
  getNodeOutput: (nodeId: string) => {
    return get().nodeOutputs.get(nodeId)
  },
  
  /**
   * ADD CONNECTION
   * 
   * EXAMPLE:
   * addConnection({
   *   sourceNodeId: 'firecrawl-1',
   *   targetNodeId: 'openai-1',
   *   sourceHandle: 'output',
   *   targetHandle: 'input'
   * })
   */
  addConnection: (connection: FlowConnection) => {
    set((state) => {
      // Check if connection already exists
      const exists = state.connections.some(
        (conn) =>
          conn.sourceNodeId === connection.sourceNodeId &&
          conn.targetNodeId === connection.targetNodeId
      )
      
      // Don't add duplicate connections
      if (exists) {
        return state
      }
      
      return {
        connections: [...state.connections, connection],
      }
    })
  },
  
  /**
   * REMOVE CONNECTION
   * 
   * EXAMPLE:
   * removeConnection('firecrawl-1', 'openai-1')
   */
  removeConnection: (sourceNodeId: string, targetNodeId: string) => {
    set((state) => ({
      connections: state.connections.filter(
        (conn) =>
          !(conn.sourceNodeId === sourceNodeId && conn.targetNodeId === targetNodeId)
      ),
    }))
  },
  
  /**
   * GET CONNECTED INPUTS
   * 
   * WHAT: Get all output data from nodes connected to this node's input
   * WHY: Target node needs to access source node data
   * HOW: Find connections where this is target, get outputs from sources
   * 
   * EXAMPLE:
   * const inputs = getConnectedInputs('openai-1')
   * // Returns array of NodeOutputData from all connected source nodes
   * inputs.forEach(input => {
   *   console.log(`Received ${input.content} from ${input.nodeType}`)
   * })
   */
  getConnectedInputs: (nodeId: string) => {
    const state = get()
    
    // Find all connections where this node is the target
    const incomingConnections = state.connections.filter(
      (conn) => conn.targetNodeId === nodeId
    )
    
    // Get output data from all source nodes
    const connectedOutputs: NodeOutputData[] = []
    
    for (const conn of incomingConnections) {
      const output = state.nodeOutputs.get(conn.sourceNodeId)
      if (output && output.content) {
        connectedOutputs.push(output)
      }
    }
    
    return connectedOutputs
  },
  
  /**
   * CLEAR NODE
   * 
   * EXAMPLE:
   * clearNode('firecrawl-1')
   */
  clearNode: (nodeId: string) => {
    set((state) => {
      // Remove node output
      const newOutputs = new Map(state.nodeOutputs)
      newOutputs.delete(nodeId)
      
      // Remove all connections involving this node
      const newConnections = state.connections.filter(
        (conn) =>
          conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
      )
      
      return {
        nodeOutputs: newOutputs,
        connections: newConnections,
      }
    })
  },
  
  /**
   * CLEAR ALL
   * 
   * EXAMPLE:
   * clearAll() // Reset entire store
   */
  clearAll: () => {
    set({
      nodeOutputs: new Map<string, NodeOutputData>(),
      connections: [],
    })
  },
}))

/**
 * ============================================================
 * USAGE EXAMPLES
 * ============================================================
 * 
 * IN FIRECRAWL NODE (after scraping):
 * ```typescript
 * const { setNodeOutput } = useFlowStore()
 * 
 * // After successful scrape
 * setNodeOutput(id, {
 *   nodeId: id,
 *   nodeType: 'firecrawl',
 *   content: markdown,
 *   label: url,
 * })
 * ```
 * 
 * IN OPENAI NODE (before generation):
 * ```typescript
 * const { getConnectedInputs } = useFlowStore()
 * 
 * // Get data from connected nodes
 * const connectedData = getConnectedInputs(id)
 * 
 * // Use in prompt
 * const contextString = connectedData
 *   .map(data => `[From ${data.nodeType}: ${data.label}]\n${data.content}`)
 *   .join('\n\n')
 * ```
 * 
 * IN MAIN PAGE (on connection):
 * ```typescript
 * const { addConnection } = useFlowStore()
 * 
 * const onConnect = (params: Connection) => {
 *   setEdges((eds) => addEdge(params, eds))
 *   
 *   addConnection({
 *     sourceNodeId: params.source,
 *     targetNodeId: params.target,
 *     sourceHandle: params.sourceHandle,
 *     targetHandle: params.targetHandle,
 *   })
 * }
 * ```
 * 
 * ============================================================
 * BENEFITS OF ZUSTAND APPROACH
 * ============================================================
 * 
 * 1. CENTRALIZED STATE:
 *    - Single source of truth for node data
 *    - Easy to debug and track data flow
 * 
 * 2. TYPE SAFETY:
 *    - Full TypeScript support
 *    - Autocomplete for all actions
 * 
 * 3. PERFORMANCE:
 *    - Only re-renders components that use changed data
 *    - No prop drilling through React Flow
 * 
 * 4. SCALABILITY:
 *    - Easy to add new node types
 *    - Simple to extend with new features
 * 
 * 5. TESTABILITY:
 *    - Store logic separated from UI
 *    - Easy to test data flow logic
 */

