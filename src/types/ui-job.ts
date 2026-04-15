/**
 * Single product-facing job shape for lists and the canvas.
 * Backed by different sources (GitHub list today, DB/API later).
 */

export type FreshnessBucket =
  | "under_6h"
  | "under_24h"
  | "1_to_3d"
  | "older";

/** How much you can trust the “posted” story */
export type FreshnessKind =
  | "reliable_posted_at"
  | "tracker_seen_at"
  | "community_list_age"
  | "absolute_time_unverified";

export type FreshnessDisplay = {
  headline: string;
  detail: string;
  bucket: FreshnessBucket;
  kind: FreshnessKind;
};

export type UiJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  applyUrl?: string;
  freshness: FreshnessDisplay;
};
