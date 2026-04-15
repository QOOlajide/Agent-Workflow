import type { ActiveJobRow } from "@/types/workflow";
import type { UiJob } from "@/types/ui-job";
import {
  freshnessFromAbsoluteTimeUnverified,
  freshnessFromReliablePostedAt,
  freshnessFromTrackerFirstSeen,
} from "@/lib/freshness";

const ASSUME_TIMEZONELESS_ACTIVE_JOBS_UTC =
  process.env.NEXT_PUBLIC_TIMEZONELESS_ACTIVE_JOBS_ARE_UTC === "true";

function parseActiveJobsTimestamp(value?: string | null): Date | null {
  if (!value) return null;

  const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  if (!hasTimezone && !ASSUME_TIMEZONELESS_ACTIVE_JOBS_UTC) {
    return null;
  }

  const normalized = hasTimezone ? value : `${value}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLocation(row: ActiveJobRow): string {
  const derived = row.locations_derived?.filter(Boolean) ?? [];
  if (derived.length > 0) return derived[0];
  if (row.remote_derived || row.location_type === "TELECOMMUTE") return "Remote";
  return "Location unspecified";
}

export function activeJobToUiJob(row: ActiveJobRow): UiJob {
  const postedRaw = row.date_posted?.trim();
  const createdRaw = row.date_created?.trim();
  const postedHasTimezone = !!postedRaw && /[zZ]|[+-]\d{2}:\d{2}$/.test(postedRaw);
  const createdHasTimezone = !!createdRaw && /[zZ]|[+-]\d{2}:\d{2}$/.test(createdRaw);

  const posted = parseActiveJobsTimestamp(row.date_posted);
  const created = parseActiveJobsTimestamp(row.date_created);

  return {
    id: `active-${row.id}`,
    company: row.organization?.trim() || "Unknown company",
    title: row.title?.trim() || "Untitled role",
    location: formatLocation(row),
    applyUrl: row.url || undefined,
    freshness:
      posted
        ? freshnessFromReliablePostedAt(posted)
        : postedRaw && !postedHasTimezone && !ASSUME_TIMEZONELESS_ACTIVE_JOBS_UTC
          ? freshnessFromAbsoluteTimeUnverified(postedRaw, "posted")
          : created
            ? freshnessFromTrackerFirstSeen(created)
            : createdRaw && !createdHasTimezone && !ASSUME_TIMEZONELESS_ACTIVE_JOBS_UTC
              ? freshnessFromAbsoluteTimeUnverified(createdRaw, "seen")
              : freshnessFromTrackerFirstSeen(new Date()),
  };
}
