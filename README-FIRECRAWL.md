# Firecrawl Custom Node - Quick Start 🚀

This project includes a fully functional custom React Flow node that integrates with the Firecrawl API for web scraping.

## What Was Built

### ✅ Complete Implementation

1. **Firecrawl SDK Integration** - Installed `@mendable/firecrawl-js`
2. **Environment Configuration** - Added API key validation with Zod
3. **Secure API Route** - Server-side endpoint to protect your API key
4. **Custom React Flow Node** - Beautiful, feature-rich Firecrawl node
5. **UI Components** - Toast notifications, loading states, error handling
6. **Styling** - Custom React Flow styles and node animations
7. **Type Safety** - Full TypeScript support throughout

## Quick Start

### Step 1: Get Your API Key

1. Visit [firecrawl.dev](https://firecrawl.dev)
2. Sign up and get your API key

### Step 2: Configure Environment

Open `.env.local` and add your API key:

```env
FIRECRAWL_API_KEY=fc-your-actual-api-key-here
```

### Step 3: Install & Run

```bash
# Install dependencies (if not done already)
npm install

# Start the development server
npm run dev
```

### Step 4: Use the Node

1. Open `http://localhost:3000`
2. Find the Firecrawl node on the canvas
3. Enter any URL (e.g., `https://example.com`)
4. Click "Scrape" or press Enter
5. View the scraped markdown content!

## Features

### 🎯 Core Features
- **URL Input**: Enter any valid website URL
- **One-Click Scraping**: Fetch content with a single click
- **Markdown Output**: Clean, LLM-ready markdown format
- **Metadata Display**: See page title, description, and status
- **Copy to Clipboard**: Easily copy markdown content
- **Loading States**: Visual feedback during scraping
- **Error Handling**: User-friendly error messages

### 🔌 React Flow Integration
- **Connection Handles**: Top (input) and bottom (output)
- **Drag & Drop**: Move nodes around the canvas
- **Selection**: Click to select/deselect
- **Background Grid**: Visual guide for positioning
- **Minimap**: Navigate large flows easily
- **Controls**: Zoom and fit view buttons

### 🎨 UI/UX
- **Shadcn/ui Components**: Beautiful, accessible UI
- **Toast Notifications**: Success/error feedback
- **Responsive Design**: Works on different screen sizes
- **Dark Mode Support**: Adapts to system preferences

## Project Structure

```
Agent-Workflow/
├── .env.local                          # Your API key (DO NOT COMMIT)
├── .env.example                        # Template for API key
├── README-FIRECRAWL.md                 # This file
├── docs/
│   ├── firecrawl-node-setup.md        # Detailed setup guide
│   ├── firecrawl/
│   │   └── firecrawl.md               # Firecrawl API docs
│   └── reactflow/
│       └── customNodes.md             # React Flow custom nodes guide
└── src/
    ├── app/
    │   ├── api/
    │   │   └── firecrawl/
    │   │       └── scrape/
    │   │           └── route.ts       # Server-side Firecrawl endpoint
    │   ├── globals.css                # Custom styling
    │   ├── layout.tsx                 # Root layout with Toaster
    │   └── page.tsx                   # Main app with Firecrawl node
    ├── components/
    │   ├── nodes/
    │   │   └── FirecrawlNode.tsx      # 🎯 Custom Firecrawl node
    │   └── ui/                        # Shadcn/ui components
    └── config/
        └── env.ts                     # Environment validation
```

## How It Works

### Architecture

```
┌─────────────┐
│   Browser   │
│ (React Flow)│
└──────┬──────┘
       │
       │ POST /api/firecrawl/scrape
       │ { url: "https://example.com" }
       │
       ▼
┌─────────────┐
│  Next.js    │
│  API Route  │
└──────┬──────┘
       │
       │ Firecrawl API Call
       │ (with API key)
       │
       ▼
┌─────────────┐
│  Firecrawl  │
│  Service    │
└──────┬──────┘
       │
       │ Returns markdown + metadata
       │
       ▼
┌─────────────┐
│   Browser   │
│  (Display)  │
└─────────────┘
```

### Security

- **API Key Protection**: Never exposed to the browser
- **Server-Side Scraping**: All Firecrawl calls happen on the server
- **Input Validation**: URL format validated before scraping
- **Error Handling**: Safe error messages without exposing internals

## Customization Examples

### Change Node Appearance

Edit `src/components/nodes/FirecrawlNode.tsx`:

```typescript
<Card className="min-w-[400px] max-w-[500px] bg-gradient-to-br from-blue-50 to-purple-50">
  {/* Your custom styling */}
</Card>
```

### Add More Scraping Options

Edit `src/app/api/firecrawl/scrape/route.ts`:

```typescript
const result = await firecrawl.scrape(url, {
  formats: ["markdown", "html", "links"],
  onlyMainContent: true,  // Extract only main content
  waitFor: 2000,          // Wait 2 seconds before scraping
});
```

### Pre-populate URLs

Edit `src/app/page.tsx`:

```typescript
const initialNodes: Node[] = [
  {
    id: 'firecrawl-1',
    type: 'firecrawl',
    position: { x: 250, y: 100 },
    data: {
      url: 'https://example.com',  // Pre-filled URL
      markdown: '',
    },
  },
];
```

## Advanced Features

### JSON Mode (Structured Data Extraction)

The Firecrawl API supports extracting structured data using schemas. See the [Firecrawl docs](./docs/firecrawl/firecrawl.md) for examples using Pydantic or Zod schemas.

### Crawling (Multiple Pages)

Firecrawl can crawl entire websites. Extend the API route to use `firecrawl.crawl()` instead of `firecrawl.scrape()`.

### Actions (Interact Before Scraping)

Firecrawl supports actions like clicking buttons, filling forms, and waiting. Perfect for scraping content behind authentication.

## Troubleshooting

### Environment Variables Not Loading

1. Make sure `.env.local` is in the project root
2. Restart the development server: `npm run dev`
3. Check that the key starts with `fc-`

### "Failed to scrape URL" Error

1. **Check URL**: Make sure it's valid and accessible
2. **Check Credits**: Verify your Firecrawl account has credits
3. **Check Website**: Some sites block automated scraping

### TypeScript Errors

```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
```

### Styling Not Applied

1. Check `src/app/globals.css` is imported in `layout.tsx`
2. Verify React Flow styles: `import '@xyflow/react/dist/style.css'`
3. Clear browser cache

## Next Steps

### Ideas to Extend This Project

1. **Batch Processing**: Scrape multiple URLs at once
2. **Data Storage**: Save scraped content to a database
3. **Workflow Automation**: Chain multiple nodes together
4. **Export**: Download markdown files
5. **Search**: Integrate Firecrawl's search API
6. **AI Processing**: Send markdown to LLMs for analysis

### Additional Custom Nodes

Create more custom nodes to build a complete workflow:
- **LLM Node**: Send markdown to OpenAI/Anthropic
- **Storage Node**: Save data to database
- **Transform Node**: Process and format data
- **Output Node**: Display or export results

## Resources

- 📚 [Firecrawl Documentation](https://docs.firecrawl.dev)
- 📚 [React Flow Documentation](https://reactflow.dev)
- 📚 [Next.js Documentation](https://nextjs.org/docs)
- 📚 [Shadcn/ui Documentation](https://ui.shadcn.com)

## Support

For issues or questions:
- **Firecrawl**: Check [Firecrawl Docs](https://docs.firecrawl.dev) or [GitHub Issues](https://github.com/mendableai/firecrawl/issues)
- **React Flow**: Visit [React Flow Docs](https://reactflow.dev)
- **This Project**: Review the documentation in the `docs/` folder

---

**Built with ❤️ using Next.js, React Flow, and Firecrawl**

Start scraping and building your agent workflow! 🚀

