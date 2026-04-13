import type { GitHubInternshipRow } from "@/types/workflow";

export function internshipRowToJdText(row: GitHubInternshipRow): string {
  const lines = [
    `Company: ${row.company}`,
    `Role: ${row.role}`,
    `Location: ${row.location}`,
    row.age ? `Listing age (repo): ${row.age}` : "",
    row.applyUrl ? `Application URL: ${row.applyUrl}` : "",
    "",
    "Context: This text was built from the SimplifyJobs Summer internships list on GitHub. The full job description is usually on the employer's application page.",
  ];
  return lines.filter(Boolean).join("\n");
}
