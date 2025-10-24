/**
 * ENVIRONMENT CONFIGURATION - Runtime Validation of Environment Variables
 * 
 * WHAT: Validates and exports environment variables with type safety
 * WHY: Ensures required configuration is present before the app starts (fail fast)
 * HOW: Uses Zod schema to validate process.env values at module load time
 * 
 * WORKFLOW POSITION: Foundational config loaded by all parts of the application
 * - Runs immediately when module is imported
 * - Throws error if validation fails (prevents app from starting)
 * - Provides typed access to environment variables throughout the app
 */

// Import Zod for runtime schema validation
// WHAT: TypeScript-first schema validation library
// WHY: 
//   - TypeScript only checks types at compile time (doesn't validate runtime values)
//   - Zod validates actual values at runtime (e.g., API key format)
//   - Provides clear error messages when validation fails
// HOW: Define schemas that describe expected data shape and constraints
import { z } from "zod";

// Import logging utility
// WHAT: Custom logger for structured logging
// WHY: Tracks when environment validation succeeds or fails
// HOW: Used to log validation events and errors
import { Logger } from "@/utils/logger";

// Initialize logger for this module
// WHAT: Creates a logger instance with namespace "Config:Env"
// WHY: Makes it easy to identify environment-related logs in production
// HOW: All logs from this file will be prefixed with "Config:Env"
const logger = new Logger("Config:Env");

/**
 * ENVIRONMENT VARIABLES SCHEMA
 * 
 * WHAT: Zod schema that defines required environment variables and their constraints
 * WHY: Provides type safety and validation for configuration
 * HOW: Each field specifies variable name, type, and validation rules
 * 
 * VALIDATION HAPPENS AT:
 * - Module load time (when this file is first imported)
 * - Fails fast if any variable is missing or invalid
 * - Prevents app from starting with invalid configuration
 */
const envSchema = z.object({
  /**
   * NODE_ENV - Node.js environment identifier
   * 
   * WHAT: Indicates which environment the app is running in
   * WHY: Different behavior in development vs production (logging, error handling, etc.)
   * HOW: Automatically set by Node.js/Next.js
   * 
   * VALUES: "development" | "production" | "test"
   * SOURCE: Set by Node.js runtime
   * VALIDATION: Must be a string (any value accepted)
   */
  NODE_ENV: z.string(),
  
  /**
   * NEXT_PUBLIC_APP_URL - Base URL of the application
   * 
   * WHAT: The URL where the application is accessible
   * WHY: Used for generating absolute URLs, API calls, redirects
   * HOW: Set in .env.local file
   * 
   * EXAMPLES: 
   * - Development: "http://localhost:3000"
   * - Production: "https://yourapp.com"
   * 
   * NOTE: NEXT_PUBLIC_ prefix makes this available in browser
   * SOURCE: .env.local file
   * VALIDATION: Must be a string (should be a URL but not strictly validated)
   */
  NEXT_PUBLIC_APP_URL: z.string(),
  
  /**
   * FIRECRAWL_API_KEY - API key for Firecrawl service
   * 
   * WHAT: Authentication key for making Firecrawl API requests
   * WHY: Required to scrape websites using Firecrawl
   * HOW: Set in .env.local file (get from https://firecrawl.dev)
   * 
   * FORMAT: Must start with "fc-" (Firecrawl's key prefix)
   * SECURITY: Server-side only (no NEXT_PUBLIC_ prefix)
   * SOURCE: .env.local file
   * VALIDATION: 
   *   - Must be a string
   *   - Must start with "fc-" (Firecrawl's standard prefix)
   *   - Custom error message if validation fails
   */
  FIRECRAWL_API_KEY: z.string().startsWith("fc-", "API key must start with 'fc-'"),
  
  /**
   * OPENAI_API_KEY - OpenAI API authentication key
   * 
   * WHAT: API key for authenticating with OpenAI's API
   * WHY: Required to make requests to OpenAI models (GPT-5, etc.)
   * WHERE: Used by /api/openai/chat route
   * FORMAT: Must start with "sk-" (OpenAI's key prefix)
   * SECURITY: Server-side only (no NEXT_PUBLIC_ prefix)
   * SOURCE: .env.local file
   * VALIDATION:
   *   - Must be a string
   *   - Must start with "sk-" (OpenAI's standard prefix)
   *   - Custom error message if validation fails
   */
  OPENAI_API_KEY: z.string().startsWith("sk-", "API key must start with 'sk-'"),
  
  // ADD NEW ENVIRONMENT VARIABLES HERE:
  // Example:
  // DATABASE_URL: z.string().url("Must be a valid database URL"),
});

/**
 * VALIDATION FUNCTION
 * 
 * WHAT: Validates environment variables against the schema
 * WHY: Ensures all required config is present and valid before app starts
 * HOW: Reads from process.env → validates with schema → returns typed object or throws error
 * 
 * EXECUTION TIMING: Runs immediately when this module is imported (module initialization)
 * ERROR BEHAVIOR: Throws error and prevents app from starting if validation fails
 */
const validateEnv = () => {
  try {
    // ============================================================
    // STEP 1: LOG VALIDATION START
    // ============================================================
    
    // WHAT: Log that we're starting environment validation
    // WHY: Helps track when/where validation happens in logs
    // HOW: Info-level log (shows in both dev and production)
    logger.info("Validating environment variables");
    
    // ============================================================
    // STEP 2: COLLECT ENVIRONMENT VARIABLES
    // ============================================================
    
    // WHAT: Create an object with values from process.env
    // WHY: 
    //   - process.env values might be undefined
    //   - We need to validate them before using
    //   - Centralize all env access in one place
    // HOW: Read each variable from process.env (Node.js global)
    const env = {
      // WHAT: Current Node.js environment
      // SOURCE: Automatically set by Node.js/Next.js
      // EXAMPLE: "development", "production", "test"
      NODE_ENV: process.env.NODE_ENV,
      
      // WHAT: Base URL of the application
      // SOURCE: .env.local file
      // EXAMPLE: "http://localhost:3000" or "https://yourapp.com"
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      
      // WHAT: Firecrawl API authentication key
      // SOURCE: .env.local file
      // EXAMPLE: "fc-abc123xyz..."
      // SECURITY: Server-side only (never exposed to browser)
      FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
      
      // WHAT: OpenAI API authentication key
      // SOURCE: .env.local file
      // EXAMPLE: "sk-abc123xyz..."
      // SECURITY: Server-side only (never exposed to browser)
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };
    
    // ============================================================
    // STEP 3: VALIDATE AGAINST SCHEMA
    // ============================================================
    
    // WHAT: Validate the env object against our Zod schema
    // WHY: Ensures all variables are present and meet requirements
    // HOW: parse() validates and returns typed object (throws on failure)
    // RESULT: If successful, returns object with proper TypeScript types
    const parsed = envSchema.parse(env);
    
    // ============================================================
    // STEP 4: LOG SUCCESS
    // ============================================================
    
    // WHAT: Log successful validation
    // WHY: Confirms configuration is valid (useful in production logs)
    // HOW: Info-level log indicating all checks passed
    logger.info("Environment variables validated successfully");
    
    // ============================================================
    // STEP 5: RETURN VALIDATED OBJECT
    // ============================================================
    
    // WHAT: Return the validated, typed environment object
    // WHY: Consumers get type-safe access to config
    // HOW: TypeScript knows the exact shape and types of this object
    // USAGE: import { env } from "@/config/env"; then env.FIRECRAWL_API_KEY
    return parsed;
    
  } catch (error) {
    // ============================================================
    // ERROR HANDLING: Validation Failed
    // ============================================================
    
    // WHAT: Check if this is a Zod validation error
    // WHY: Zod errors have specific structure we can parse for better messages
    // HOW: Use instanceof to check error type
    if (error instanceof z.ZodError) {
      // WHAT: Extract names of variables that failed validation
      // WHY: Tells developer exactly which variables are missing/invalid
      // HOW: Map over Zod errors and join path segments (e.g., ["FIRECRAWL_API_KEY"])
      const missingVars = error.errors.map(err => err.path.join("."));
      
      // WHAT: Log the validation error with details
      // WHY: Creates permanent record in logs for debugging
      // HOW: Error-level log with list of failed variables
      logger.error("Invalid environment variables", { error: { missingVars } });
      
      // WHAT: Throw user-friendly error message
      // WHY: 
      //   - Stops app from starting (fail fast)
      //   - Tells developer exactly what to fix
      //   - More helpful than generic "undefined" errors later
      // HOW: Create Error with formatted message listing all issues
      throw new Error(
        `❌ Invalid environment variables: ${missingVars.join(
          ", "
        )}. Please check your .env file`
      );
    }
    
    // WHAT: Re-throw any other errors
    // WHY: Unexpected errors should still fail the app startup
    // HOW: Throw the original error unchanged
    throw error;
  }
};

/**
 * EXPORTED ENVIRONMENT OBJECT
 * 
 * WHAT: Validated environment configuration available to the entire application
 * WHY: Provides type-safe, validated access to configuration throughout the app
 * HOW: Execute validateEnv() at module load time and export the result
 * 
 * EXECUTION: Runs immediately when this module is imported (top-level)
 * BEHAVIOR: Throws error if validation fails (app won't start)
 * USAGE: import { env } from "@/config/env"; then use env.FIRECRAWL_API_KEY
 * 
 * TYPE SAFETY: TypeScript knows exact shape of this object:
 * - env.NODE_ENV: string
 * - env.NEXT_PUBLIC_APP_URL: string  
 * - env.FIRECRAWL_API_KEY: string (validated to start with "fc-")
 */
export const env = validateEnv();

/**
 * ============================================================
 * OVERALL MODULE WORKFLOW
 * ============================================================
 * 
 * INITIALIZATION (Module Load):
 * 1. Module is imported by another file (e.g., API route)
 * 2. validateEnv() function executes immediately (top-level call)
 * 3. Reads environment variables from process.env
 * 4. Validates against Zod schema
 * 5. Success: Returns typed object → exported as 'env'
 * 6. Failure: Throws error → app fails to start → developer sees clear error
 * 
 * VALIDATION FLOW:
 * 
 *   Import → validateEnv() → Collect Vars → Validate Schema → Return Typed Object
 *                                ↓
 *                           Missing/Invalid
 *                                ↓
 *                        Log Error → Throw Error → App Fails to Start
 *                                                          ↓
 *                                              Developer Sees: "❌ Invalid environment 
 *                                              variables: FIRECRAWL_API_KEY. Please 
 *                                              check your .env file"
 * 
 * USAGE EXAMPLE:
 * 
 *   // In any file:
 *   import { env } from "@/config/env";
 *   
 *   // Type-safe access to validated config:
 *   const apiKey = env.FIRECRAWL_API_KEY;  // TypeScript knows this is a string
 *   const appUrl = env.NEXT_PUBLIC_APP_URL;
 *   
 *   // If FIRECRAWL_API_KEY was missing/invalid, app wouldn't have started
 * 
 * BENEFITS:
 * 1. Fail Fast: Invalid config stops app at startup (not at runtime)
 * 2. Type Safety: TypeScript knows exact shape of env object
 * 3. Validation: Checks format (e.g., API key must start with "fc-")
 * 4. Clear Errors: Developer knows exactly what's wrong
 * 5. Centralized: All env access goes through this single source
 * 6. Documentation: Schema serves as config documentation
 * 
 * ADDING NEW VARIABLES:
 * 1. Add to .env.local file
 * 2. Add to envSchema with validation rules
 * 3. Add to env object in validateEnv()
 * 4. TypeScript will now know about the new variable
 * 
 * EXAMPLE:
 *   // In envSchema:
 *   OPENAI_API_KEY: z.string().startsWith("sk-"),
 *   
 *   // In validateEnv():
 *   OPENAI_API_KEY: process.env.OPENAI_API_KEY,
 *   
 *   // Usage:
 *   env.OPENAI_API_KEY  // TypeScript knows this exists and is a string
 */
