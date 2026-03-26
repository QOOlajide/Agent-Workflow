import { NextResponse } from "next/server";
import type { JDAnalysis, Profile, FitScore } from "@/types/workflow";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

function overlapCount(a: string[], b: string[]): number {
  const setB = new Set(b.map(normalize));
  return a.filter((item) => setB.has(normalize(item))).length;
}

function scoreFit(jd: JDAnalysis, profile: Profile): FitScore {
  const strengths: string[] = [];
  const gaps: string[] = [];

  const allRequired = [
    ...jd.requiredLanguages,
    ...jd.requiredFrameworks,
    ...jd.requiredDatabases,
  ];
  const matchedSkills = overlapCount(allRequired, profile.skills);
  const skillRate = allRequired.length > 0 ? matchedSkills / allRequired.length : 0;

  if (skillRate >= 0.7) {
    strengths.push(`${matchedSkills}/${allRequired.length} required skills matched`);
  } else if (allRequired.length > 0) {
    const missing = allRequired.filter(
      (s) => !profile.skills.map(normalize).includes(normalize(s))
    );
    gaps.push(`Missing skills: ${missing.join(", ")}`);
  }

  const allBullets = [
    ...profile.experiences.flatMap((e) => e.bullets),
    ...profile.projects.flatMap((p) => p.bullets),
  ].join(" ").toLowerCase();

  const topicHits = jd.systemsTopics.filter((t) =>
    allBullets.includes(t.toLowerCase())
  );
  if (topicHits.length > 0) {
    strengths.push(`Experience with: ${topicHits.join(", ")}`);
  }
  const topicGaps = jd.systemsTopics.filter(
    (t) => !allBullets.includes(t.toLowerCase())
  );
  if (topicGaps.length > 0) {
    gaps.push(`No demonstrated experience: ${topicGaps.join(", ")}`);
  }

  const locationMatch =
    jd.location.toLowerCase().includes("remote") ||
    profile.locations.some(
      (loc) =>
        jd.location.toLowerCase().includes(loc.toLowerCase()) ||
        loc.toLowerCase() === "remote"
    );
  if (locationMatch) {
    strengths.push("Location compatible");
  } else {
    gaps.push(`Location mismatch: JD requires ${jd.location}`);
  }

  if (jd.level === "new_grad" || jd.level === "intern") {
    strengths.push(`Level match: ${jd.level}`);
  }

  const niceHits = overlapCount(jd.niceToHaves, [
    ...profile.skills,
    ...profile.coursework,
  ]);
  if (niceHits > 0) {
    strengths.push(`${niceHits} nice-to-have qualifications met`);
  }

  // Weighted score: 50% skills, 20% topics, 15% location, 15% level+nice-to-haves
  let score = 0;
  score += skillRate * 50;
  score +=
    (jd.systemsTopics.length > 0
      ? topicHits.length / jd.systemsTopics.length
      : 1) * 20;
  score += locationMatch ? 15 : 0;
  score += (jd.level === "new_grad" || jd.level === "intern" ? 10 : 5) +
    (jd.niceToHaves.length > 0
      ? (niceHits / jd.niceToHaves.length) * 5
      : 5);

  score = Math.round(Math.min(100, Math.max(0, score)));

  let recommendation: FitScore["recommendation"];
  if (score >= 65) recommendation = "apply";
  else if (score >= 40) recommendation = "maybe";
  else recommendation = "skip";

  return { score, strengths, gaps, recommendation };
}

export async function POST(request: Request) {
  try {
    const { jd, profile } = (await request.json()) as {
      jd: JDAnalysis;
      profile: Profile;
    };

    if (!jd || !profile) {
      return NextResponse.json(
        { success: false, error: "jd and profile are required" },
        { status: 400 }
      );
    }

    const fit = scoreFit(jd, profile);
    return NextResponse.json({ success: true, data: fit });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scoring failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
