/**
 * FIRECRAWL CUSTOM NODE - React Flow Node Component
 * 
 * WHAT: A custom React Flow node that scrapes web pages using the Firecrawl API
 * WHY: Enables users to extract web content as markdown directly within the workflow canvas
 * HOW: Displays a form with URL input → calls API route → shows results in node
 * 
 * WORKFLOW POSITION: Frontend component that users interact with on the React Flow canvas
 * - Receives user input (URL)
 * - Calls /api/firecrawl/scrape endpoint
 * - Displays scraped markdown and metadata
 * - Can connect to other nodes via handles
 */

// Import React hooks for component state and optimization
// WHAT: Core React hooks for managing component behavior
// WHY: 
//   - memo: Prevents unnecessary re-renders (performance)
//   - useCallback: Memoizes functions to prevent recreation on every render
//   - useState: Manages component state (URL, markdown, loading, etc.)
// HOW: These work together to create a performant, reactive component
import { memo, useCallback, useState } from "react";

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
//   - Button: Trigger scraping, copy markdown
//   - Input: URL entry field
//   - Card: Container for the entire node
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Import icons from lucide-react for better visual hierarchy
// WHAT: SVG icons that match the design system
// WHY: Better UX with recognizable visual cues
// HOW: Use icons to represent actions and states (scrape, copy, etc.)
import { Globe, Copy, CheckCircle2, Loader2, FileText } from "lucide-react";

// Import toast hook for user notifications
// WHAT: Hook that provides toast notification functionality
// WHY: Shows success/error messages to users (better UX than alerts)
// HOW: Call toast({ title, description, variant }) to show notifications
import { useToast } from "@/hooks/useToast";

// Import Zustand store for data flow management
// WHAT: Global state store for managing data transfer between nodes
// WHY: Following cursor rules to use Zustand for state management
// HOW: Use setNodeOutput to store scraped data for connected nodes
import { useFlowStore } from "@/store/flow-store";

/**
 * TYPE DEFINITION: FirecrawlNodeData
 * 
 * WHAT: Defines the shape of data this node works with
 * WHY: Provides type safety for node data and enables TypeScript autocompletion
 * HOW: This type is used when creating nodes in the React Flow canvas
 * 
 * FIELDS:
 * - url: The URL to scrape (optional, can be pre-populated or entered by user)
 * - markdown: The scraped markdown content (populated after scraping)
 * - html: The scraped HTML content (optional, not currently displayed)
 * - metadata: Information about the scraped page (title, description, etc.)
 */
export type FirecrawlNodeData = {
  url?: string;          // Optional initial URL
  markdown?: string;     // Scraped content in markdown format
  html?: string;         // Scraped content in HTML format
  metadata?: {
    title?: string;      // Page title from <title> tag or Open Graph
    description?: string; // Page description from meta tags
    sourceURL?: string;   // The actual URL that was scraped (may differ due to redirects)
    statusCode?: number;  // HTTP status code (200 = success, 404 = not found, etc.)
  };
};

/**
 * TYPE DEFINITION: FirecrawlNodeProps
 * 
 * WHAT: Props that React Flow automatically passes to custom node components
 * WHY: React Flow injects these props; we need to type them for TypeScript
 * HOW: Extract only the props we use (id and data) from React Flow's NodeProps
 * 
 * NOTE: React Flow provides many more props (position, selected, dragging, etc.)
 *       but we only need id and data for this component
 */
type FirecrawlNodeProps = {
  id: string;              // Unique identifier for this node instance
  data: FirecrawlNodeData; // The data object defined above
};

/**
 * MAIN COMPONENT: FirecrawlNodeComponent
 * 
 * WHAT: The main functional component that renders the Firecrawl node
 * WHY: Encapsulates all scraping logic and UI for a single node
 * HOW: Manages state → handles user input → calls API → displays results
 */
function FirecrawlNodeComponent({ data, id }: FirecrawlNodeProps) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  // WHAT: State for the URL input field
  // WHY: Tracks what the user types; can be pre-populated from data.url
  // HOW: Initialized from props (data.url) or empty string
  const [url, setUrl] = useState(data.url || "");
  
  // WHAT: State for loading indicator
  // WHY: Shows "Scraping..." button text and disables controls during API call
  // HOW: Set to true when API call starts, false when it completes
  const [loading, setLoading] = useState(false);
  
  // WHAT: State for scraped markdown content
  // WHY: Stores the result from Firecrawl to display in the preview
  // HOW: Initialized from props (data.markdown) or empty, updated after scraping
  const [markdown, setMarkdown] = useState(data.markdown || "");
  
  // WHAT: State for page metadata (title, description, etc.)
  // WHY: Displays page info above the markdown preview
  // HOW: Initialized from props (data.metadata) or undefined, updated after scraping
  const [metadata, setMetadata] = useState(data.metadata);
  
  // WHAT: Toast notification hook
  // WHY: Provides a function to show success/error messages
  // HOW: Destructure 'toast' function from useToast hook
  const { toast } = useToast();
  
  // WHAT: State for copy button feedback
  // WHY: Shows "Copied!" feedback when user copies markdown
  // HOW: Set to true after copy, reset after delay
  const [copied, setCopied] = useState(false);

  // WHAT: Zustand store action for setting node output
  // WHY: Store scraped data so connected nodes can access it
  // HOW: Call setNodeOutput with node data after successful scrape
  const setNodeOutput = useFlowStore((state) => state.setNodeOutput);

  // ============================================================
  // SCRAPING HANDLER
  // ============================================================
  
  /**
   * WHAT: Main function that handles the scraping process
   * WHY: Encapsulates all scraping logic in one place
   * HOW: Validates URL → calls API → updates state → shows notification
   * 
   * WRAPPED IN useCallback:
   * - WHAT: Memoizes the function so it doesn't recreate on every render
   * - WHY: Prevents unnecessary re-renders and maintains stable function reference
   * - HOW: Only recreates if dependencies [url, toast] change
   */
  const handleScrape = useCallback(async () => {
    // ============================================================
    // VALIDATION: Check if URL is provided
    // ============================================================
    
    // WHAT: Check if the URL field is empty
    // WHY: Can't scrape without a URL; fail fast with clear error message
    // HOW: If no URL, show error toast and return early
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive", // Red error style
      });
      return; // Exit function early
    }

    // ============================================================
    // VALIDATION: Check if URL format is valid
    // ============================================================
    
    // WHAT: Validate URL format using the built-in URL constructor
    // WHY: Catches malformed URLs before making API call (saves API credits)
    // HOW: URL constructor throws error if URL is invalid; we catch it
    try {
      new URL(url); // Throws error if URL is invalid
    } catch {
      // WHAT: Show error toast if URL format is invalid
      // WHY: Provides immediate feedback without round-trip to server
      // HOW: Toast with error variant (red styling)
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return; // Exit function early
    }

    // ============================================================
    // STATE RESET: Prepare for new scraping operation
    // ============================================================
    
    // WHAT: Set loading state to true
    // WHY: Disables button, shows "Scraping..." text, prevents double-clicks
    // HOW: React re-renders component with loading=true
    setLoading(true);
    
    // WHAT: Clear previous results
    // WHY: Prevents showing stale data from previous scrape
    // HOW: Reset markdown and metadata to empty/undefined
    setMarkdown("");
    setMetadata(undefined);

    // ============================================================
    // API CALL: Scrape the URL
    // ============================================================
    
    try {
      // WHAT: Make POST request to our API route
      // WHY: Calls server-side endpoint that has access to API key
      // HOW: Use fetch API with JSON body containing the URL
      const response = await fetch("/api/firecrawl/scrape", {
        method: "POST",                          // HTTP POST method
        headers: {
          "Content-Type": "application/json",    // Tell server we're sending JSON
        },
        body: JSON.stringify({ url }),           // Convert { url: "..." } to JSON string
      });

      // WHAT: Parse the JSON response from the server
      // WHY: We need to extract the scraped data or error message
      // HOW: response.json() returns a promise that resolves to parsed JSON
      const result = await response.json();

      // WHAT: Check if the request failed (HTTP error or API error)
      // WHY: Need to handle errors gracefully and show user-friendly messages
      // HOW: Check HTTP status (!response.ok) or API success flag (!result.success)
      if (!response.ok || !result.success) {
        // WHAT: Throw error with message from API or generic fallback
        // WHY: Jumps to catch block for consistent error handling
        // HOW: Create Error object with message from result.error or fallback
        throw new Error(result.error || "Failed to scrape URL");
      }

      // ============================================================
      // SUCCESS: Extract and store scraped data
      // ============================================================
      
      // WHAT: Extract markdown from the API response
      // WHY: This is the main content we want to display
      // HOW: Access result.data.markdown with fallback to empty string
      const scrapedMarkdown = result.data?.markdown || "";
      
      // WHAT: Extract metadata from the API response
      // WHY: Shows user what page was scraped (title, description, etc.)
      // HOW: Access result.data.metadata (may be undefined)
      const scrapedMetadata = result.data?.metadata;

      // WHAT: Update component state with scraped data
      // WHY: Triggers re-render to display the results
      // HOW: Call state setters with new values
      setMarkdown(scrapedMarkdown);
      setMetadata(scrapedMetadata);

      // ============================================================
      // ZUSTAND: Store output data for connected nodes
      // ============================================================
      
      // WHAT: Store scraped data in Zustand store
      // WHY: Connected nodes (like OpenAI) can access this data
      // HOW: Call setNodeOutput with structured data
      setNodeOutput(id, {
        nodeId: id,
        nodeType: 'firecrawl',
        content: scrapedMarkdown,
        label: scrapedMetadata?.title || url,
        metadata: {
          url: url,
          statusCode: scrapedMetadata?.statusCode,
          timestamp: Date.now(),
        },
      });

      // WHAT: Show success notification
      // WHY: Confirms to user that scraping worked
      // HOW: Toast with title from metadata (if available) or URL
      toast({
        title: "Success",
        description: `Successfully scraped: ${scrapedMetadata?.title || url}`,
        // No variant specified = default (green) success style
      });
      
    } catch (error) {
      // ============================================================
      // ERROR HANDLING: Handle API failures
      // ============================================================
      
      // WHAT: Log error to browser console
      // WHY: Helps developers debug issues
      // HOW: console.error with descriptive message and error object
      console.error("Error scraping URL:", error);
      
      // WHAT: Show error notification to user
      // WHY: User needs to know scraping failed and why
      // HOW: Extract error message if Error object, otherwise use generic message
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to scrape URL",
        variant: "destructive", // Red error style
      });
      
    } finally {
      // ============================================================
      // CLEANUP: Always runs, success or failure
      // ============================================================
      
      // WHAT: Reset loading state
      // WHY: Re-enables button and removes "Scraping..." text
      // HOW: Set loading back to false (always executes, even if error)
      setLoading(false);
    }
  }, [url, toast, id, setNodeOutput]); // Dependencies: recreate function only if these change

  // ============================================================
  // RENDER: Component JSX
  // ============================================================
  
  return (
    // WHAT: Card component wraps the entire node
    // WHY: Provides consistent styling, border, shadow, and padding
    // HOW: Tailwind classes define min/max width with improved dark mode styling
    <Card className="min-w-[400px] max-w-[500px] border-2 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-gradient-to-br from-card via-card to-card/50 dark:from-card dark:via-card dark:to-muted/10">
      
      {/* ========================================================
          INPUT HANDLE (TOP)
          ======================================================== */}
      
      {/* WHAT: Connection handle at the top of the node */}
      {/* WHY: Allows other nodes to connect TO this node (incoming data) */}
      {/* HOW: React Flow renders this as a draggable connection point */}
      <Handle
        type="target"              // This node receives data (target vs source)
        position={Position.Top}    // Place at the top of the node
        id="input"                 // Unique ID for this handle (can have multiple handles)
        className="!bg-blue-500 dark:!bg-blue-400 !border-background"   // Blue color with dark mode variant
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
          {/* WHAT: Icon container with globe icon */}
          {/* WHY: Visual indicator that this node scrapes web content */}
          {/* HOW: Flex container with gradient background and padding */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 shadow-sm">
            <Globe className="h-4 w-4 text-white" />
          </div>
          
          {/* WHAT: Node title */}
          {/* WHY: Tells user this is a Firecrawl scraper node */}
          {/* HOW: Semibold, small font size with improved typography */}
          <h3 className="font-semibold text-sm text-foreground">Firecrawl Scraper</h3>
        </div>

        {/* ========================================================
            URL INPUT SECTION
            ======================================================== */}
        
        {/* WHAT: Container for label and input field */}
        {/* WHY: Groups related form elements */}
        {/* HOW: Vertical spacing with space-y-2 */}
        <div className="space-y-2">
          {/* WHAT: Label for the URL input */}
          {/* WHY: Accessibility (screen readers) and clarity */}
          {/* HOW: htmlFor connects to input id for click-to-focus */}
          <label htmlFor={`url-${id}`} className="text-xs font-medium">
            URL to scrape:
          </label>
          
          {/* WHAT: Horizontal container for input and button */}
          {/* WHY: Places input and button side-by-side */}
          {/* HOW: Flexbox with gap-2 (0.5rem spacing) */}
          <div className="flex gap-2">
            {/* WHAT: URL input field */}
            {/* WHY: User enters the URL they want to scrape */}
            {/* HOW: Controlled input (value={url}) with onChange handler */}
            <Input
              id={`url-${id}`}                    // Unique ID (multiple nodes might exist)
              type="url"                           // HTML5 URL input type (mobile keyboard optimization)
              placeholder="https://example.com"    // Hint text when empty
              value={url}                          // Controlled input: state drives value
              onChange={(e) => setUrl(e.target.value)} // Update state on every keystroke
              disabled={loading}                   // Disable during scraping
              className="nodrag text-sm"           // nodrag = prevent dragging node when typing
              onKeyDown={(e) => {
                // WHAT: Handle Enter key press
                // WHY: Allows user to press Enter instead of clicking button
                // HOW: Check if Enter key pressed and not loading, then trigger scrape
                if (e.key === "Enter" && !loading) {
                  handleScrape();
                }
              }}
            />
            
            {/* WHAT: Scrape button */}
            {/* WHY: Triggers the scraping process */}
            {/* HOW: Calls handleScrape when clicked */}
            <Button
              onClick={handleScrape}              // Call our scraping function
              disabled={loading || !url}          // Disable if loading or no URL
              size="sm"                           // Small size to fit in node
              className="shrink-0 gap-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"                // Don't shrink if space is tight
            >
              {/* WHAT: Dynamic button content with icon */}
              {/* WHY: Shows current state (loading or ready) */}
              {/* HOW: Conditional rendering based on loading state */}
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5" />
                  Scrape
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ========================================================
            METADATA DISPLAY (conditional)
            ======================================================== */}
        
        {/* WHAT: Shows page metadata after successful scrape */}
        {/* WHY: Gives user context about what was scraped */}
        {/* HOW: Conditionally rendered only if metadata exists */}
        {metadata && (
          <div className="space-y-2 p-3.5 bg-gradient-to-br from-muted/50 to-muted/30 dark:from-muted/40 dark:to-muted/20 rounded-lg border border-border/50 text-xs backdrop-blur-sm">
            {/* WHAT: Page title */}
            {/* WHY: Main identifier for the scraped page */}
            {/* HOW: Larger, bold text from metadata.title */}
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div className="font-semibold text-sm text-foreground leading-tight">{metadata.title}</div>
            </div>
            
            {/* WHAT: Page description (if available) */}
            {/* WHY: Provides more context about the page */}
            {/* HOW: Conditional render, line-clamp-2 limits to 2 lines */}
            {metadata.description && (
              <div className="text-muted-foreground line-clamp-2 text-xs pl-6">
                {metadata.description}
              </div>
            )}
            
            {/* WHAT: HTTP status code (if available) */}
            {/* WHY: Confirms successful scraping (200) or shows issues */}
            {/* HOW: Conditional render showing status number */}
            {metadata.statusCode && (
              <div className="text-xs text-muted-foreground pl-6">
                Status: <span className="font-medium text-foreground">{metadata.statusCode}</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            MARKDOWN PREVIEW (conditional)
            ======================================================== */}
        
        {/* WHAT: Shows scraped markdown content */}
        {/* WHY: User needs to see the result of scraping */}
        {/* HOW: Conditionally rendered only if markdown exists */}
        {markdown && (
          <div className="space-y-2">
            {/* WHAT: Header bar with label and copy button */}
            {/* WHY: Shows character count and provides copy functionality */}
            {/* HOW: Flexbox layout with space-between */}
            <div className="flex items-center justify-between">
            {/* WHAT: Label showing character count */}
            {/* WHY: Gives user sense of content length */}
            {/* HOW: Display markdown.length in parentheses */}
            <label className="text-xs font-medium flex items-center gap-1.5 text-foreground">
              <FileText className="h-3.5 w-3.5" />
              Markdown Content ({markdown.length} chars)
            </label>
              
              {/* WHAT: Copy to clipboard button */}
              {/* WHY: Makes it easy to use the markdown elsewhere */}
              {/* HOW: Uses Clipboard API to copy full markdown */}
              <Button
                variant="outline"                // Outlined style (not filled)
                size="sm"                        // Small size
                onClick={() => {
                  // WHAT: Copy markdown to clipboard
                  // WHY: User needs to use this content elsewhere
                  // HOW: navigator.clipboard API writes to clipboard
                  navigator.clipboard.writeText(markdown);
                  
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
                    description: "Markdown copied to clipboard",
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
            
            {/* WHAT: Scrollable markdown preview */}
            {/* WHY: Shows content without making node too large */}
            {/* HOW: Fixed max height with overflow-y-auto for scrolling */}
            <div className="max-h-[200px] overflow-y-auto p-3.5 bg-gradient-to-br from-muted/50 to-muted/30 dark:from-muted/40 dark:to-muted/20 rounded-lg border border-border/50 text-xs font-mono whitespace-pre-wrap break-words backdrop-blur-sm scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {/* WHAT: Show first 500 characters of markdown */}
              {/* WHY: Preview is enough; prevents huge node sizes */}
              {/* HOW: slice(0, 500) takes first 500 characters */}
              <span className="text-foreground/90">{markdown.slice(0, 500)}</span>
              
              {/* WHAT: Ellipsis if content is longer than 500 chars */}
              {/* WHY: Indicates there's more content (use Copy to get full) */}
              {/* HOW: Conditional render if length > 500 */}
              {markdown.length > 500 && <span className="text-muted-foreground">...</span>}
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
        className="!bg-green-500 dark:!bg-green-400 !border-background"  // Green color (success/output indicator) with dark mode variant
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
export const FirecrawlNode = memo(FirecrawlNodeComponent);

/**
 * ============================================================
 * OVERALL COMPONENT WORKFLOW SUMMARY
 * ============================================================
 * 
 * 1. USER INTERACTION:
 *    - User types URL in input field → url state updates
 *    - User clicks "Scrape" or presses Enter → handleScrape() called
 * 
 * 2. VALIDATION:
 *    - Check URL is not empty
 *    - Validate URL format with URL constructor
 *    - Show error toast and exit if invalid
 * 
 * 3. API CALL:
 *    - Set loading=true (button shows "Scraping...")
 *    - Clear previous results (markdown, metadata)
 *    - POST to /api/firecrawl/scrape with URL
 *    - Wait for response
 * 
 * 4. HANDLE RESPONSE:
 *    - Success: Extract markdown and metadata → update state → show success toast
 *    - Error: Show error toast with message
 *    - Finally: Set loading=false (always)
 * 
 * 5. DISPLAY:
 *    - Metadata section appears with title, description, status
 *    - Markdown preview shows first 500 chars
 *    - Copy button allows copying full markdown
 * 
 * 6. REACT FLOW INTEGRATION:
 *    - Top handle (blue) = input connection point
 *    - Bottom handle (green) = output connection point
 *    - Node can be dragged, selected, connected to other nodes
 *    - memo() prevents unnecessary re-renders
 * 
 * FUTURE ENHANCEMENT IDEAS:
 * - Pass scraped data to connected nodes via edges
 * - Show HTML preview option
 * - Allow configuring Firecrawl options (onlyMainContent, waitFor, etc.)
 * - Save scraping history
 * - Export markdown to file
 */
