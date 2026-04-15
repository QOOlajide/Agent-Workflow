import {
  freshnessFromGithubListAge,
  freshnessFromReliablePostedAt,
  freshnessFromTrackerFirstSeen,
} from "@/lib/freshness";

describe("freshnessFromGithubListAge", () => {
  it("returns unknown when age is empty", () => {
    const r = freshnessFromGithubListAge("  ");
    expect(r.bucket).toBe("older");
    expect(r.headline).toContain("unknown");
  });

  it("parses day-based list age", () => {
    const r = freshnessFromGithubListAge("2d");
    expect(r.headline).toContain("2d");
    expect(r.bucket).toBe("1_to_3d");
    expect(r.kind).toBe("community_list_age");
  });

  it("buckets hours from list age", () => {
    expect(freshnessFromGithubListAge("3h").bucket).toBe("under_6h");
    expect(freshnessFromGithubListAge("12h").bucket).toBe("under_24h");
    expect(freshnessFromGithubListAge("30h").bucket).toBe("1_to_3d");
  });

  it("uses fallback for unrecognized age strings", () => {
    const r = freshnessFromGithubListAge("recent");
    expect(r.bucket).toBe("older");
    expect(r.headline).toContain("recent");
  });

  it("maps day counts to buckets", () => {
    expect(freshnessFromGithubListAge("0d").bucket).toBe("under_24h");
    expect(freshnessFromGithubListAge("10d").bucket).toBe("older");
  });
});

describe("freshnessFromReliablePostedAt", () => {
  it("buckets recent posts under 6h", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    const posted = new Date("2026-01-15T10:00:00.000Z");
    const r = freshnessFromReliablePostedAt(posted, now);
    expect(r.bucket).toBe("under_6h");
    expect(r.kind).toBe("reliable_posted_at");
  });

  it("buckets by age windows and headline rounding", () => {
    const base = new Date("2026-01-15T12:00:00.000Z");
    const dayAgo = new Date(base.getTime() - 36 * 60 * 60 * 1000);
    const r = freshnessFromReliablePostedAt(dayAgo, base);
    expect(r.bucket).toBe("1_to_3d");
    expect(r.headline).toMatch(/Posted about/);

    const old = new Date(base.getTime() - 200 * 60 * 60 * 1000);
    expect(freshnessFromReliablePostedAt(old, base).bucket).toBe("older");
  });
});

describe("freshnessFromTrackerFirstSeen", () => {
  it("labels tracker-relative freshness", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    const seen = new Date("2026-01-15T11:00:00.000Z");
    const r = freshnessFromTrackerFirstSeen(seen, now);
    expect(r.kind).toBe("tracker_seen_at");
    expect(r.headline).toContain("Seen by our tracker");
  });

  it("buckets older tracker windows and uses day rounding past 48h", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    const seen = new Date(now.getTime() - 80 * 60 * 60 * 1000);
    const r = freshnessFromTrackerFirstSeen(seen, now);
    expect(r.bucket).toBe("older");
    expect(r.headline).toMatch(/\d+d ago/);
  });
});
