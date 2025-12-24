/**
 * ROOT LAYOUT - Application-Wide Layout Component
 * 
 * WHAT: The root layout that wraps all pages in the Next.js application
 * WHY: Provides shared structure, fonts, styles, and global components (like Toaster)
 * HOW: Next.js automatically wraps all pages with this layout
 * 
 * WORKFLOW POSITION: Top-level wrapper for the entire application
 * - Loads fonts and global styles
 * - Sets HTML metadata (title, description)
 * - Includes global UI components (toast notifications)
 * - Wraps all page content via {children}
 */

// Import Metadata type for Next.js metadata configuration
// WHAT: TypeScript type for page metadata (title, description, og tags, etc.)
// WHY: Provides type safety when configuring SEO and browser metadata
// HOW: Used to type the exported metadata object
import type { Metadata } from "next";

// Import Google Fonts
// WHAT: Next.js font optimization utilities for Google Fonts
// WHY: 
//   - Automatically optimizes font loading (self-hosts, preloads)
//   - Prevents layout shift (font sizes calculated before page render)
//   - Better performance than loading from Google CDN
// HOW: Import font functions from next/font/google, configure and use
import { Geist, Geist_Mono } from "next/font/google";

// Import global styles
// WHAT: Global CSS file with Tailwind directives and custom styles
// WHY: 
//   - Loads Tailwind CSS utility classes
//   - Includes custom React Flow styles
//   - Defines CSS variables and theme colors
// HOW: Imported once at root level to apply globally
import "./globals.css";

// Import Toaster component for toast notifications
// WHAT: Container component that renders toast notifications
// WHY: 
//   - Provides user feedback (success/error messages)
//   - Used by FirecrawlNode and other components
//   - Must be in layout to work across all pages
// HOW: Placed at root level (after children) to show on all pages
import { Toaster } from "@/components/ui/toaster";

// Import SpeedInsights component for performance monitoring
// WHAT: Vercel Speed Insights component for real user monitoring (RUM)
// WHY: 
//   - Tracks Core Web Vitals and performance metrics in production
//   - Helps identify performance issues affecting user experience
//   - Provides insights via Vercel dashboard
// HOW: Placed at root level (after children) to monitor entire app
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * SANS-SERIF FONT CONFIGURATION
 * 
 * WHAT: Configures the Geist sans-serif font family
 * WHY: Modern, clean font for body text and UI elements
 * HOW: Next.js downloads font, generates CSS, and creates variable for use
 * 
 * CONFIGURATION:
 * - variable: CSS custom property name (--font-geist-sans)
 * - subsets: Character sets to include (latin = A-Z, a-z, numbers, common punctuation)
 * 
 * USAGE: Applied to body tag via className, accessible in CSS as var(--font-geist-sans)
 */
const geistSans = Geist({
  variable: "--font-geist-sans", // Creates CSS variable: --font-geist-sans
  subsets: ["latin"],            // Only load Latin characters (smaller file size)
});

/**
 * MONOSPACE FONT CONFIGURATION
 * 
 * WHAT: Configures the Geist Mono font family for code/monospace text
 * WHY: Better for displaying code, markdown previews, technical content
 * HOW: Same as geistSans but for monospace font
 * 
 * CONFIGURATION:
 * - variable: CSS custom property name (--font-geist-mono)
 * - subsets: Character sets to include (latin)
 * 
 * USAGE: Used in markdown preview boxes, code blocks, etc.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono", // Creates CSS variable: --font-geist-mono
  subsets: ["latin"],            // Only load Latin characters
});

/**
 * PAGE METADATA (SEO)
 * 
 * WHAT: Metadata configuration for the application
 * WHY: 
//   - SEO: Helps search engines understand and rank the page
//   - Social Sharing: Provides title/description for social media previews
//   - Browser: Sets browser tab title and description
// HOW: Next.js injects this into <head> tags automatically
 * 
 * EXPORTED: Must be exported for Next.js to pick it up
 * APPLIES TO: All pages (unless overridden by page-specific metadata)
 */
export const metadata: Metadata = {
  // WHAT: Page title shown in browser tab
  // WHY: Tells users and search engines what this app does
  // HOW: Appears in browser tab, bookmarks, and search results
  // EXAMPLE: "Agent Workflow - Firecrawl Integration | My Site"
  title: "Agent Workflow - Firecrawl Integration",
  
  // WHAT: Page description for search engines and social sharing
  // WHY: 
  //   - SEO: Search engines show this in search results
  //   - Social: Used when sharing on Twitter, Facebook, etc.
  //   - Accessibility: Screen readers can read description
  // HOW: Injected into <meta name="description"> tag
  // LENGTH: Ideally 150-160 characters for best SEO
  description: "React Flow with Firecrawl API integration for web scraping",
  
  // FUTURE ENHANCEMENTS:
  // openGraph: { // For social media sharing
  //   title: "Agent Workflow",
  //   description: "...",
  //   images: ["/og-image.png"],
  // },
  // twitter: { // Twitter-specific metadata
  //   card: "summary_large_image",
  //   title: "...",
  // },
};

/**
 * ROOT LAYOUT COMPONENT
 * 
 * WHAT: The root layout component that wraps all pages
 * WHY: 
//   - Provides consistent structure across all pages
//   - Loads fonts and styles once (not per page)
//   - Includes global components (Toaster)
// HOW: Next.js automatically wraps all pages with this component
 * 
 * PROPS:
 * - children: The page content (page.tsx, or any route)
 * 
 * STRUCTURE:
 * <html>
 *   <body with fonts>
 *     {children} ← Page content goes here (page.tsx)
 *     <Toaster /> ← Global toast container
 *   </body>
 * </html>
 */
export default function RootLayout({
  children, // Content from the active page (e.g., page.tsx)
}: Readonly<{
  children: React.ReactNode; // Can be any valid React element
}>) {
  return (
    // ============================================================
    // HTML TAG
    // ============================================================
    
    // WHAT: Root HTML element
    // WHY: Required by HTML5 spec; defines document language
    // HOW: lang="en" tells browsers and screen readers this is English content
    // ACCESSIBILITY: Screen readers use lang to choose pronunciation
    // DARK MODE: Class-based dark mode using prefers-color-scheme media query
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      
      {/* ========================================================
          BODY TAG
          ======================================================== */}
      
      {/* WHAT: Body element containing all visible page content */}
      {/* WHY: Required HTML element; holds all rendered content */}
      {/* HOW: Applies font variables and styling via className */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        // EXPLANATION OF CLASSNAME:
        // - ${geistSans.variable}: Adds CSS var --font-geist-sans (body font)
        // - ${geistMono.variable}: Adds CSS var --font-geist-mono (code font)  
        // - antialiased: Tailwind class for smooth font rendering
        //   (uses -webkit-font-smoothing: antialiased; font-smoothing: antialiased;)
      >
        {/* ========================================================
            PAGE CONTENT (Children)
            ======================================================== */}
        
        {/* WHAT: The actual page content */}
        {/* WHY: This is where page.tsx (and all routes) render */}
        {/* HOW: Next.js injects the active page as {children} */}
        {/* EXAMPLE: For /, this is the content from page.tsx */}
        {children}
        
        {/* ========================================================
            GLOBAL TOAST NOTIFICATIONS
            ======================================================== */}
        
        {/* WHAT: Container for toast notifications */}
        {/* WHY: 
            - Toaster must be in layout to work on all pages
            - Used by FirecrawlNode for success/error messages
            - Provides consistent notification UX across app
        */}
        {/* HOW: 
            - Renders a portal at the end of body
            - Shows toasts triggered by toast() function
            - Auto-dismisses after timeout
            - Positioned in corner via internal styling
        */}
        {/* USAGE: 
            - Any component can call toast({ title, description })
            - Toasts appear in bottom-right corner
            - Multiple toasts stack vertically
        */}
        <Toaster />

        {/* ========================================================
            VERCEL SPEED INSIGHTS
            ======================================================== */}
        
        {/* WHAT: Component for Vercel Speed Insights performance monitoring */}
        {/* WHY: 
            - Tracks Core Web Vitals (LCP, FID, CLS) in production
            - Provides real user monitoring (RUM) data
            - Helps identify performance bottlenecks
            - Works only in production environments
        */}
        {/* HOW: 
            - Injected at root level to monitor entire app
            - Collects anonymized performance metrics
            - Sends data to Vercel dashboard
            - Zero performance impact with async data collection
        */}
        {/* USAGE: 
            - Automatically enabled in production
            - Disabled in development to avoid noise
            - View data in Vercel project dashboard
        */}
        <SpeedInsights />
      </body>
    </html>
  );
}

/**
 * ============================================================
 * OVERALL LAYOUT WORKFLOW
 * ============================================================
 * 
 * APPLICATION INITIALIZATION:
 * 1. User navigates to application (e.g., http://localhost:3000)
 * 2. Next.js renders RootLayout first
 * 3. Fonts are loaded and optimized
 * 4. Global CSS (globals.css) is applied
 * 5. Metadata is injected into <head>
 * 6. {children} is replaced with page.tsx content
 * 7. Toaster component mounts (ready for notifications)
 * 
 * NAVIGATION FLOW:
 * - Layout persists across page navigations
 * - Only {children} content changes
 * - Fonts and Toaster remain mounted (better performance)
 * 
 * FONT LOADING:
 * 1. Next.js downloads Geist and Geist Mono at build time
 * 2. Fonts are self-hosted (not loaded from Google)
 * 3. CSS variables created: --font-geist-sans, --font-geist-mono
 * 4. Applied to body → inherited by all child elements
 * 5. Can be accessed in CSS: font-family: var(--font-geist-sans)
 * 
 * TOAST NOTIFICATION FLOW:
 * 1. Component (e.g., FirecrawlNode) calls toast()
 * 2. Toast state updates in useToast hook
 * 3. Toaster component receives toast data
 * 4. Toast renders in bottom-right corner
 * 5. Auto-dismisses after timeout (default 5 seconds)
 * 6. User can manually dismiss by clicking X
 * 
 * STYLING HIERARCHY:
 * 
 *   globals.css (loaded here)
 *        ↓
 *   Tailwind utility classes
 *        ↓
 *   Component-specific styles
 *        ↓
 *   Inline styles (highest specificity)
 * 
 * METADATA INJECTION (by Next.js):
 * 
 *   <head>
 *     <title>Agent Workflow - Firecrawl Integration</title>
 *     <meta name="description" content="React Flow with..." />
 *     <link rel="preload" ... fonts />
 *     <style>... font CSS ...</style>
 *   </head>
 * 
 * RENDERING EXAMPLE:
 * 
 *   User visits "/" (root):
 *   
 *   <html lang="en">
 *     <body class="[font-variables] antialiased">
 *       <!-- page.tsx content renders here -->
 *       <div style="width: 100vw; height: 100vh;">
 *         <ReactFlow ... />
 *       </div>
 *       
 *       <!-- Toaster renders here (portal) -->
 *       <div class="toaster-container">
 *         <!-- Toast notifications appear here -->
 *       </div>
 *     </body>
 *   </html>
 * 
 * BENEFITS:
 * 1. Performance: Fonts and Toaster loaded once (not per page)
 * 2. Consistency: All pages share same fonts and notification system
 * 3. SEO: Metadata properly configured for search engines
 * 4. Accessibility: lang attribute, antialiased fonts, semantic HTML
 * 5. Developer Experience: Change layout once, affects all pages
 * 
 * CUSTOMIZATION IDEAS:
 * - Add theme provider (dark mode)
 * - Add analytics script
 * - Add global navigation header
 * - Add error boundary
 * - Add loading states
 * - Add authentication provider
 */
