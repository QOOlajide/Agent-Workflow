import type {
  FreshnessBucket,
  FreshnessDisplay,
  FreshnessKind,
} from "@/types/ui-job";

/**
 * SimplifyJobs README "Age" column (e.g. "0d", "2d") — repo list freshness, not employer post time.
 */
export function freshnessFromGithubListAge(ageRaw: string): FreshnessDisplay {
  const age = ageRaw.trim();
  const kind: FreshnessKind = "community_list_age";

  if (!age) {
    return {
      headline: "List age unknown",
      detail:
        "We could not read the age cell. This is not the employer’s post time.",
      bucket: "older",
      kind,
    };
  }

  const dayMatch = /^(\d+)\s*d$/i.exec(age);
  if (dayMatch) {
    const d = parseInt(dayMatch[1], 10);
    const bucket = bucketFromApproxDays(d);
    return {
      headline: `On internship list: ${age}`,
      detail:
        "This reflects the community list (GitHub), not necessarily when the role was first posted by the employer.",
      bucket,
      kind,
    };
  }

  const hourMatch = /^(\d+)\s*h$/i.exec(age);
  if (hourMatch) {
    const h = parseInt(hourMatch[1], 10);
    const bucket: FreshnessBucket =
      h < 6 ? "under_6h" : h < 24 ? "under_24h" : "1_to_3d";
    return {
      headline: `On internship list: ${age}`,
      detail:
        "This reflects the community list (GitHub), not necessarily the employer’s post time.",
      bucket,
      kind,
    };
  }

  return {
    headline: `On internship list: ${age}`,
    detail:
      "Freshness is based on the shared list, not a verified employer timestamp.",
    bucket: "older",
    kind,
  };
}

function bucketFromApproxDays(d: number): FreshnessBucket {
  if (d <= 0) return "under_24h";
  if (d === 1) return "under_24h";
  if (d <= 3) return "1_to_3d";
  return "older";
}

/**
 * When you have a trustworthy source-posted instant (e.g. ATS or aggregator field).
 */
export function freshnessFromReliablePostedAt(postedAt: Date, now = new Date()): FreshnessDisplay {
  const ms = now.getTime() - postedAt.getTime();
  const hours = ms / (1000 * 60 * 60);
  const minutes = ms / (1000 * 60);
  let bucket: FreshnessBucket;
  if (hours <= 6) bucket = "under_6h";
  else if (hours <= 24) bucket = "under_24h";
  else if (hours <= 72) bucket = "1_to_3d";
  else bucket = "older";

  const rounded =
    minutes < 120
      ? `${Math.max(1, Math.round(minutes))}m`
      : hours < 48
        ? `${Math.max(1, Math.round(hours))}h`
        : `${Math.round(hours / 24)}d`;

  return {
    headline: `Posted about ${rounded} ago`,
    detail: "Based on the job source timestamp.",
    bucket,
    kind: "reliable_posted_at",
  };
}

/**
 * When you only know when your system first saw the job.
 */
export function freshnessFromTrackerFirstSeen(firstSeenAt: Date, now = new Date()): FreshnessDisplay {
  const ms = now.getTime() - firstSeenAt.getTime();
  const hours = ms / (1000 * 60 * 60);
  const minutes = ms / (1000 * 60);
  let bucket: FreshnessBucket;
  if (hours <= 6) bucket = "under_6h";
  else if (hours <= 24) bucket = "under_24h";
  else if (hours <= 72) bucket = "1_to_3d";
  else bucket = "older";

  const rounded =
    minutes < 120
      ? `${Math.max(1, Math.round(minutes))}m`
      : hours < 48
        ? `${Math.max(1, Math.round(hours))}h`
        : `${Math.round(hours / 24)}d`;

  return {
    headline: `Seen by our tracker ${rounded} ago`,
    detail:
      "Exact post time was unavailable; this is when we first recorded the job.",
    bucket,
    kind: "tracker_seen_at",
  };
}

/**
 * For timezone-less timestamps where provider timezone semantics are unverified.
 * We intentionally avoid "time ago" wording to prevent misleading freshness claims.
 */
export function freshnessFromAbsoluteTimeUnverified(
  rawTimestamp: string,
  mode: "posted" | "seen" = "posted"
): FreshnessDisplay {
  const normalized = rawTimestamp.trim();
  const compact = normalized.replace("T", " ").replace("Z", "");
  const prefix = mode === "posted" ? "Posted on" : "Seen on";

  return {
    headline: `${prefix} ${compact}`,
    detail:
      "Timezone for this source timestamp is unverified, so relative time is intentionally disabled.",
    bucket: "older",
    kind: "absolute_time_unverified",
  };
}
