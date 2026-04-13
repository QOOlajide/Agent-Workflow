import { create } from "zustand";
import type {
  JobIngestionOutput,
  JDAnalysis,
  Profile,
  FitScore,
  SectionChange,
  TailoredProfile,
  ApplicationLogRow,
  NodeStatus,
  WorkflowStatus,
} from "@/types/workflow";

const NODE_IDS = [
  "ingest",
  "analyze",
  "profile",
  "score",
  "suggest",
  "review",
  "log",
] as const;

type NodeId = (typeof NODE_IDS)[number];

interface WorkflowStore {
  status: WorkflowStatus;
  error: string | null;
  nodeStatuses: Record<NodeId, NodeStatus>;

  ingestion: JobIngestionOutput | null;
  analysis: JDAnalysis | null;
  profile: Profile | null;
  fitScore: FitScore | null;
  suggestions: SectionChange[] | null;
  tailoredProfile: TailoredProfile | null;
  logRow: ApplicationLogRow | null;

  runPipeline: (input: {
    url?: string;
    text?: string;
    company?: string;
    title?: string;
    location?: string;
  }) => Promise<void>;
  submitReview: (approvedChanges: SectionChange[]) => void;
  logApplication: () => Promise<void>;
  reset: () => void;
}

function initialNodeStatuses(): Record<NodeId, NodeStatus> {
  return Object.fromEntries(NODE_IDS.map((id) => [id, "idle"])) as Record<
    NodeId,
    NodeStatus
  >;
}

async function api<T>(
  url: string,
  opts?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "API call failed");
  return json.data as T;
}

function applyChangesToProfile(
  profile: Profile,
  changes: SectionChange[]
): TailoredProfile {
  const out = structuredClone(profile);

  for (const change of changes) {
    switch (change.section) {
      case "summary":
        out.summary = change.after;
        break;
      case "skills":
        out.skills = change.after.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "coursework":
        out.coursework = change.after.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "experience": {
        const exp = out.experiences.find(
          (e) => e.company === change.label || e.role === change.label
        );
        if (exp) {
          const idx = exp.bullets.findIndex((b) => b === change.before);
          if (idx >= 0) exp.bullets[idx] = change.after;
          else exp.bullets.push(change.after);
        }
        break;
      }
      case "projects": {
        const proj = out.projects.find((p) => p.name === change.label);
        if (proj) {
          const idx = proj.bullets.findIndex((b) => b === change.before);
          if (idx >= 0) proj.bullets[idx] = change.after;
          else proj.bullets.push(change.after);
        }
        break;
      }
    }
  }

  return {
    ...out,
    versionId: `v-${Date.now()}`,
    appliedChanges: changes,
  };
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  status: "idle",
  error: null,
  nodeStatuses: initialNodeStatuses(),

  ingestion: null,
  analysis: null,
  profile: null,
  fitScore: null,
  suggestions: null,
  tailoredProfile: null,
  logRow: null,

  reset: () =>
    set({
      status: "idle",
      error: null,
      nodeStatuses: initialNodeStatuses(),
      ingestion: null,
      analysis: null,
      profile: null,
      fitScore: null,
      suggestions: null,
      tailoredProfile: null,
      logRow: null,
    }),

  runPipeline: async (input) => {
    const setNode = (id: NodeId, s: NodeStatus) =>
      set((state) => ({
        nodeStatuses: { ...state.nodeStatuses, [id]: s },
      }));

    set({
      status: "running",
      error: null,
      nodeStatuses: initialNodeStatuses(),
      ingestion: null,
      analysis: null,
      profile: null,
      fitScore: null,
      suggestions: null,
      tailoredProfile: null,
      logRow: null,
    });

    try {
      // Step 1: Ingest
      setNode("ingest", "running");
      const ingestion = await api<JobIngestionOutput>(
        "/api/workflow/ingest",
        { method: "POST", body: JSON.stringify(input) }
      );
      set({ ingestion });
      setNode("ingest", "success");

      // Step 2: Analyze JD
      setNode("analyze", "running");
      const analysis = await api<JDAnalysis>("/api/workflow/analyze", {
        method: "POST",
        body: JSON.stringify({ rawText: ingestion.rawText }),
      });
      set({ analysis });
      setNode("analyze", "success");

      // Step 3: Load profile
      setNode("profile", "running");
      const profile = await api<Profile>("/api/workflow/profile");
      set({ profile });
      setNode("profile", "success");

      // Step 4: Score fit
      setNode("score", "running");
      const fitScore = await api<FitScore>("/api/workflow/score", {
        method: "POST",
        body: JSON.stringify({ jd: analysis, profile }),
      });
      set({ fitScore });
      setNode("score", "success");

      // Step 5: Generate suggestions
      setNode("suggest", "running");
      const suggestions = await api<SectionChange[]>(
        "/api/workflow/suggest",
        {
          method: "POST",
          body: JSON.stringify({ jd: analysis, profile, fit: fitScore }),
        }
      );
      set({ suggestions });
      setNode("suggest", "success");

      // Pipeline pauses for human review
      setNode("review", "running");
      set({ status: "review" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Pipeline failed";
      set({ status: "error", error: message });
    }
  },

  submitReview: (approvedChanges) => {
    const { profile } = get();
    if (!profile) return;

    const tailoredProfile = applyChangesToProfile(profile, approvedChanges);
    set({
      tailoredProfile,
      status: "reviewed",
      nodeStatuses: {
        ...get().nodeStatuses,
        review: "success",
      },
    });
  },

  logApplication: async () => {
    const { analysis, fitScore, tailoredProfile, ingestion } = get();
    if (!analysis || !fitScore || !tailoredProfile) return;

    const setNode = (id: NodeId, s: NodeStatus) =>
      set((state) => ({
        nodeStatuses: { ...state.nodeStatuses, [id]: s },
      }));

    setNode("log", "running");
    set({ status: "logging" });

    try {
      const logRow = await api<ApplicationLogRow>("/api/workflow/log", {
        method: "POST",
        body: JSON.stringify({
          jd: { ...analysis, jdUrl: ingestion?.url },
          fit: fitScore,
          tailoredProfile,
        }),
      });
      set({ logRow, status: "complete" });
      setNode("log", "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Logging failed";
      set({ status: "error", error: message });
      setNode("log", "error");
    }
  },
}));
