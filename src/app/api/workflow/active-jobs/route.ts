import { NextResponse } from "next/server";
import { env } from "@/config/env";
import type { ActiveJobRow } from "@/types/workflow";

export const dynamic = "force-dynamic";

const DEFAULT_TITLE_FILTER =
  `"Software Engineer" OR "Software Developer" OR "SWE" OR "Soft*" OR "AI Engineer" OR "ML Engineer"`;
const DEFAULT_LOCATION_FILTER = `"United States"`;
const DEFAULT_LIMIT = "10";

function titleLooksLikeSoftwareRole(titleRaw: string): boolean {
  const title = titleRaw.toLowerCase();

  // Exclude senior-only signals.
  const seniorOnly =
    /\b(senior|sr\.?|staff|principal|lead|manager|director|head|vp)\b/i.test(
      title
    );
  if (seniorOnly) return false;

  // Strict software and AI/ML role matches.
  const strictMatch =
    /\bsoftware engineer\b/i.test(title) ||
    /\bsoftware developer\b/i.test(title) ||
    /\bai engineer\b/i.test(title) ||
    /\bmachine learning engineer\b/i.test(title) ||
    /\bml engineer\b/i.test(title);
  if (strictMatch) return true;

  // Truncation-friendly fallback:
  // - soft* + (dev|engineer|swe)
  // - ai* + engineer
  const hasSoftPrefix = /\bsoft\w*/i.test(title);
  const hasDevOrEng = /\b(dev(eloper)?|engineer|swe)\b/i.test(title);
  if (hasSoftPrefix && hasDevOrEng) return true;

  const hasAiPrefix = /\bai\w*/i.test(title);
  const hasEngineer = /\bengineer\b/i.test(title);
  return hasAiPrefix && hasEngineer;
}

export async function GET(request: Request) {
  try {
    if (!env.RAPIDAPI_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "RAPIDAPI_KEY is missing. Add it to your environment to use Active Jobs DB.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const offset = searchParams.get("offset") ?? "0";
    const limit = searchParams.get("limit") ?? DEFAULT_LIMIT;
    const titleFilter = searchParams.get("title_filter") ?? DEFAULT_TITLE_FILTER;
    const locationFilter =
      searchParams.get("location_filter") ?? DEFAULT_LOCATION_FILTER;
    const descriptionType = searchParams.get("description_type") ?? "text";

    const upstream = new URL("/active-ats-24h", env.ACTIVE_JOBS_DB_BASE_URL);
    upstream.searchParams.set("limit", limit);
    upstream.searchParams.set("offset", offset);
    upstream.searchParams.set("title_filter", titleFilter);
    upstream.searchParams.set("location_filter", locationFilter);
    upstream.searchParams.set("description_type", descriptionType);

    const res = await fetch(upstream.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": env.RAPIDAPI_KEY,
        "x-rapidapi-host": env.ACTIVE_JOBS_DB_HOST,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          success: false,
          error: `Active Jobs DB request failed (${res.status}): ${text.slice(0, 300)}`,
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as ActiveJobRow[];
    const jobs = Array.isArray(data) ? data : [];
    const softwareJobs = jobs.filter((job) =>
      titleLooksLikeSoftwareRole(job.title || "")
    );

    return NextResponse.json({
      success: true,
      data: {
        jobs: softwareJobs,
        meta: {
          endpoint: "/active-ats-24h",
          count: softwareJobs.length,
          upstreamCount: jobs.length,
          limit: Number(limit) || Number(DEFAULT_LIMIT),
          offset: Number(offset) || 0,
          titleFilter,
          locationFilter,
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Active Jobs";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
