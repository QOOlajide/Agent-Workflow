# Zustand Data Flow Implementation

## Overview

The React Flow nodes now use **Zustand** for global state management and data transfer between nodes, following the cursor rules for this project.

## Architecture

### Store Location
`src/store/flow-store.ts`

### Key Concepts

1. **Node Outputs**: Each node stores its output data in the Zustand store
2. **Connections**: The store tracks which nodes are connected
3. **Automatic Data Flow**: Target nodes automatically receive data from connected source nodes

## How It Works

### 1. FirecrawlNode (Source Node)

When a Firecrawl node successfully scrapes a website:

```typescript
// After scraping completes
setNodeOutput(id, {
  nodeId: id,
  nodeType: 'firecrawl',
  content: scrapedMarkdown,
  label: url,
  metadata: {
    url: url,
    statusCode: statusCode,
    timestamp: Date.now(),
  },
})
```

**What happens:**
- The scraped markdown is stored in the global Zustand store
- Any connected nodes can now access this data
- The data includes metadata like URL and timestamp

### 2. Connection Management (page.tsx)

When a user connects two nodes:

```typescript
const onConnect = (params: Connection) => {
  // 1. Create visual edge
  setEdges((eds) => addEdge(params, eds))
  
  // 2. Register connection in Zustand
  addConnection({
    sourceNodeId: params.source,
    targetNodeId: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
  })
}
```

**What happens:**
- React Flow shows the visual connection line
- Zustand store registers the relationship between nodes
- No manual data passing needed!

### 3. OpenAINode (Target Node)

The OpenAI node automatically receives data from connected nodes:

```typescript
// Get all data from connected source nodes
const getConnectedInputs = useFlowStore((state) => state.getConnectedInputs)
const connectedData = getConnectedInputs(id)

// connectedData is now an array of NodeOutputData
// Example:
// [
//   {
//     nodeId: 'firecrawl-1',
//     nodeType: 'firecrawl',
//     content: '# Website Content\n\nMarkdown here...',
//     label: 'https://example.com',
//     metadata: { url: '...', timestamp: ... }
//   }
// ]
```

**What happens:**
- The node queries Zustand for all connected inputs
- Gets real-time updates when source data changes
- Automatically displays connected data in the UI

### 4. Using Connected Data

When generating AI response, the OpenAI node formats connected data:

```typescript
const connectedDataString = connectedData
  .map((item) => {
    return `[Connected Data from ${item.nodeType}: ${item.label}]\n${item.content}\n[End of connected data]`
  })
  .join('\n\n')

// Send to API with prompt
await fetch('/api/openai/chat', {
  body: JSON.stringify({
    prompt: prompt,
    model: model,
    connectedData: connectedDataString,
  }),
})
```

## Data Flow Diagram

```
┌─────────────────┐
│ Firecrawl Node  │
│  (scrapes URL)  │
└────────┬────────┘
         │ setNodeOutput()
         ▼
┌─────────────────────────┐
│   Zustand Flow Store    │
│  • nodeOutputs Map      │
│  • connections Array    │
└────────┬────────────────┘
         │ getConnectedInputs()
         ▼
┌─────────────────┐
│  OpenAI Node    │
│ (generates AI)  │
└─────────────────┘
```

## Example Workflow

### Scrape Website → AI Summary

1. **User scrapes a website with Firecrawl node**
   - Firecrawl node calls `setNodeOutput()` with markdown
   - Data is stored in Zustand

2. **User connects Firecrawl to OpenAI**
   - User drags from Firecrawl output to OpenAI input
   - `onConnect()` calls `addConnection()` in Zustand
   - Connection is registered

3. **OpenAI node shows connected data**
   - OpenAI calls `getConnectedInputs()` 
   - Receives array with Firecrawl output
   - Displays preview in "Connected Data" section

4. **User generates AI summary**
   - User enters prompt: "Summarize this article"
   - OpenAI formats connected data as context
   - Sends prompt + context to API
   - AI reads article and generates summary

5. **Chain continues**
   - OpenAI node stores response with `setNodeOutput()`
   - Can connect to another node for further processing

## Store API Reference

### Actions

#### `setNodeOutput(nodeId: string, data: NodeOutputData)`
Store or update a node's output data.

**Example:**
```typescript
const setNodeOutput = useFlowStore((state) => state.setNodeOutput)

setNodeOutput('firecrawl-1', {
  nodeId: 'firecrawl-1',
  nodeType: 'firecrawl',
  content: markdown,
  label: url,
})
```

#### `getConnectedInputs(nodeId: string): NodeOutputData[]`
Get all output data from nodes connected to this node's input.

**Example:**
```typescript
const getConnectedInputs = useFlowStore((state) => state.getConnectedInputs)
const inputs = getConnectedInputs('openai-1')
// Returns array of NodeOutputData from all connected source nodes
```

#### `addConnection(connection: FlowConnection)`
Register a new connection between nodes.

**Example:**
```typescript
const addConnection = useFlowStore((state) => state.addConnection)

addConnection({
  sourceNodeId: 'firecrawl-1',
  targetNodeId: 'openai-1',
  sourceHandle: 'output',
  targetHandle: 'input',
})
```

#### `removeConnection(sourceNodeId: string, targetNodeId: string)`
Remove a connection (called when user deletes edge).

#### `clearNode(nodeId: string)`
Remove all data and connections for a node (called when node is deleted).

## Benefits of Zustand Approach

### 1. **Centralized State**
- Single source of truth for node data
- Easy to debug and track data flow
- No prop drilling through React Flow

### 2. **Type Safety**
- Full TypeScript support
- Autocomplete for all actions
- Compile-time error checking

### 3. **Performance**
- Only re-renders components that use changed data
- No unnecessary re-renders of unaffected nodes
- Efficient subscription model

### 4. **Scalability**
- Easy to add new node types
- Simple to extend with new features
- Clean separation of concerns

### 5. **Automatic Updates**
- Target nodes automatically see source updates
- Real-time data synchronization
- No manual event handling needed

## Adding New Node Types

To add a new node type with data transfer:

### 1. In your new node component:

```typescript
import { useFlowStore } from '@/store/flow-store'

function MyCustomNode({ id }: NodeProps) {
  // Get connected inputs (if your node receives data)
  const getConnectedInputs = useFlowStore((state) => state.getConnectedInputs)
  const connectedData = getConnectedInputs(id)
  
  // Set output (when your node produces data)
  const setNodeOutput = useFlowStore((state) => state.setNodeOutput)
  
  const handleProcess = async () => {
    const result = await processData(connectedData)
    
    // Store output for connected nodes
    setNodeOutput(id, {
      nodeId: id,
      nodeType: 'myCustomType',
      content: result,
      label: 'Processed Result',
    })
  }
  
  return (
    <Card>
      <Handle type="target" position={Position.Top} />
      {/* Your node UI */}
      <Handle type="source" position={Position.Bottom} />
    </Card>
  )
}
```

### 2. Register in page.tsx:

```typescript
import { MyCustomNode } from '@/components/nodes/MyCustomNode'

const nodeTypes = useMemo(
  () => ({
    firecrawl: FirecrawlNode,
    openai: OpenAINode,
    myCustomType: MyCustomNode,  // Add your node
  }),
  []
)
```

That's it! Your node now has full data transfer capabilities.

## Troubleshooting

### Data not appearing in target node?

1. **Check if source node is calling `setNodeOutput()`**
   - Verify the source node stores data after processing
   - Check browser console for any errors

2. **Verify connection exists**
   - Look at the Zustand store in React DevTools
   - Check `connections` array has the edge

3. **Ensure content is not empty**
   - `getConnectedInputs()` filters out empty content
   - Verify source node has actual data to send

### Connected data preview not updating?

- Zustand automatically triggers re-renders
- If using selector, make sure it's not memoized incorrectly
- Try using the simpler form: `useFlowStore((state) => state.getConnectedInputs)(id)`

## Testing

The implementation includes:
- ✅ Type-safe data structures
- ✅ Automatic cleanup on node/edge deletion
- ✅ Duplicate connection prevention
- ✅ Real-time data synchronization
- ✅ No linter errors
- ✅ Successful production build

## Further Reading

- [Zustand Documentation](https://docs.pmnd.rs/zustand/)
- [React Flow Documentation](https://reactflow.dev/)
- See `src/store/flow-store.ts` for full store implementation
- See cursor rules in `cursorRules.txt` for coding standards

