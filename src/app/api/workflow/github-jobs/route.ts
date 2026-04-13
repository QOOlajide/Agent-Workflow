import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { env } from "@/config/env";
import { parseInternshipReadmeTables } from "@/lib/github-internships";
import type { GitHubInternshipRow } from "@/types/workflow";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const octokit = new Octokit({
      auth: env.GITHUB_TOKEN,
    });

    const { data } = await octokit.rest.repos.getContent({
      owner: env.GITHUB_INTERNSHIPS_OWNER,
      repo: env.GITHUB_INTERNSHIPS_REPO,
      path: env.GITHUB_INTERNSHIPS_PATH,
      ref: env.GITHUB_INTERNSHIPS_REF,
    });

    if (Array.isArray(data) || !("content" in data)) {
      return NextResponse.json(
        { success: false, error: "Unexpected GitHub API response for README" },
        { status: 502 }
      );
    }

    const readme = Buffer.from(data.content, "base64").toString("utf-8");
    const jobs: GitHubInternshipRow[] = parseInternshipReadmeTables(readme);

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        meta: {
          owner: env.GITHUB_INTERNSHIPS_OWNER,
          repo: env.GITHUB_INTERNSHIPS_REPO,
          ref: env.GITHUB_INTERNSHIPS_REF,
          path: env.GITHUB_INTERNSHIPS_PATH,
          sha: data.sha,
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load GitHub internships";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
