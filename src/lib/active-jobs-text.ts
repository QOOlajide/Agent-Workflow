import type { ActiveJobRow } from "@/types/workflow";

export function activeJobToJdText(row: ActiveJobRow): string {
  const lines = [
    `Company: ${row.organization ?? "Unknown"}`,
    `Role: ${row.title}`,
    row.locations_derived?.[0] ? `Location: ${row.locations_derived[0]}` : "",
    row.source ? `Source: ${row.source}` : "",
    row.url ? `Application URL: ${row.url}` : "",
    row.date_posted ? `Source posted at: ${row.date_posted}` : "",
    "",
    row.description_text?.trim() || "",
  ];
  return lines.filter(Boolean).join("\n");
}
