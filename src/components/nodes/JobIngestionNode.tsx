"use client";

import { memo, useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Inbox,
  Loader2,
  Play,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import { NODE_CARD_BODY_CLASS, NODE_CARD_CLASS } from "@/components/nodes/node-card";
import { useWorkflowStore } from "@/store/workflow-store";
import type { ActiveJobRow, GitHubInternshipRow, NodeStatus } from "@/types/workflow";
import type { UiJob } from "@/types/ui-job";
import { internshipRowToJdText } from "@/lib/github-internships-text";
import { githubInternshipToUiJob } from "@/lib/adapters/github-internship-to-ui-job";
import { activeJobToUiJob } from "@/lib/adapters/active-job-to-ui-job";
import { activeJobToJdText } from "@/lib/active-jobs-text";

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-yellow-500 animate-pulse",
  success: "bg-green-500",
  error: "bg-red-500",
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data as T;
}

function JobIngestionNodeComponent() {
  const [githubJobs, setGithubJobs] = useState<GitHubInternshipRow[] | null>(null);
  const [activeJobs, setActiveJobs] = useState<ActiveJobRow[] | null>(null);
  const [sourceMode, setSourceMode] = useState<"github" | "active">("github");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [usePaste, setUsePaste] = useState(false);

  const status = useWorkflowStore((s) => s.nodeStatuses.ingest);
  const workflowStatus = useWorkflowStore((s) => s.status);
  const ingestion = useWorkflowStore((s) => s.ingestion);
  const runPipeline = useWorkflowStore((s) => s.runPipeline);
  const reset = useWorkflowStore((s) => s.reset);

  const isRunning = workflowStatus === "running";

  const uiJobs = useMemo<UiJob[] | null>(() => {
    if (sourceMode === "github") {
      return githubJobs?.length ? githubJobs.map(githubInternshipToUiJob) : null;
    }
    return activeJobs?.length ? activeJobs.map(activeJobToUiJob) : null;
  }, [sourceMode, githubJobs, activeJobs]);

  const filteredUiJobs = useMemo(() => {
    if (!uiJobs?.length) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return uiJobs;
    return uiJobs.filter(
      (j) =>
        j.company.toLowerCase().includes(q) ||
        j.title.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
    );
  }, [uiJobs, filter]);

  const selectedGithub = useMemo(
    () => githubJobs?.find((j) => j.id === selectedId) ?? null,
    [githubJobs, selectedId]
  );
  const selectedActive = useMemo(() => {
    if (!activeJobs || !selectedId) return null;
    const rawId = selectedId.replace(/^active-/, "");
    return activeJobs.find((j) => j.id === rawId) ?? null;
  }, [activeJobs, selectedId]);

  const loadListings = async () => {
    setLoadingJobs(true);
    setLoadError(null);
    try {
      if (sourceMode === "github") {
        const data = await fetchJson<{ jobs: GitHubInternshipRow[] }>(
          "/api/workflow/github-jobs"
        );
        setGithubJobs(data.jobs);
      } else {
        const data = await fetchJson<{ jobs: ActiveJobRow[] }>(
          "/api/workflow/active-jobs"
        );
        setActiveJobs(data.jobs);
      }
      setSelectedId(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load listings");
      if (sourceMode === "github") setGithubJobs(null);
      else setActiveJobs(null);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleRun = () => {
    if (usePaste) {
      if (!pasteText.trim()) return;
      runPipeline({ text: pasteText.trim() });
      return;
    }
    if (sourceMode === "github") {
      if (!selectedGithub) return;
      runPipeline({
        text: internshipRowToJdText(selectedGithub),
        url: selectedGithub.applyUrl,
        company: selectedGithub.company,
        title: selectedGithub.role,
        location: selectedGithub.location,
      });
      return;
    }

    if (!selectedActive) return;
    runPipeline({
      text: activeJobToJdText(selectedActive),
      url: selectedActive.url || undefined,
      company: selectedActive.organization || undefined,
      title: selectedActive.title,
      location: selectedActive.locations_derived?.[0] || undefined,
    });
  };

  const canRun = usePaste
    ? !!pasteText.trim()
    : !!selectedId && !loadingJobs;

  return (
    <Card className={NODE_CARD_CLASS}>
      <div className={NODE_CARD_BODY_CLASS}>
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
            <Inbox className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-foreground flex-1">
            Pick a job
          </h3>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        </div>

        <p className="text-[11px] text-muted-foreground leading-snug">
          Pick a source, load jobs, select one role, then run the pipeline.
          Freshness label is source-aware.
        </p>

        <div className="flex gap-1 nodrag">
          <Button
            size="sm"
            variant={sourceMode === "github" && !usePaste ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => {
              setUsePaste(false);
              setSourceMode("github");
              setSelectedId(null);
              setLoadError(null);
            }}
            type="button"
          >
            GitHub
          </Button>
          <Button
            size="sm"
            variant={sourceMode === "active" && !usePaste ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => {
              setUsePaste(false);
              setSourceMode("active");
              setSelectedId(null);
              setLoadError(null);
            }}
            type="button"
          >
            Active Jobs DB
          </Button>
          <Button
            size="sm"
            variant={!usePaste ? "default" : "outline"}
            className="h-7 text-xs flex-1"
            onClick={() => {
              setUsePaste(false);
            }}
            type="button"
          >
            Listings
          </Button>
          <Button
            size="sm"
            variant={usePaste ? "default" : "outline"}
            className="h-7 text-xs flex-1"
            onClick={() => setUsePaste(true)}
            type="button"
          >
            Paste text
          </Button>
        </div>

        {usePaste ? (
          <textarea
            placeholder="Paste a full job description here (optional fallback)."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            disabled={isRunning}
            rows={4}
            className="nodrag nowheel w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        ) : (
          <>
            <div className="flex gap-2 nodrag">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs gap-1 shrink-0"
                onClick={loadListings}
                disabled={isRunning || loadingJobs}
                type="button"
              >
                {loadingJobs ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Load listings
              </Button>
              {uiJobs && (
                <span className="text-[11px] text-muted-foreground self-center">
                  {uiJobs.length.toLocaleString()} roles
                </span>
              )}
            </div>

            {loadError && (
              <p className="text-[11px] text-destructive">{loadError}</p>
            )}

            {uiJobs && uiJobs.length > 0 && (
              <>
                <div className="relative nodrag">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter company, role, location…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    disabled={isRunning}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <div className="nodrag nowheel max-h-[180px] overflow-y-auto rounded-md border border-border/60 bg-muted/20">
                  {filteredUiJobs.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground p-2">
                      No matches.
                    </p>
                  ) : (
                    filteredUiJobs.slice(0, 200).map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => setSelectedId(j.id)}
                        className={`w-full text-left px-2 py-1.5 text-[11px] border-b border-border/40 last:border-0 hover:bg-muted/50 ${
                          selectedId === j.id ? "bg-orange-500/15" : ""
                        }`}
                      >
                        <div className="font-medium text-foreground truncate">
                          {j.company}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {j.title} · {j.location}
                        </div>
                        <div className="text-[10px] text-muted-foreground/90 mt-0.5 line-clamp-2">
                          {j.freshness.headline}
                        </div>
                      </button>
                    ))
                  )}
                  {filteredUiJobs.length > 200 && (
                    <p className="text-[10px] text-muted-foreground p-2 border-t">
                      Showing first 200 matches — refine the filter.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-orange-600 hover:bg-orange-700"
            onClick={handleRun}
            disabled={isRunning || !canRun}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Run pipeline
              </>
            )}
          </Button>
          {workflowStatus !== "idle" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={reset}
              disabled={isRunning}
              type="button"
            >
              Reset
            </Button>
          )}
        </div>

        {ingestion && status === "success" && (
          <div className="p-2 bg-muted/50 rounded-md text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3 shrink-0" />
            {ingestion.rawText.length.toLocaleString()} chars ingested
            {ingestion.source && (
              <span className="text-[10px]">· {ingestion.source}</span>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!bg-orange-500 !border-background"
      />
    </Card>
  );
}

export const JobIngestionNode = memo(JobIngestionNodeComponent);
