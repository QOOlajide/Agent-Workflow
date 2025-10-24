# Firecrawl Custom Node Setup

This document explains how to use the custom Firecrawl node in your React Flow application.

## Overview

The Firecrawl custom node allows you to scrape websites directly from your React Flow canvas. Simply enter a URL, click the scrape button, and the node will fetch and display the page content as markdown.

## Features

- ✅ URL input with validation
- ✅ One-click web scraping using Firecrawl API
- ✅ Markdown content preview
- ✅ Metadata display (title, description, status code)
- ✅ Copy markdown to clipboard
- ✅ Loading states and error handling
- ✅ Toast notifications for user feedback
- ✅ Handles for connecting to other nodes

## Setup Instructions

### 1. Install Dependencies

The Firecrawl SDK has already been installed:

```bash
npm install @mendable/firecrawl-js
```

### 2. Configure API Key

1. Get your API key from [Firecrawl](https://firecrawl.dev)
2. Open `.env.local` in the project root
3. Replace `fc-YOUR-API-KEY` with your actual API key:

```env
FIRECRAWL_API_KEY=fc-your-actual-api-key-here
```

**Important:** Never commit your `.env.local` file to version control!

### 3. Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your Firecrawl node in action!

## Usage

### Using the Firecrawl Node

1. **Enter a URL**: Type or paste any valid URL into the input field
2. **Scrape**: Click the "Scrape" button or press Enter
3. **View Results**: 
   - Metadata (title, description) appears above the markdown preview
   - Markdown content is shown in a scrollable preview box
   - Character count is displayed
4. **Copy Markdown**: Click the "Copy" button to copy markdown to clipboard
5. **Connect**: Use the handles (top and bottom) to connect to other nodes

### Adding More Firecrawl Nodes

To add more Firecrawl nodes to your flow, update `src/app/page.tsx`:

```typescript
const initialNodes: Node[] = [
  {
    id: 'firecrawl-1',
    type: 'firecrawl',
    position: { x: 250, y: 100 },
    data: {
      url: '',
      markdown: '',
    },
  },
  {
    id: 'firecrawl-2', // Add another node
    type: 'firecrawl',
    position: { x: 250, y: 500 },
    data: {
      url: 'https://example.com', // Optional: pre-fill URL
      markdown: '',
    },
  },
];
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── firecrawl/
│   │       └── scrape/
│   │           └── route.ts        # API endpoint for Firecrawl
│   ├── globals.css                 # Custom React Flow styling
│   ├── layout.tsx                  # Added Toaster component
│   └── page.tsx                    # Main app with node registration
├── components/
│   └── nodes/
│       └── FirecrawlNode.tsx       # Custom Firecrawl node component
└── config/
    └── env.ts                      # Environment validation (updated)
```

## API Endpoint

The scraping is handled server-side to keep your API key secure:

**Endpoint:** `POST /api/firecrawl/scrape`

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markdown": "# Page content...",
    "html": "<html>...</html>",
    "metadata": {
      "title": "Page Title",
      "description": "Page description",
      "sourceURL": "https://example.com",
      "statusCode": 200
    }
  }
}
```

## Customization

### Styling

Custom styles are in `src/app/globals.css`. You can modify:
- Node border and shadow colors
- Handle styles
- Minimap appearance
- Animation effects

### Node Properties

Modify `FirecrawlNodeData` type in `src/components/nodes/FirecrawlNode.tsx` to add more fields:

```typescript
export type FirecrawlNodeData = {
  url?: string;
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    statusCode?: number;
  };
  // Add your custom fields here
};
```

### Firecrawl Options

Update the scrape call in `src/app/api/firecrawl/scrape/route.ts` to use different formats or options:

```typescript
const result = await firecrawl.scrape(url, {
  formats: ["markdown", "html", "links", "screenshot"],
  onlyMainContent: true,
  timeout: 30000,
  // See Firecrawl docs for more options
});
```

## Troubleshooting

### "Invalid API key" Error
- Check that your API key starts with `fc-`
- Verify the key is set in `.env.local`
- Restart the dev server after changing environment variables

### "Failed to scrape URL" Error
- Verify the URL is valid and accessible
- Check your Firecrawl account has available credits
- Some websites may block scraping

### TypeScript Errors
- Make sure all dependencies are installed: `npm install`
- Clear Next.js cache: `rm -rf .next`
- Restart your IDE's TypeScript server

### Styling Issues
- React Flow styles are imported in `page.tsx`
- Custom styles are in `globals.css`
- Check browser console for CSS errors

## Next Steps

Consider extending the node with:
- **Save functionality**: Store scraped content to a database
- **Batch scraping**: Scrape multiple URLs at once
- **Data extraction**: Use Firecrawl's JSON mode to extract structured data
- **Crawling**: Use Firecrawl's crawl feature for entire websites
- **Actions**: Interact with pages before scraping (login, click, etc.)

## Resources

- [Firecrawl Documentation](https://docs.firecrawl.dev)
- [React Flow Documentation](https://reactflow.dev)
- [Example Firecrawl Docs](./firecrawl/firecrawl.md)
- [Custom Nodes Guide](./reactflow/customNodes.md)

