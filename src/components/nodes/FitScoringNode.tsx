"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { NodeStatus } from "@/types/workflow";

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-yellow-500 animate-pulse",
  success: "bg-green-500",
  error: "bg-red-500",
};

const REC_STYLES: Record<string, string> = {
  apply: "bg-green-500/20 text-green-400",
  maybe: "bg-yellow-500/20 text-yellow-400",
  skip: "bg-red-500/20 text-red-400",
};

function FitScoringNodeComponent() {
  const status = useWorkflowStore((s) => s.nodeStatuses.score);
  const fitScore = useWorkflowStore((s) => s.fitScore);

  return (
    <Card className="w-[380px] border-2 shadow-lg bg-gradient-to-br from-card via-card to-card/50">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!bg-amber-500 !border-background"
      />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm">
            {status === "running" ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 text-white" />
            )}
          </div>
          <h3 className="font-semibold text-sm text-foreground flex-1">
            Fit Scoring
          </h3>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        </div>

        {status === "running" && (
          <p className="text-xs text-muted-foreground">Calculating fit score...</p>
        )}

        {fitScore && status === "success" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {fitScore.score}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                  REC_STYLES[fitScore.recommendation]
                }`}
              >
                {fitScore.recommendation}
              </span>
            </div>

            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                style={{ width: `${fitScore.score}%` }}
              />
            </div>

            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="text-green-400">
                {fitScore.strengths.length} strengths
              </span>
              <span className="text-red-400">
                {fitScore.gaps.length} gaps
              </span>
            </div>
          </div>
        )}

        {status === "idle" && (
          <p className="text-xs text-muted-foreground">
            Compares JD requirements against your profile
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!bg-amber-500 !border-background"
      />
    </Card>
  );
}

export const FitScoringNode = memo(FitScoringNodeComponent);
