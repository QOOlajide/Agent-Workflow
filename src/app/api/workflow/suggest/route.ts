import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/config/env";
import type {
  JDAnalysis,
  Profile,
  FitScore,
  SectionChange,
} from "@/types/workflow";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const MODEL = "gpt-5.3";
const FALLBACK_MODEL = "gpt-5.2";

function buildPrompt(jd: JDAnalysis, profile: Profile, fit: FitScore): string {
  return `You are a resume tailoring assistant. Your job is to suggest HONEST improvements to a candidate's resume for a specific job. Do NOT fabricate experience or skills the candidate doesn't have. Instead, rephrase existing content to better highlight relevant experience.

## Job Description Analysis
Title: ${jd.title}
Level: ${jd.level}
Required Languages: ${jd.requiredLanguages.join(", ")}
Required Frameworks: ${jd.requiredFrameworks.join(", ")}
Required Databases: ${jd.requiredDatabases.join(", ")}
Systems Topics: ${jd.systemsTopics.join(", ")}
Responsibilities: ${jd.responsibilities.join("; ")}

## Candidate Gaps
${fit.gaps.join("\n")}

## Current Profile
Summary: ${profile.summary}

Skills: ${profile.skills.join(", ")}

Coursework: ${profile.coursework.join(", ")}

Experiences:
${profile.experiences
  .map(
    (e) =>
      `- ${e.company} (${e.role})\n${e.bullets.map((b) => `  * ${b}`).join("\n")}`
  )
  .join("\n")}

Projects:
${profile.projects
  .map(
    (p) =>
      `- ${p.name} [${p.techStack.join(", ")}]\n${p.bullets.map((b) => `  * ${b}`).join("\n")}`
  )
  .join("\n")}

## Instructions
Return a JSON object with a "suggestions" array. Each element:
{
  "section": "summary" | "skills" | "experience" | "projects" | "coursework",
  "label": "company or project name (for experience/projects only)",
  "before": "exact current text being changed",
  "after": "suggested replacement",
  "rationale": "one sentence explaining why"
}

Rules:
- 3-7 suggestions total
- Use EXACT text from the profile for "before" fields
- "after" must be an honest rephrasing, not fabrication
- For "skills": "before" is the current skills list, "after" is the updated list (add only skills implied by their existing work)
- Focus on the biggest gaps first
- Return ONLY valid JSON, no markdown fences`;
}

export async function POST(request: Request) {
  try {
    const { jd, profile, fit } = (await request.json()) as {
      jd: JDAnalysis;
      profile: Profile;
      fit: FitScore;
    };

    if (!jd || !profile || !fit) {
      return NextResponse.json(
        { success: false, error: "jd, profile, and fit are required" },
        { status: 400 }
      );
    }

    const messages = [
      { role: "user" as const, content: buildPrompt(jd, profile, fit) },
    ];

    let content: string | null = null;

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        messages,
        temperature: 0.3,
      });
      content = response.choices[0]?.message?.content ?? null;
    } catch {
      const fallback = await openai.chat.completions.create({
        model: FALLBACK_MODEL,
        response_format: { type: "json_object" },
        messages,
        temperature: 0.3,
      });
      content = fallback.choices[0]?.message?.content ?? null;
    }

    if (!content) {
      return NextResponse.json(
        { success: false, error: "Empty response from OpenAI" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(content);
    const suggestions: SectionChange[] = parsed.suggestions || parsed;

    return NextResponse.json({ success: true, data: suggestions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suggestion generation failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
