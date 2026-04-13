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
import { useWorkflowStore } from "@/store/workflow-store";
import type { GitHubInternshipRow, NodeStatus } from "@/types/workflow";
import { internshipRowToJdText } from "@/lib/github-internships-text";

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
  const [jobs, setJobs] = useState<GitHubInternshipRow[] | null>(null);
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

  const filteredJobs = useMemo(() => {
    if (!jobs?.length) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
    );
  }, [jobs, filter]);

  const selected = useMemo(
    () => jobs?.find((j) => j.id === selectedId) ?? null,
    [jobs, selectedId]
  );

  const loadListings = async () => {
    setLoadingJobs(true);
    setLoadError(null);
    try {
      const data = await fetchJson<{ jobs: GitHubInternshipRow[] }>(
        "/api/workflow/github-jobs"
      );
      setJobs(data.jobs);
      setSelectedId(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load listings");
      setJobs(null);
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
    if (!selected) return;
    runPipeline({
      text: internshipRowToJdText(selected),
      url: selected.applyUrl,
      company: selected.company,
      title: selected.role,
      location: selected.location,
    });
  };

  const canRun = usePaste
    ? !!pasteText.trim()
    : !!selected && !loadingJobs;

  return (
    <Card className="w-[420px] border-2 shadow-lg bg-gradient-to-br from-card via-card to-card/50">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
            <Inbox className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-foreground flex-1">
            Job source (GitHub)
          </h3>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        </div>

        <p className="text-[11px] text-muted-foreground leading-snug">
          Listings from{" "}
          <span className="font-medium text-foreground">
            SimplifyJobs/Summer2026-Internships
          </span>{" "}
          via the GitHub API. Pick a row, then run the pipeline.
        </p>

        <div className="flex gap-1 nodrag">
          <Button
            size="sm"
            variant={!usePaste ? "default" : "outline"}
            className="h-7 text-xs flex-1"
            onClick={() => setUsePaste(false)}
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
            rows={5}
            className="nodrag nowheel w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
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
              {jobs && (
                <span className="text-[11px] text-muted-foreground self-center">
                  {jobs.length.toLocaleString()} roles
                </span>
              )}
            </div>

            {loadError && (
              <p className="text-[11px] text-destructive">{loadError}</p>
            )}

            {jobs && jobs.length > 0 && (
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

                <div className="nodrag nowheel max-h-[200px] overflow-y-auto rounded-md border border-border/60 bg-muted/20">
                  {filteredJobs.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground p-2">
                      No matches.
                    </p>
                  ) : (
                    filteredJobs.slice(0, 200).map((j) => (
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
                          {j.role} · {j.location}
                          {j.age ? ` · ${j.age}` : ""}
                        </div>
                      </button>
                    ))
                  )}
                  {filteredJobs.length > 200 && (
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
