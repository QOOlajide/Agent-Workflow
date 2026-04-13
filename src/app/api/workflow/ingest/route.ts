import { NextResponse } from "next/server";
import Firecrawl from "@mendable/firecrawl-js";
import { env } from "@/config/env";
import type { JobIngestionInput, JobIngestionOutput } from "@/types/workflow";

const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY });

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JobIngestionInput;

    if (!body.url && !body.text) {
      return NextResponse.json(
        { success: false, error: "Provide either a URL or pasted text" },
        { status: 400 }
      );
    }

    let rawText: string;
    let source: string;

    if (body.text?.trim()) {
      rawText = body.text.trim();
      source = body.url ? "github-readme" : "manual";
    } else if (body.url) {
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid URL format" },
          { status: 400 }
        );
      }

      const result = await firecrawl.scrape(body.url, {
        formats: ["markdown"],
      });
      rawText = (result as { markdown?: string }).markdown || "";
      source = "firecrawl";
    } else {
      return NextResponse.json(
        { success: false, error: "Provide either a URL or pasted text" },
        { status: 400 }
      );
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { success: false, error: "No content extracted from the provided input" },
        { status: 422 }
      );
    }

    const output: JobIngestionOutput = {
      url: body.url,
      rawText,
      source,
      company: body.company,
      title: body.title,
      location: body.location,
    };

    return NextResponse.json({ success: true, data: output });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ingestion failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
