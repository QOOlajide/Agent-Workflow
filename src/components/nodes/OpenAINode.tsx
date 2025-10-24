/**
 * OPENAI CUSTOM NODE - React Flow Node Component
 * 
 * WHAT: A custom React Flow node that generates AI responses using OpenAI's API
 * WHY: Enables users to leverage GPT models directly within the workflow canvas
 * HOW: Displays form with model selector + prompt input → calls API route → shows results
 * 
 * WORKFLOW POSITION: Frontend component that users interact with on the React Flow canvas
 * - Can receive input from other nodes (like Firecrawl for context)
 * - Calls /api/openai/chat endpoint with prompt and model selection
 * - Displays AI-generated response
 * - Can connect to other nodes via handles for further processing
 * 
 * KEY FEATURE: Shows connected data in UI when receiving input from other nodes
 */

// Import React hooks for component state and optimization
// WHAT: Core React hooks for managing component behavior
// WHY: 
//   - memo: Prevents unnecessary re-renders (performance optimization)
//   - useCallback: Memoizes functions to prevent recreation on every render
//   - useState: Manages component state (prompt, model, response, loading, etc.)
//   - useEffect: Runs side effects when dependencies change (update UI when data connects)
// HOW: These work together to create a performant, reactive component
import { memo, useCallback, useState, useEffect } from "react";

// Import React Flow components for node handles and positioning
// WHAT: React Flow utilities for creating connectable nodes
// WHY: 
//   - Handle: Creates connection points on the node (input/output)
//   - Position: Enum for handle placement (Top, Bottom, Left, Right)
// HOW: We'll place a target handle (Top) and source handle (Bottom) for connections
import { Handle, Position } from "@xyflow/react";

// Import shadcn/ui components for consistent, accessible UI
// WHAT: Pre-built, styled components following accessibility best practices
// WHY: Provides professional UI without writing custom CSS/components
// HOW: 
//   - Button: Trigger AI generation, copy response
//   - Card: Container for the entire node
//   - Label: Accessible labels for form inputs
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// Import icons from lucide-react for better visual hierarchy
// WHAT: SVG icons that match the design system
// WHY: Better UX with recognizable visual cues
// HOW: Use icons to represent actions and states (AI, copy, loading, etc.)
import { 
  Brain,           // AI/intelligence icon for header
  Copy,            // Copy icon for copy button
  CheckCircle2,    // Success checkmark
  Loader2,         // Loading spinner
  Sparkles,        // AI generation indicator
  FileText,        // Document/text icon
  Link2,           // Connection/link icon for connected data
} from "lucide-react";

// Import toast hook for user notifications
// WHAT: Hook that provides toast notification functionality
// WHY: Shows success/error messages to users (better UX than alerts)
// HOW: Call toast({ title, description, variant }) to show notifications
import { useToast } from "@/hooks/useToast";

/**
 * TYPE DEFINITION: ConnectedNodeData
 * 
 * WHAT: Defines the structure of data received from connected nodes
 * WHY: Type safety when displaying connected data in the UI
 * HOW: Used in the OpenAINodeData.connectedData field
 * 
 * EXAMPLE:
 * When Firecrawl node connects to OpenAI node, it passes:
 * {
 *   type: 'firecrawl',
 *   content: '# Website Content\n\nMarkdown here...',
 *   label: 'https://example.com'
 * }
 */
type ConnectedNodeData = {
  type: string;           // Type of connected node ('firecrawl', 'openai', etc.)
  content: string;        // The actual data content (markdown, text, etc.)
  label?: string;         // Optional display label (URL, filename, etc.)
};

/**
 * TYPE DEFINITION: OpenAINodeData
 * 
 * WHAT: Defines the shape of data this node works with
 * WHY: Provides type safety for node data and enables TypeScript autocompletion
 * HOW: This type is used when creating nodes in the React Flow canvas
 * 
 * FIELDS:
 * - prompt: The user's input text/question
 * - model: Selected GPT model (gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-pro)
 * - response: AI-generated response text
 * - connectedData: Data from nodes connected to this node's input
 * - loading: Whether API call is in progress
 * - error: Error message if something goes wrong
 */
export type OpenAINodeData = {
  prompt?: string;                          // User's prompt/question
  model?: string;                           // Selected GPT model
  response?: string;                        // AI-generated response
  connectedData?: ConnectedNodeData[];      // Array of connected node data
  loading?: boolean;                        // Loading state
  error?: string;                           // Error message
};

/**
 * TYPE DEFINITION: OpenAINodeProps
 * 
 * WHAT: Props that React Flow automatically passes to custom node components
 * WHY: React Flow injects these props; we need to type them for TypeScript
 * HOW: Extract only the props we use (id and data) from React Flow's NodeProps
 * 
 * NOTE: React Flow provides many more props (position, selected, dragging, etc.)
 *       but we only need id and data for this component
 */
type OpenAINodeProps = {
  id: string;                // Unique identifier for this node instance
  data: OpenAINodeData;      // The data object defined above
};

/**
 * AVAILABLE MODELS
 * 
 * WHAT: Array of available GPT models with their properties
 * WHY: Provides a single source of truth for model options
 * HOW: Used to populate the model selector dropdown
 * 
 * MODELS (from OpenAI documentation):
 * - gpt-5: Standard model (balanced performance/cost)
 * - gpt-5-mini: Smaller, faster, cheaper
 * - gpt-5-nano: Smallest, fastest, cheapest
 * - gpt-5-pro: Largest, most capable, most expensive
 */
const MODELS = [
  { value: "gpt-5", label: "GPT-5", description: "Balanced" },
  { value: "gpt-5-mini", label: "GPT-5 Mini", description: "Fast & Efficient" },
  { value: "gpt-5-nano", label: "GPT-5 Nano", description: "Fastest" },
  { value: "gpt-5-pro", label: "GPT-5 Pro", description: "Most Capable" },
] as const;

/**
 * MAIN COMPONENT: OpenAINodeComponent
 * 
 * WHAT: The main functional component that renders the OpenAI node
 * WHY: Encapsulates all AI generation logic and UI for a single node
 * HOW: Manages state → handles user input → calls API → displays results
 */
function OpenAINodeComponent({ data, id }: OpenAINodeProps) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  // WHAT: State for the prompt textarea
  // WHY: Tracks what the user types; can be pre-populated from data.prompt
  // HOW: Initialized from props (data.prompt) or empty string
  const [prompt, setPrompt] = useState(data.prompt || "");
  
  // WHAT: State for selected model
  // WHY: Tracks which GPT model the user has selected
  // HOW: Initialized from props (data.model) or defaults to "gpt-5"
  const [model, setModel] = useState(data.model || "gpt-5");
  
  // WHAT: State for loading indicator
  // WHY: Shows "Generating..." state and disables controls during API call
  // HOW: Set to true when API call starts, false when it completes
  const [loading, setLoading] = useState(data.loading || false);
  
  // WHAT: State for AI-generated response
  // WHY: Stores the result from OpenAI to display in the preview
  // HOW: Initialized from props (data.response) or empty, updated after generation
  const [response, setResponse] = useState(data.response || "");
  
  // WHAT: State for connected node data
  // WHY: Stores data from nodes connected to this node's input
  // HOW: Initialized from props (data.connectedData) or empty array, updated via props
  const [connectedData, setConnectedData] = useState<ConnectedNodeData[]>(
    data.connectedData || []
  );
  
  // WHAT: State for error messages
  // WHY: Displays error information to user if generation fails
  // HOW: Set when API call fails, cleared on successful generation
  const [error, setError] = useState(data.error || "");
  
  // WHAT: Toast notification hook
  // WHY: Provides a function to show success/error messages
  // HOW: Destructure 'toast' function from useToast hook
  const { toast } = useToast();
  
  // WHAT: State for copy button feedback
  // WHY: Shows "Copied!" feedback when user copies response
  // HOW: Set to true after copy, reset after delay
  const [copied, setCopied] = useState(false);

  // ============================================================
  // SIDE EFFECTS
  // ============================================================
  
  /**
   * EFFECT: Update connected data when props change
   * 
   * WHAT: Syncs local state with data from React Flow (when connections change)
   * WHY: When nodes connect/disconnect, React Flow updates data.connectedData
   * HOW: useEffect watches data.connectedData and updates local state
   * 
   * EXAMPLE FLOW:
   * 1. User connects Firecrawl node to OpenAI node
   * 2. Parent component updates OpenAI node's data.connectedData
   * 3. This effect detects the change and updates local state
   * 4. UI re-renders to show connected data preview
   */
  useEffect(() => {
    // WHAT: Check if connected data has changed
    // WHY: Only update if data actually changed (avoid unnecessary re-renders)
    // HOW: Compare new data with current state
    if (data.connectedData && data.connectedData !== connectedData) {
      // WHAT: Update local state with new connected data
      // WHY: Triggers re-render to show updated connected data in UI
      // HOW: Call setConnectedData with new value from props
      setConnectedData(data.connectedData);
    }
  }, [data.connectedData, connectedData]); // Dependencies: run when these change

  // ============================================================
  // GENERATION HANDLER
  // ============================================================
  
  /**
   * WHAT: Main function that handles the AI generation process
   * WHY: Encapsulates all generation logic in one place
   * HOW: Validates prompt → prepares connected data → calls API → updates state
   * 
   * WRAPPED IN useCallback:
   * - WHAT: Memoizes the function so it doesn't recreate on every render
   * - WHY: Prevents unnecessary re-renders and maintains stable function reference
   * - HOW: Only recreates if dependencies [prompt, model, connectedData, toast] change
   */
  const handleGenerate = useCallback(async () => {
    // ============================================================
    // VALIDATION: Check if prompt is provided
    // ============================================================
    
    // WHAT: Check if the prompt field is empty
    // WHY: Can't generate without a prompt; fail fast with clear error message
    // HOW: If no prompt, show error toast and return early
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive", // Red error style
      });
      return; // Exit function early
    }

    // ============================================================
    // STATE RESET: Prepare for new generation
    // ============================================================
    
    // WHAT: Set loading state to true
    // WHY: Disables button, shows "Generating..." text, prevents double-clicks
    // HOW: React re-renders component with loading=true
    setLoading(true);
    
    // WHAT: Clear previous error and response
    // WHY: Prevents showing stale data from previous generation
    // HOW: Reset error and response to empty strings
    setError("");
    setResponse("");
    
    // ============================================================
    // PREPARE CONNECTED DATA
    // ============================================================
    
    // WHAT: Combine all connected data into a single string
    // WHY: Need to send connected data to API as context for the AI
    // HOW: Map through connectedData array and format each piece
    // 
    // FORMAT:
    // ```
    // [Connected Data from FirecrawlNode: https://example.com]
    // # Website Content
    // Markdown here...
    // 
    // [End of connected data]
    // ```
    const connectedDataString = connectedData
      .map((item) => {
        return `[Connected Data from ${item.type}${item.label ? `: ${item.label}` : ""}]\n${item.content}\n[End of connected data]`;
      })
      .join("\n\n");

    // ============================================================
    // API CALL: Generate AI response
    // ============================================================
    
    try {
      // WHAT: Make POST request to our API route
      // WHY: Calls server-side endpoint that has access to API key
      // HOW: Use fetch API with JSON body containing prompt, model, and connected data
      const apiResponse = await fetch("/api/openai/chat", {
        method: "POST",                          // HTTP POST method
        headers: {
          "Content-Type": "application/json",    // Tell server we're sending JSON
        },
        body: JSON.stringify({                   // Convert object to JSON string
          prompt: prompt,                        // User's prompt
          model: model,                          // Selected model
          connectedData: connectedDataString || undefined, // Connected data (if any)
        }),
      });

      // WHAT: Parse the JSON response from the server
      // WHY: We need to extract the AI-generated text or error message
      // HOW: response.json() returns a promise that resolves to parsed JSON
      const result = await apiResponse.json();

      // WHAT: Check if the request failed (HTTP error or API error)
      // WHY: Need to handle errors gracefully and show user-friendly messages
      // HOW: Check HTTP status (!apiResponse.ok) or API success flag (!result.success)
      if (!apiResponse.ok || !result.success) {
        // WHAT: Throw error with message from API or generic fallback
        // WHY: Jumps to catch block for consistent error handling
        // HOW: Create Error object with message from result.error or fallback
        throw new Error(result.error || "Failed to generate response");
      }

      // ============================================================
      // SUCCESS: Store and display AI response
      // ============================================================
      
      // WHAT: Extract AI response from the API result
      // WHY: This is the main output we want to display
      // HOW: Access result.data.response with fallback to empty string
      const aiResponse = result.data?.response || "";
      
      // WHAT: Update component state with AI response
      // WHY: Triggers re-render to display the result
      // HOW: Call state setter with new value
      setResponse(aiResponse);

      // WHAT: Show success notification
      // WHY: Confirms to user that generation worked
      // HOW: Toast with title indicating success
      toast({
        title: "Success",
        description: `Response generated using ${result.data?.model || model}`,
        // No variant specified = default (green) success style
      });
      
    } catch (error) {
      // ============================================================
      // ERROR HANDLING: Handle API failures
      // ============================================================
      
      // WHAT: Log error to browser console
      // WHY: Helps developers debug issues
      // HOW: console.error with descriptive message and error object
      console.error("Error generating response:", error);
      
      // WHAT: Extract error message
      // WHY: Need to display error to user
      // HOW: If Error object, use its message; otherwise use generic message
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate response";
      
      // WHAT: Store error in state
      // WHY: Display error in node UI
      // HOW: Call setError with error message
      setError(errorMessage);
      
      // WHAT: Show error notification to user
      // WHY: User needs to know generation failed and why
      // HOW: Toast with destructive variant (red styling)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive", // Red error style
      });
      
    } finally {
      // ============================================================
      // CLEANUP: Always runs, success or failure
      // ============================================================
      
      // WHAT: Reset loading state
      // WHY: Re-enables button and removes "Generating..." text
      // HOW: Set loading back to false (always executes, even if error)
      setLoading(false);
    }
  }, [prompt, model, connectedData, toast]); // Dependencies: recreate function only if these change

  // ============================================================
  // RENDER: Component JSX
  // ============================================================
  
  return (
    // WHAT: Card component wraps the entire node
    // WHY: Provides consistent styling, border, shadow, and padding
    // HOW: Tailwind classes define min/max width with dark mode styling
    <Card className="min-w-[450px] max-w-[550px] border-2 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-gradient-to-br from-card via-card to-card/50 dark:from-card dark:via-card dark:to-muted/10">
      
      {/* ========================================================
          INPUT HANDLE (TOP)
          ======================================================== */}
      
      {/* WHAT: Connection handle at the top of the node */}
      {/* WHY: Allows other nodes to connect TO this node (incoming data) */}
      {/* HOW: React Flow renders this as a draggable connection point */}
      <Handle
        type="target"              // This node receives data (target vs source)
        position={Position.Top}    // Place at the top of the node
        id="input"                 // Unique ID for this handle
        className="!bg-purple-500 dark:!bg-purple-400 !border-background"   // Purple color with dark mode variant
      />

      {/* ========================================================
          MAIN CONTENT AREA
          ======================================================== */}
      
      {/* WHAT: Main container for all node content */}
      {/* WHY: Provides consistent padding and spacing */}
      {/* HOW: p-4 = padding 1rem, space-y-4 = vertical spacing between children */}
      <div className="p-4 space-y-4">
        
        {/* ========================================================
            HEADER SECTION
            ======================================================== */}
        
        {/* WHAT: Header with icon and title */}
        {/* WHY: Identifies the node type to the user */}
        {/* HOW: Flexbox layout with icon and text, border-b for separator */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
          {/* WHAT: Icon container with brain/AI icon */}
          {/* WHY: Visual indicator that this node uses AI */}
          {/* HOW: Flex container with gradient background and padding */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 shadow-sm">
            <Brain className="h-4 w-4 text-white" />
          </div>
          
          {/* WHAT: Node title */}
          {/* WHY: Tells user this is an OpenAI node */}
          {/* HOW: Semibold, small font size with improved typography */}
          <h3 className="font-semibold text-sm text-foreground">OpenAI Generator</h3>
        </div>

        {/* ========================================================
            CONNECTED DATA PREVIEW (conditional)
            ======================================================== */}
        
        {/* WHAT: Shows preview of data from connected nodes */}
        {/* WHY: User needs to see what context is being sent to the AI */}
        {/* HOW: Only rendered if connectedData array has items */}
        {connectedData.length > 0 && (
          <div className="space-y-2">
            {/* WHAT: Label for connected data section */}
            {/* WHY: Clarifies what this section shows */}
            {/* HOW: Flex layout with icon and text */}
            <Label className="text-xs font-medium flex items-center gap-1.5 text-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Connected Data ({connectedData.length})
            </Label>
            
            {/* WHAT: Container for connected data previews */}
            {/* WHY: Shows each connected node's data in a card */}
            {/* HOW: Map through connectedData array */}
            <div className="space-y-2">
              {connectedData.map((item, index) => (
                // WHAT: Preview card for each connected node
                // WHY: Provides visual confirmation of what data is connected
                // HOW: Gradient background with truncated content preview
                <div
                  key={index}
                  className="p-2.5 bg-gradient-to-br from-muted/50 to-muted/30 dark:from-muted/40 dark:to-muted/20 rounded-lg border border-border/50 text-xs backdrop-blur-sm"
                >
                  {/* WHAT: Header showing connected node type and label */}
                  {/* WHY: Identifies where the data came from */}
                  {/* HOW: Flex layout with icon */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span className="font-medium text-foreground">
                      {item.type}
                      {item.label && (
                        <span className="text-muted-foreground ml-1">
                          • {item.label}
                        </span>
                      )}
                    </span>
            </div>
            
                  {/* WHAT: Preview of connected data content */}
                  {/* WHY: Shows user what content will be sent to AI */}
                  {/* HOW: Truncated to 100 characters with ellipsis */}
                  <div className="text-muted-foreground line-clamp-2 text-xs">
                    {item.content.slice(0, 100)}
                    {item.content.length > 100 && "..."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            MODEL SELECTOR
            ======================================================== */}
        
        {/* WHAT: Dropdown to select GPT model */}
        {/* WHY: Different models have different capabilities and costs */}
        {/* HOW: Native HTML select element styled with Tailwind */}
        <div className="space-y-2">
          {/* WHAT: Label for model selector */}
          {/* WHY: Accessibility and clarity */}
          {/* HOW: htmlFor connects to select id for click-to-focus */}
          <Label htmlFor={`model-${id}`} className="text-xs font-medium">
            Model:
          </Label>
          
          {/* WHAT: Model selector dropdown */}
          {/* WHY: Allows user to choose which GPT model to use */}
          {/* HOW: Controlled select element with onChange handler */}
          <select
            id={`model-${id}`}                    // Unique ID (multiple nodes might exist)
            value={model}                         // Controlled input: state drives value
            onChange={(e) => setModel(e.target.value)} // Update state on change
            disabled={loading}                    // Disable during generation
            className="nodrag flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {/* WHAT: Map through MODELS array to create options */}
            {/* WHY: Provides all available model choices */}
            {/* HOW: Each model becomes an option element */}
            {MODELS.map((modelOption) => (
              <option key={modelOption.value} value={modelOption.value}>
                {modelOption.label} - {modelOption.description}
              </option>
            ))}
          </select>
        </div>

        {/* ========================================================
            PROMPT INPUT
            ======================================================== */}
        
        {/* WHAT: Textarea for user's prompt/question */}
        {/* WHY: User needs to enter what they want the AI to do */}
        {/* HOW: Controlled textarea with onChange handler */}
        <div className="space-y-2">
          {/* WHAT: Label for prompt textarea */}
          {/* WHY: Accessibility and clarity */}
          {/* HOW: htmlFor connects to textarea id */}
          <Label htmlFor={`prompt-${id}`} className="text-xs font-medium">
            Prompt:
          </Label>
          
          {/* WHAT: Prompt textarea */}
          {/* WHY: Allows multi-line input for complex prompts */}
          {/* HOW: Controlled textarea with onChange handler */}
          <textarea
            id={`prompt-${id}`}                   // Unique ID
            value={prompt}                        // Controlled input: state drives value
            onChange={(e) => setPrompt(e.target.value)} // Update state on change
            disabled={loading}                    // Disable during generation
            placeholder={
              connectedData.length > 0
                ? "Ask a question about the connected data..."
                : "Enter your prompt here..."
            }                                     // Dynamic placeholder based on context
            className="nodrag flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            rows={4}
          />
          
          {/* WHAT: Generate button */}
          {/* WHY: Triggers AI generation */}
          {/* HOW: Calls handleGenerate when clicked */}
          <Button
            onClick={handleGenerate}              // Call our generation function
            disabled={loading || !prompt.trim()} // Disable if loading or no prompt
            size="sm"                            // Small size
            className="w-full gap-1.5 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
          >
            {/* WHAT: Dynamic button content with icon */}
            {/* WHY: Shows current state (loading or ready) */}
            {/* HOW: Conditional rendering based on loading state */}
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate
              </>
            )}
          </Button>
        </div>
        
        {/* ========================================================
            ERROR DISPLAY (conditional)
            ======================================================== */}
        
        {/* WHAT: Shows error message if generation fails */}
        {/* WHY: User needs to know what went wrong */}
        {/* HOW: Only rendered if error state is not empty */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-xs text-destructive">
            {error}
          </div>
        )}

        {/* ========================================================
            RESPONSE DISPLAY (conditional)
            ======================================================== */}
        
        {/* WHAT: Shows AI-generated response */}
        {/* WHY: User needs to see the result */}
        {/* HOW: Only rendered if response state is not empty */}
        {response && (
          <div className="space-y-2">
            {/* WHAT: Header bar with label and copy button */}
            {/* WHY: Shows character count and provides copy functionality */}
            {/* HOW: Flexbox layout with space-between */}
            <div className="flex items-center justify-between">
              {/* WHAT: Label showing character count */}
              {/* WHY: Gives user sense of response length */}
              {/* HOW: Display response.length in parentheses */}
              <Label className="text-xs font-medium flex items-center gap-1.5 text-foreground">
                <FileText className="h-3.5 w-3.5" />
                Response ({response.length} chars)
              </Label>
              
              {/* WHAT: Copy to clipboard button */}
              {/* WHY: Makes it easy to use the response elsewhere */}
              {/* HOW: Uses Clipboard API to copy full response */}
              <Button
                variant="outline"                // Outlined style
                size="sm"                        // Small size
                onClick={() => {
                  // WHAT: Copy response to clipboard
                  // WHY: User needs to use this content elsewhere
                  // HOW: navigator.clipboard API writes to clipboard
                  navigator.clipboard.writeText(response);
                  
                  // WHAT: Show copy feedback
                  // WHY: Visual confirmation for user
                  // HOW: Set copied state to true, reset after 2 seconds
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  
                  // WHAT: Show confirmation toast
                  // WHY: Confirms to user that copy worked
                  // HOW: Success toast notification
                  toast({
                    title: "Copied",
                    description: "Response copied to clipboard",
                  });
                }}
                className="h-7 text-xs gap-1.5"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            
            {/* WHAT: Scrollable response display */}
            {/* WHY: Shows content without making node too large */}
            {/* HOW: Fixed max height with overflow-y-auto for scrolling */}
            <div className="max-h-[250px] overflow-y-auto p-3.5 bg-gradient-to-br from-muted/50 to-muted/30 dark:from-muted/40 dark:to-muted/20 rounded-lg border border-border/50 text-xs whitespace-pre-wrap break-words backdrop-blur-sm scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {/* WHAT: Display full response text */}
              {/* WHY: User needs to read the AI-generated content */}
              {/* HOW: Pre-wrap to preserve formatting, break-words to prevent overflow */}
              <span className="text-foreground/90">{response}</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          OUTPUT HANDLE (BOTTOM)
          ======================================================== */}
      
      {/* WHAT: Connection handle at the bottom of the node */}
      {/* WHY: Allows this node to connect TO other nodes (outgoing data) */}
      {/* HOW: React Flow renders this as a draggable connection point */}
      <Handle
        type="source"              // This node sends data (source vs target)
        position={Position.Bottom} // Place at the bottom of the node
        id="output"                // Unique ID for this handle
        className="!bg-purple-500 dark:!bg-purple-400 !border-background"  // Purple color with dark mode variant
      />
    </Card>
  );
}

/**
 * MEMOIZED EXPORT
 * 
 * WHAT: Wraps the component in React.memo for performance optimization
 * WHY: Prevents unnecessary re-renders when parent re-renders but props haven't changed
 * HOW: React.memo compares props and only re-renders if they've changed
 * 
 * BENEFIT: In a large React Flow canvas with many nodes, this prevents wasted renders
 */
export const OpenAINode = memo(OpenAINodeComponent);

/**
 * ============================================================
 * OVERALL COMPONENT WORKFLOW SUMMARY
 * ============================================================
 * 
 * 1. USER INTERACTION:
 *    - User selects a GPT model from dropdown
 *    - User types prompt in textarea
 *    - User clicks "Generate" button → handleGenerate() called
 * 
 * 2. VALIDATION:
 *    - Check prompt is not empty
 *    - Show error toast and exit if invalid
 * 
 * 3. PREPARE DATA:
 *    - Set loading=true (button shows "Generating...")
 *    - Clear previous error and response
 *    - Format connectedData into string (if any)
 * 
 * 4. API CALL:
 *    - POST to /api/openai/chat with prompt, model, connectedData
 *    - Wait for response
 * 
 * 5. HANDLE RESPONSE:
 *    - Success: Store response → update state → show success toast
 *    - Error: Store error → show error toast
 *    - Finally: Set loading=false (always)
 * 
 * 6. DISPLAY:
 *    - Response section appears with AI-generated text
 *    - Copy button allows copying full response
 *    - Scrollable if response is long
 * 
 * 7. CONNECTED DATA FLOW:
 *    - When another node connects to this node:
 *      a. React Flow creates an edge
 *      b. Parent component detects connection
 *      c. Parent updates this node's data.connectedData
 *      d. useEffect detects change → updates local state
 *      e. UI re-renders to show connected data preview
 *      f. When user clicks Generate, connected data is included in API call
 *      g. AI receives context from connected node + user's prompt
 * 
 * 8. REACT FLOW INTEGRATION:
 *    - Top handle (purple) = input connection point
 *    - Bottom handle (purple) = output connection point
 *    - Node can be dragged, selected, connected to other nodes
 *    - memo() prevents unnecessary re-renders
 * 
 * EXAMPLE WORKFLOW: Firecrawl → OpenAI
 * 1. User creates Firecrawl node, scrapes website → gets markdown
 * 2. User creates OpenAI node
 * 3. User connects Firecrawl output to OpenAI input
 * 4. OpenAI node shows "Connected Data" preview with markdown snippet
 * 5. User enters prompt: "Summarize this article in 3 bullet points"
 * 6. User clicks Generate
 * 7. API receives: connectedData (full article markdown) + prompt
 * 8. AI reads article and generates summary
 * 9. Summary appears in OpenAI node
 * 10. User can copy summary or connect to another node for further processing
 * 
 * FUTURE ENHANCEMENT IDEAS:
 * - Add temperature/max_tokens controls
 * - Show token usage and estimated cost
 * - Save conversation history
 * - Support for image inputs (multimodal)
 * - Export response to file
 * - Stream responses (show text as it's generated)
 */

