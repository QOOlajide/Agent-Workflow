/**
 * FIRECRAWL API ROUTE - Server-Side Web Scraping Endpoint
 * 
 * WHAT: This is a Next.js API route that handles web scraping requests using Firecrawl
 * WHY: We need a server-side endpoint to keep the Firecrawl API key secure (never exposed to browser)
 * HOW: Receives URL from client → validates input → calls Firecrawl API → returns scraped content
 * 
 * WORKFLOW POSITION: Acts as a secure bridge between the React Flow frontend and Firecrawl service
 */

// Import Next.js request/response handlers for API routes
// WHAT: NextRequest/NextResponse provide typed request/response objects for Next.js API routes
// WHY: Gives us type safety and modern web APIs (like request.json())
// HOW: Used to handle incoming POST requests and send JSON responses
import { NextRequest, NextResponse } from "next/server";

// Import the Firecrawl SDK client
// WHAT: Official Firecrawl JavaScript SDK for making API calls
// WHY: Provides a clean interface to interact with Firecrawl's scraping service
// HOW: We'll instantiate this with our API key to make scraping requests
import Firecrawl from "@mendable/firecrawl-js";

// Import validated environment variables
// WHAT: Our centralized configuration that includes the validated FIRECRAWL_API_KEY
// WHY: Ensures API key exists and is valid before the app starts
// HOW: Loaded from .env.local and validated by Zod schema in env.ts
import { env } from "@/config/env";

// Import logging utility
// WHAT: Custom logger for structured logging throughout the application
// WHY: Helps with debugging and monitoring API requests/errors in production
// HOW: Logs important events like scrape requests, successes, and failures
import { Logger } from "@/utils/logger";

// Import Zod for runtime validation
// WHAT: TypeScript-first schema validation library
// WHY: Validates incoming request data at runtime (TypeScript only validates at compile time)
// HOW: We'll create a schema to validate the URL format before scraping
import { z } from "zod";

// Initialize logger with a descriptive namespace
// WHAT: Creates a logger instance for this specific API route
// WHY: The namespace "API:Firecrawl:Scrape" helps identify log sources in production
// HOW: Used throughout this file to log events: logger.info(), logger.error()
const logger = new Logger("API:Firecrawl:Scrape");

/**
 * REQUEST VALIDATION SCHEMA
 * 
 * WHAT: Zod schema defining the expected shape of incoming requests
 * WHY: Prevents malformed/malicious requests from reaching the Firecrawl API
 * HOW: Validates that the request body contains a valid URL string
 * 
 * Example valid input: { url: "https://example.com" }
 * Example invalid input: { url: "not-a-url" } → rejected with error message
 */
const scrapeRequestSchema = z.object({
  // WHAT: Expects a 'url' field that must be a valid URL string
  // WHY: Firecrawl needs a valid URL; this catches errors before making the API call
  // HOW: z.string() ensures it's a string, .url() validates URL format (protocol, domain, etc.)
  url: z.string().url("Invalid URL format"),
});

/**
 * POST ENDPOINT HANDLER
 * 
 * WHAT: Handles POST requests to /api/firecrawl/scrape
 * WHY: Provides a secure, server-side endpoint for scraping (client can't see API key)
 * HOW: Validates request → calls Firecrawl → returns result or error
 * 
 * SECURITY: API key never exposed to browser, all scraping happens server-side
 */
export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // STEP 1: PARSE AND VALIDATE REQUEST
    // ============================================================
    
    // WHAT: Parse the JSON body from the incoming request
    // WHY: We need to extract the URL the user wants to scrape
    // HOW: request.json() reads the request body and parses it as JSON
    const body = await request.json();
    
    // WHAT: Validate the request body against our schema
    // WHY: Ensures we have a valid URL before proceeding (fail fast)
    // HOW: safeParse() validates without throwing errors; returns { success, data } or { success, error }
    const validationResult = scrapeRequestSchema.safeParse(body);

    // WHAT: Check if validation failed
    // WHY: Invalid URLs would waste API credits and cause errors
    // HOW: If validation failed, log the error and return a 400 Bad Request response
    if (!validationResult.success) {
      // Log the validation error for debugging
      // WHAT: Record the validation failure in our logs
      // WHY: Helps track malformed requests and potential issues
      // HOW: Logger records the errors with context for investigation
      logger.error("Invalid request body", {
        errors: validationResult.error.errors,
      });
      
      // Return a clear error response to the client
      // WHAT: Send a 400 Bad Request response with error details
      // WHY: Informs the frontend what went wrong so it can show user-friendly messages
      // HOW: NextResponse.json() creates a JSON response; status 400 indicates client error
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validationResult.error.errors, // Specific validation errors (e.g., "Invalid URL format")
        },
        { status: 400 } // HTTP 400 = Bad Request (client sent invalid data)
      );
    }

    // ============================================================
    // STEP 2: EXTRACT VALIDATED DATA
    // ============================================================
    
    // WHAT: Extract the validated URL from the validation result
    // WHY: We know it's safe to use now (it passed validation)
    // HOW: TypeScript knows validationResult.data.url is a valid URL string
    const { url } = validationResult.data;
    
    // WHAT: Log the scraping attempt
    // WHY: Creates an audit trail of scraping requests for monitoring
    // HOW: Info-level log with the URL being scraped
    logger.info("Scraping URL", { url });

    // ============================================================
    // STEP 3: INITIALIZE FIRECRAWL CLIENT
    // ============================================================
    
    // WHAT: Create a new Firecrawl client instance with our API key
    // WHY: The SDK needs authentication to make requests to Firecrawl's API
    // HOW: Pass the API key from our validated environment config
    // SECURITY: env.FIRECRAWL_API_KEY is server-side only; never sent to browser
    const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY });

    // ============================================================
    // STEP 4: SCRAPE THE URL
    // ============================================================
    
    // WHAT: Make the actual scraping request to Firecrawl
    // WHY: This is the core functionality - getting web content in LLM-ready format
    // HOW: Call firecrawl.scrape() with the URL and format options
    const result = await firecrawl.scrape(url, {
      // WHAT: Request both markdown and HTML formats
      // WHY: Markdown is LLM-friendly; HTML provides full page structure if needed
      // HOW: Firecrawl will return both formats in the response
      formats: ["markdown", "html"],
      
      // OPTIONAL PARAMETERS YOU CAN ADD:
      // onlyMainContent: true,  // Extract only main content (removes nav, footer, etc.)
      // waitFor: 2000,          // Wait X milliseconds for page to load (useful for JS-heavy sites)
      // timeout: 30000,         // Maximum time to wait for scraping (30 seconds)
    });

    // ============================================================
    // STEP 5: LOG SUCCESS AND RETURN RESULT
    // ============================================================
    
    // WHAT: Log successful scraping
    // WHY: Confirms the scraping worked (useful for monitoring and debugging)
    // HOW: Info-level log with the successfully scraped URL
    logger.info("Successfully scraped URL", { url });

    // WHAT: Return the scraped data to the client
    // WHY: The React Flow node needs this data to display to the user
    // HOW: Return a success response with the Firecrawl result
    // RESULT STRUCTURE: { markdown: "...", html: "...", metadata: { title, description, etc. } }
    return NextResponse.json({
      success: true,
      data: result, // Contains: markdown, html, and metadata from Firecrawl
    });
    
  } catch (error) {
    // ============================================================
    // ERROR HANDLING - Catches any unexpected errors
    // ============================================================
    
    // WHAT: Log the error that occurred
    // WHY: Critical for debugging scraping failures in production
    // HOW: Error-level log with the full error object
    logger.error("Error scraping URL", { error });

    // WHAT: Check if this is a standard Error object
    // WHY: Error objects have useful .message properties we can return to the client
    // HOW: Use instanceof to check the error type
    if (error instanceof Error) {
      // WHAT: Return a 500 Internal Server Error with the error message
      // WHY: Tells the client something went wrong (but doesn't expose sensitive details)
      // HOW: Extract error.message and return it with HTTP 500 status
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to scrape URL", // Fallback message if error.message is empty
        },
        { status: 500 } // HTTP 500 = Internal Server Error
      );
    }

    // WHAT: Fallback for non-Error exceptions (rare but possible)
    // WHY: Ensures we always return a response even for unexpected error types
    // HOW: Generic error message with 500 status
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * OVERALL WORKFLOW SUMMARY:
 * 
 * 1. Client (FirecrawlNode) sends POST request with URL
 *    → Example: POST /api/firecrawl/scrape { url: "https://example.com" }
 * 
 * 2. This route validates the URL format
 *    → Rejects invalid URLs immediately (saves API credits)
 * 
 * 3. Creates Firecrawl client with server-side API key
 *    → API key never exposed to browser (security)
 * 
 * 4. Calls Firecrawl API to scrape the URL
 *    → Gets markdown, HTML, and metadata back
 * 
 * 5. Returns result to client
 *    → Client displays markdown in the React Flow node
 * 
 * ERROR HANDLING:
 * - Invalid URL → 400 Bad Request
 * - Scraping failure → 500 Internal Server Error
 * - All errors logged for debugging
 * 
 * SECURITY:
 * - API key stored server-side only (.env.local)
 * - Validated by Zod before app starts
 * - Never exposed in client-side code or network responses
 */

