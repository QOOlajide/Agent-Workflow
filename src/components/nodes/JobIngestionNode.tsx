"use client";

import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Inbox, Loader2, Play, FileText } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { NodeStatus } from "@/types/workflow";

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-yellow-500 animate-pulse",
  success: "bg-green-500",
  error: "bg-red-500",
};

function JobIngestionNodeComponent() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"url" | "text">("url");

  const status = useWorkflowStore((s) => s.nodeStatuses.ingest);
  const workflowStatus = useWorkflowStore((s) => s.status);
  const ingestion = useWorkflowStore((s) => s.ingestion);
  const runPipeline = useWorkflowStore((s) => s.runPipeline);
  const reset = useWorkflowStore((s) => s.reset);

  const isRunning = workflowStatus === "running";

  const handleRun = () => {
    if (mode === "url" && !url.trim()) return;
    if (mode === "text" && !text.trim()) return;
    runPipeline(mode === "url" ? { url: url.trim() } : { text: text.trim() });
  };

  return (
    <Card className="w-[380px] border-2 shadow-lg bg-gradient-to-br from-card via-card to-card/50">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
            <Inbox className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-foreground flex-1">
            Job Ingestion
          </h3>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        </div>

        <div className="flex gap-1 nodrag">
          <Button
            size="sm"
            variant={mode === "url" ? "default" : "outline"}
            className="h-7 text-xs flex-1"
            onClick={() => setMode("url")}
          >
            URL
          </Button>
          <Button
            size="sm"
            variant={mode === "text" ? "default" : "outline"}
            className="h-7 text-xs flex-1"
            onClick={() => setMode("text")}
          >
            Paste Text
          </Button>
        </div>

        {mode === "url" ? (
          <Input
            type="url"
            placeholder="https://jobs.lever.co/company/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isRunning}
            className="nodrag text-xs"
          />
        ) : (
          <textarea
            placeholder="Paste the full job description here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isRunning}
            rows={4}
            className="nodrag nowheel w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          />
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-orange-600 hover:bg-orange-700"
            onClick={handleRun}
            disabled={
              isRunning ||
              (mode === "url" ? !url.trim() : !text.trim())
            }
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Run Pipeline
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
            >
              Reset
            </Button>
          )}
        </div>

        {ingestion && status === "success" && (
          <div className="p-2 bg-muted/50 rounded-md text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3 shrink-0" />
            {ingestion.rawText.length.toLocaleString()} chars ingested
            {ingestion.source && <span>via {ingestion.source}</span>}
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
