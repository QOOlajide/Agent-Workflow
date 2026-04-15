import type { GitHubInternshipRow } from "@/types/workflow";
import type { UiJob } from "@/types/ui-job";
import { freshnessFromGithubListAge } from "@/lib/freshness";

export function githubInternshipToUiJob(row: GitHubInternshipRow): UiJob {
  return {
    id: row.id,
    company: row.company,
    title: row.role,
    location: row.location,
    applyUrl: row.applyUrl,
    freshness: freshnessFromGithubListAge(row.age),
  };
}
