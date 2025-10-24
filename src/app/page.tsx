/**
 * MAIN APPLICATION PAGE - React Flow Canvas with Firecrawl Integration
 * 
 * WHAT: The main page component that renders the React Flow workflow canvas
 * WHY: Provides the interactive workspace where users create and manage workflow nodes
 * HOW: Sets up React Flow with custom Firecrawl nodes and handles all canvas interactions
 * 
 * WORKFLOW POSITION: Root of the application - orchestrates the entire workflow system
 */

// Enable client-side rendering
// WHAT: Tells Next.js this component must render on the client (browser)
// WHY: React Flow requires browser APIs (DOM manipulation, drag events, etc.)
// HOW: Next.js sees this directive and excludes this page from server-side rendering
"use client";

// Import React hooks for state management and optimization
// WHAT: Core React hooks that enable component reactivity and performance
// WHY:
//   - useState: Manages nodes and edges state (the workflow data)
//   - useCallback: Prevents function recreation on every render (performance)
//   - useMemo: Caches expensive computations (nodeTypes object)
//   - useEffect: Syncs data between connected nodes when data changes
// HOW: These work together to create a performant, interactive canvas
import { useState, useCallback, useMemo, useEffect } from 'react';

// Import React Flow library and components
// WHAT: React Flow provides the interactive node-based canvas
// WHY: Enables drag-and-drop workflow creation without building from scratch
// HOW: Import core component + utilities + types + UI components
import { 
  ReactFlow,           // Main canvas component
  applyNodeChanges,    // Utility to update nodes array immutably
  applyEdgeChanges,    // Utility to update edges array immutably
  addEdge,             // Utility to add a new connection between nodes
  type Node,           // TypeScript type for node objects
  type Edge,           // TypeScript type for edge (connection) objects
  type NodeChange,     // TypeScript type for node update events (move, select, delete, etc.)
  type EdgeChange,     // TypeScript type for edge update events
  type Connection,     // TypeScript type for new connection data
  Background,          // Optional component that adds a grid/dot pattern background
  MiniMap,             // Optional component showing overview of entire canvas
} from '@xyflow/react';

// Import React Flow styles
// WHAT: CSS file containing all React Flow default styles
// WHY: Required for React Flow to display correctly (handles, edges, controls, etc.)
// HOW: Imported globally so all React Flow components have proper styling
import '@xyflow/react/dist/style.css';

// Import our custom node components
// WHAT: The custom node components we created for the workflow
// WHY: Need to register them with React Flow so it knows how to render custom node types
// HOW: Imported and added to nodeTypes mapping below
import { FirecrawlNode } from '@/components/nodes/FirecrawlNode';
import { OpenAINode } from '@/components/nodes/OpenAINode';

// ============================================================
// TYPESCRIPT INTERFACES FOR NODE DATA
// ============================================================

/**
 * Connected Node Data structure
 * Represents data passed from one node to another via connections
 */
interface ConnectedNodeData {
  type: string;
  content: string;
  label?: string;
}

/**
 * Firecrawl Node Data structure
 * Contains URL input and scraped markdown output
 */
interface FirecrawlNodeData {
  url: string;
  markdown: string;
}

/**
 * OpenAI Node Data structure
 * Contains prompt, model selection, response, and connected data
 */
interface OpenAINodeData {
  prompt: string;
  model: string;
  response: string;
  connectedData: ConnectedNodeData[];
}

/**
 * Default Node Data structure
 * For standard React Flow nodes or unknown types
 */
interface DefaultNodeData {
  label?: string;
  [key: string]: unknown;
}
 
/**
 * INITIAL NODES CONFIGURATION
 * 
 * WHAT: Array of node objects that will appear when the canvas first loads
 * WHY: Provides a starting point for users (empty canvas can be confusing)
 * HOW: Each object defines a node's id, type, position, and data
 * 
 * NODE STRUCTURE:
 * - id: Unique identifier (must be unique across all nodes)
 * - type: Node type string (maps to nodeTypes object, or uses default if omitted)
 * - position: { x, y } coordinates on the canvas
 * - data: Custom data object (structure depends on node type)
 */
const initialNodes: Node[] = [
  {
    // WHAT: First node - our custom Firecrawl scraper
    // WHY: Allows users to scrape web content as the starting point
    // HOW: Type 'firecrawl' maps to FirecrawlNode component
    id: 'firecrawl-1',           // Unique ID for this node instance
    type: 'firecrawl',           // Maps to nodeTypes.firecrawl (our custom component)
    position: { x: 150, y: 100 }, // Starting position (150px right, 100px down)
    data: {
      url: '',                   // Empty URL initially (user will enter it)
      markdown: '',              // No markdown yet (populated after scraping)
    },
  },
  {
    // WHAT: Second node - our custom OpenAI generator
    // WHY: Demonstrates AI processing of scraped data
    // HOW: Type 'openai' maps to OpenAINode component
    id: 'openai-1',              // Unique ID
    type: 'openai',              // Maps to nodeTypes.openai (our custom component)
    position: { x: 150, y: 450 }, // Below the Firecrawl node
    data: {
      prompt: '',                // Empty prompt initially (user will enter it)
      model: 'gpt-5',            // Default model selection
      response: '',              // No response yet (populated after generation)
      connectedData: [],         // No connected data initially (populated via connections)
    },
  },
];

/**
 * INITIAL EDGES CONFIGURATION
 * 
 * WHAT: Array of edge objects (connections between nodes)
 * WHY: Defines which nodes are connected to each other
 * HOW: Each edge has source and target node IDs
 * 
 * NOTE: Starting with empty array - users will create connections via UI
 */
const initialEdges: Edge[] = [];
 
/**
 * HOME COMPONENT - Main Application Page
 * 
 * WHAT: The main React component that renders the React Flow canvas
 * WHY: This is the entry point of the application (/page)
 * HOW: Manages nodes/edges state and renders ReactFlow with custom node types
 */
export default function Home() {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  /**
   * NODES STATE
   * 
   * WHAT: Array of all nodes currently on the canvas
   * WHY: React Flow needs to know what nodes to render
   * HOW: Initialize with initialNodes, update via setNodes
   * 
   * UPDATES: When user drags, selects, deletes, or modifies nodes
   */
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  
  /**
   * EDGES STATE
   * 
   * WHAT: Array of all connections (edges) between nodes
   * WHY: React Flow needs to know which nodes are connected
   * HOW: Initialize with initialEdges (empty), update via setEdges
   * 
   * UPDATES: When user creates or deletes connections
   */
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // ============================================================
  // CUSTOM NODE TYPES REGISTRATION
  // ============================================================
  
  /**
   * NODE TYPES MAPPING
   * 
   * WHAT: Object that maps node type strings to React components
   * WHY: Tells React Flow how to render each node type
   * HOW: Key = type string (used in node.type), Value = React component
   * 
   * WRAPPED IN useMemo:
   * - WHAT: Caches the object so it doesn't recreate on every render
   * - WHY: React Flow checks if nodeTypes changed; recreation causes re-renders
   * - HOW: Empty dependency array [] = only create once
   * 
   * EXAMPLE: When React Flow sees node with type='firecrawl',
   *          it renders <FirecrawlNode /> component
   */
  const nodeTypes = useMemo(
    () => ({
      firecrawl: FirecrawlNode, // Map 'firecrawl' type to our custom component
      openai: OpenAINode,       // Map 'openai' type to our OpenAI component
      // Add more custom node types here as needed:
      // customType3: CustomNode3,
    }),
    [] // No dependencies = never recreates
  );

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  
  /**
   * NODES CHANGE HANDLER
   * 
   * WHAT: Callback function that handles all node updates
   * WHY: React Flow fires events when nodes change (drag, select, delete, etc.)
   * HOW: Receives an array of changes and applies them to current nodes state
   * 
   * WRAPPED IN useCallback:
   * - WHAT: Memoizes the function to prevent recreation
   * - WHY: React Flow checks if handler changed; recreation causes re-renders
   * - HOW: Empty dependency array [] = function never changes
   * 
   * CHANGE TYPES:
   * - position: Node was dragged to new position
   * - select: Node was selected or deselected
   * - remove: Node was deleted
   * - dimensions: Node size changed
   * - add: New node was added
   * 
   * applyNodeChanges UTILITY:
   * - WHAT: React Flow utility that applies changes immutably
   * - WHY: Ensures React detects state change and re-renders
   * - HOW: Creates new array with changes applied (doesn't mutate original)
   */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [], // No dependencies = function never recreates
  );
  
  /**
   * EDGES CHANGE HANDLER
   * 
   * WHAT: Callback function that handles all edge (connection) updates
   * WHY: React Flow fires events when edges change (select, delete, etc.)
   * HOW: Receives an array of changes and applies them to current edges state
   * 
   * SIMILAR TO onNodesChange but for connections:
   * - select: Edge was selected
   * - remove: Edge was deleted
   * - add: New edge was created
   */
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  
  /**
   * CONNECTION HANDLER WITH DATA FLOW
   * 
   * WHAT: Callback function that handles new connections between nodes AND passes data
   * WHY: React Flow calls this when user drags from one handle to another
   * HOW: Receives connection params → adds edge → transfers data from source to target
   * 
   * CONNECTION FLOW:
   * 1. User clicks and drags from a source handle (e.g., Firecrawl output)
   * 2. User drops on a target handle (e.g., OpenAI input)
   * 3. React Flow calls onConnect with connection details
   * 4. addEdge creates a new edge object with unique ID
   * 5. Edge is added to edges array → React Flow renders the connection
   * 6. **NEW**: Read data from source node
   * 7. **NEW**: Update target node's connectedData with source data
   * 8. **NEW**: Target node UI updates to show connected data
   * 
   * DATA FLOW EXAMPLE:
   * - Firecrawl node (source) has markdown data
   * - User connects Firecrawl to OpenAI (target)
   * - This handler extracts markdown from Firecrawl
   * - Packages it as ConnectedNodeData object
   * - Adds it to OpenAI's connectedData array
   * - OpenAI node shows "Connected Data" preview
   * - When user generates, markdown is included as context
   */
  // Sync connected data whenever nodes change
  useEffect(() => {
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return;
      
      let connectedContent = "";
      let connectedLabel: string | undefined;
      
      if (sourceNode.type === "firecrawl") {
        const firecrawlData = sourceNode.data as unknown as FirecrawlNodeData;
        connectedContent = firecrawlData.markdown || "";
        connectedLabel = firecrawlData.url || undefined;
      } else if (sourceNode.type === "openai") {
        const openaiData = sourceNode.data as unknown as OpenAINodeData;
        connectedContent = openaiData.response || "";
        connectedLabel = openaiData.model ? `Model: ${openaiData.model}` : undefined;
      } else {
        const defaultData = sourceNode.data as unknown as DefaultNodeData;
        connectedContent = defaultData.label || "";
        connectedLabel = sourceNode.id;
      }
      
      if (!connectedContent.trim()) return;
      
      const newConnectedData: ConnectedNodeData = {
        type: sourceNode.type || "unknown",
        content: connectedContent,
        label: connectedLabel,
      };
      
      const targetData = (targetNode.data as unknown as OpenAINodeData).connectedData || [];
      const needsUpdate = !Array.isArray(targetData) || !targetData.some(
        (item: ConnectedNodeData) => 
          item.type === newConnectedData.type && 
          item.label === newConnectedData.label &&
          item.content === newConnectedData.content
      );
      
      if (needsUpdate) {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === edge.target) {
              const existing = (node.data as unknown as OpenAINodeData).connectedData || [];
              const filtered = Array.isArray(existing) 
                ? existing.filter((item: ConnectedNodeData) => !(item.type === newConnectedData.type && item.label === newConnectedData.label))
                : [];
              
              return {
                ...node,
                data: {
                  ...node.data,
                  connectedData: [...filtered, newConnectedData],
                },
              };
            }
            return node;
          })
        );
      }
    });
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // ============================================================
      // STEP 1: ADD THE EDGE (VISUAL CONNECTION)
      // ============================================================
      
      // WHAT: Add the edge to the edges array
      // WHY: Creates the visual line connecting the nodes
      // HOW: Use addEdge utility to create edge immutably
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot));
      
      // ============================================================
      // STEP 2: TRANSFER DATA FROM SOURCE TO TARGET
      // ============================================================
      
      // WHAT: Update nodes to pass data from source to target
      // WHY: Target node needs access to source node's data
      // HOW: Find source node → extract data → add to target node's connectedData
      setNodes((nodesSnapshot) => {
        // WHAT: Find the source node (where connection starts)
        // WHY: Need to read data from this node
        // HOW: Array.find() searches for node with matching ID
        const sourceNode = nodesSnapshot.find((n) => n.id === params.source);
        
        // WHAT: Find the target node (where connection ends)
        // WHY: Need to update this node's connectedData
        // HOW: Array.find() searches for node with matching ID
        const targetNode = nodesSnapshot.find((n) => n.id === params.target);
        
        // WHAT: Exit early if nodes not found
        // WHY: Can't transfer data if nodes don't exist (defensive programming)
        // HOW: Return unchanged nodes array if either node is missing
        if (!sourceNode || !targetNode) {
          return nodesSnapshot; // No changes
        }
        
        // WHAT: Extract data from source node based on its type
        // WHY: Different node types store data in different fields
        // HOW: Switch on node type and extract relevant data
        let connectedContent: string = "";
        let connectedLabel: string | undefined;
        
        // WHAT: Handle Firecrawl node data
        // WHY: Firecrawl nodes have markdown and url fields
        // HOW: Extract markdown as content, url as label
        if (sourceNode.type === "firecrawl") {
          const firecrawlData = sourceNode.data as unknown as FirecrawlNodeData;
          connectedContent = firecrawlData.markdown || "";
          connectedLabel = firecrawlData.url || undefined;
        }
        
        // WHAT: Handle OpenAI node data
        // WHY: OpenAI nodes have response field (AI-generated text)
        // HOW: Extract response as content, model as label
        else if (sourceNode.type === "openai") {
          const openaiData = sourceNode.data as unknown as OpenAINodeData;
          connectedContent = openaiData.response || "";
          connectedLabel = openaiData.model ? `Model: ${openaiData.model}` : undefined;
        }
        
        // WHAT: Handle default nodes or unknown types
        // WHY: Default nodes just have a label field
        // HOW: Use label as content if available
        else {
          const defaultData = sourceNode.data as unknown as DefaultNodeData;
          connectedContent = defaultData.label || "";
          connectedLabel = sourceNode.id;
        }
        
        // WHAT: Skip if no content to transfer
        // WHY: No point adding empty data to target node
        // HOW: Check if content is empty after trimming whitespace
        if (!connectedContent.trim()) {
          return nodesSnapshot; // No changes
        }
        
        // WHAT: Create ConnectedNodeData object
        // WHY: Package source data in structured format
        // HOW: Object with type, content, and optional label
        const connectedData = {
          type: sourceNode.type || "unknown", // Node type (e.g., "firecrawl", "openai")
          content: connectedContent,          // The actual data content
          label: connectedLabel,              // Optional display label (URL, model, etc.)
        };
        
        // ============================================================
        // STEP 3: UPDATE TARGET NODE WITH CONNECTED DATA
        // ============================================================
        
        // WHAT: Map through all nodes and update the target node
        // WHY: Need to immutably update target node's connectedData
        // HOW: map() creates new array, spread operator clones nodes
        return nodesSnapshot.map((node) => {
          // WHAT: Check if this is the target node
          // WHY: Only update the target node, leave others unchanged
          // HOW: Compare node ID with target ID from connection params
          if (node.id === params.target) {
            // WHAT: Get existing connectedData or empty array
            // WHY: Target might already have data from other connections
            // HOW: Access data.connectedData with fallback to empty array
            const existingConnectedData = (node.data as unknown as OpenAINodeData).connectedData || [];
            
            // WHAT: Check if this source is already connected
            // WHY: Prevent duplicate entries if edge already exists
            // HOW: Look for existing entry with same source type and label
            const alreadyConnected = Array.isArray(existingConnectedData) && existingConnectedData.some(
              (item: ConnectedNodeData) =>
                item.type === connectedData.type &&
                item.label === connectedData.label
            );
            
            // WHAT: Add new connected data if not already present
            // WHY: Update target node with source data
            // HOW: Spread operator creates new object with updated data
            return {
              ...node,                                    // Clone node
              data: {
                ...node.data,                            // Clone existing data
                connectedData: alreadyConnected
                  ? existingConnectedData                // No change if already connected
                  : [...(Array.isArray(existingConnectedData) ? existingConnectedData : []), connectedData], // Add new connection
              },
            };
          }
          
          // WHAT: Return unchanged node
          // WHY: Only target node needs updating
          // HOW: Return original node reference (no clone needed)
          return node;
        });
      });
    },
    [], // No dependencies = function never recreates
  );

  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    // WHAT: Full viewport container for the canvas
    // WHY: React Flow needs a sized container (can't be height: auto)
    // HOW: 100vw (full width) × 100vh (full height) fills the entire screen
    <div style={{ width: '100vw', height: '100vh' }}>
      
      {/* ========================================================
          REACT FLOW COMPONENT - The Main Canvas
          ======================================================== */}
      
      {/* WHAT: The main React Flow canvas component */}
      {/* WHY: Renders the interactive workflow canvas */}
      {/* HOW: Pass nodes, edges, handlers, and configuration props */}
      <ReactFlow
        // WHAT: Current array of nodes to render
        // WHY: React Flow renders each node based on this array
        // HOW: Reads nodes state, renders them at specified positions
        nodes={nodes}
        
        // WHAT: Current array of connections to render
        // WHY: React Flow draws lines between connected nodes
        // HOW: Reads edges state, draws lines from source to target handles
        edges={edges}
        
        // WHAT: Mapping of node types to components
        // WHY: Tells React Flow how to render custom node types
        // HOW: When rendering node with type='firecrawl', uses FirecrawlNode component
        nodeTypes={nodeTypes}
        
        // WHAT: Handler for node updates (drag, select, delete, etc.)
        // WHY: Keeps nodes state synchronized with canvas changes
        // HOW: React Flow calls this with changes → we update state
        onNodesChange={onNodesChange}
        
        // WHAT: Handler for edge updates (select, delete, etc.)
        // WHY: Keeps edges state synchronized with canvas changes
        // HOW: React Flow calls this with changes → we update state
        onEdgesChange={onEdgesChange}
        
        // WHAT: Handler for new connections
        // WHY: Adds new edges when user connects nodes
        // HOW: React Flow calls this when user drags from handle to handle
        onConnect={onConnect}
        
        // WHAT: Automatically fits all nodes into view on mount
        // WHY: Ensures users see all nodes without manual zooming
        // HOW: React Flow calculates bounding box and adjusts zoom/pan
        fitView
      >
        {/* ========================================================
            OPTIONAL REACT FLOW UI COMPONENTS
            ======================================================== */}
        
        {/* WHAT: Grid/dot pattern background */}
        {/* WHY: Provides visual reference for alignment and positioning */}
        {/* HOW: Renders a repeating pattern behind all nodes */}
        <Background />
        
        {/* WHAT: Overview map in bottom-right corner */}
        {/* WHY: Shows thumbnail of entire canvas for navigation in large workflows */}
        {/* HOW: Renders miniature version of canvas with viewport indicator */}
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

/**
 * ============================================================
 * OVERALL APPLICATION WORKFLOW
 * ============================================================
 * 
 * INITIALIZATION:
 * 1. Component mounts with initial nodes and edges
 * 2. nodeTypes mapping registered with React Flow
 * 3. Event handlers (memoized) ready for user interaction
 * 4. Canvas renders with fitView (all nodes visible)
 * 
 * USER INTERACTIONS:
 * 
 * A. NODE MANIPULATION:
 *    1. User drags node → onNodesChange called with position change
 *    2. applyNodeChanges updates nodes array immutably
 *    3. React detects state change → re-renders canvas
 *    4. Node appears in new position
 * 
 * B. CREATING CONNECTIONS:
 *    1. User drags from source handle (e.g., Firecrawl output)
 *    2. User drops on target handle (e.g., another node input)
 *    3. onConnect called with connection details
 *    4. addEdge creates new edge object → edges state updated
 *    5. React Flow renders the connection line
 * 
 * C. USING FIRECRAWL NODE:
 *    1. User types URL in Firecrawl node input
 *    2. User clicks "Scrape" button
 *    3. FirecrawlNode component calls API route
 *    4. API route scrapes URL via Firecrawl
 *    5. Markdown returned → displayed in node
 *    6. Data can flow to connected nodes (future enhancement)
 * 
 * STATE FLOW:
 * 
 *   User Action → Event Handler → Apply Changes → Update State → Re-render
 *       ↓              ↓              ↓              ↓              ↓
 *    Drag node   onNodesChange  applyNodeChanges  setNodes    Canvas updates
 *    Connect     onConnect      addEdge           setEdges    Line appears
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. useMemo on nodeTypes: Prevents object recreation → avoids re-renders
 * 2. useCallback on handlers: Prevents function recreation → stable references
 * 3. memo on FirecrawlNode: Prevents unnecessary node re-renders
 * 4. Immutable updates: React detects changes efficiently
 * 
 * FUTURE ENHANCEMENTS:
 * - Add more custom node types (LLM processor, data transformer, etc.)
 * - Implement data flow between nodes (pass markdown via edges)
 * - Add save/load workflow functionality
 * - Add node configuration panel (edit node settings)
 * - Add execution engine (run workflows automatically)
 * - Add validation (check workflow structure before running)
 */