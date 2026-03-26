import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/config/env";
import type { JDAnalysis } from "@/types/workflow";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const MODEL = "gpt-5.3";
const FALLBACK_MODEL = "gpt-5.2";

const SYSTEM_PROMPT = `You are a job description analyzer. Extract structured information from the provided job description text.

Return a JSON object with exactly these fields:
{
  "title": "string - exact job title",
  "level": "intern" | "new_grad" | "other",
  "location": "string - job location or Remote",
  "requiredLanguages": ["programming languages explicitly required"],
  "requiredFrameworks": ["frameworks/libraries explicitly required"],
  "requiredDatabases": ["databases mentioned"],
  "systemsTopics": ["systems/infra topics like CI/CD, distributed systems, etc."],
  "niceToHaves": ["nice-to-have qualifications"],
  "responsibilities": ["key responsibilities, max 6"],
  "rawSummary": "2-3 sentence summary of the role"
}

Rules:
- Only include items explicitly mentioned in the JD
- For "level": use "intern" if internship, "new_grad" if 0-2 years or entry-level/junior, "other" otherwise
- Keep arrays concise (no duplicates)
- Return ONLY valid JSON, no markdown fences`;

export async function POST(request: Request) {
  try {
    const { rawText } = (await request.json()) as { rawText: string };

    if (!rawText?.trim()) {
      return NextResponse.json(
        { success: false, error: "rawText is required" },
        { status: 400 }
      );
    }

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: rawText.slice(0, 12000) },
    ];

    let content: string | null = null;

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        messages,
        temperature: 0.1,
      });
      content = response.choices[0]?.message?.content ?? null;
    } catch {
      const fallback = await openai.chat.completions.create({
        model: FALLBACK_MODEL,
        response_format: { type: "json_object" },
        messages,
        temperature: 0.1,
      });
      content = fallback.choices[0]?.message?.content ?? null;
    }

    if (!content) {
      return NextResponse.json(
        { success: false, error: "Empty response from OpenAI" },
        { status: 502 }
      );
    }

    const analysis: JDAnalysis = JSON.parse(content);

    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
