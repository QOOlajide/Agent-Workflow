"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { NodeStatus } from "@/types/workflow";

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-yellow-500 animate-pulse",
  success: "bg-green-500",
  error: "bg-red-500",
};

function JDAnalysisNodeComponent() {
  const status = useWorkflowStore((s) => s.nodeStatuses.analyze);
  const analysis = useWorkflowStore((s) => s.analysis);

  return (
    <Card className="w-[380px] border-2 shadow-lg bg-gradient-to-br from-card via-card to-card/50">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!bg-sky-500 !border-background"
      />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 shadow-sm">
            {status === "running" ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-white" />
            )}
          </div>
          <h3 className="font-semibold text-sm text-foreground flex-1">
            JD Analysis
          </h3>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        </div>

        {status === "running" && (
          <p className="text-xs text-muted-foreground">Analyzing job description with AI...</p>
        )}

        {analysis && status === "success" && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">{analysis.title}</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-medium">
                {analysis.level}
              </span>
            </div>
            <p className="text-muted-foreground">{analysis.location}</p>
            {analysis.requiredLanguages.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {[...analysis.requiredLanguages, ...analysis.requiredFrameworks].slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <p className="text-muted-foreground line-clamp-2">{analysis.rawSummary}</p>
          </div>
        )}

        {status === "idle" && (
          <p className="text-xs text-muted-foreground">Waiting for job description...</p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!bg-sky-500 !border-background"
      />
    </Card>
  );
}

export const JDAnalysisNode = memo(JDAnalysisNodeComponent);
