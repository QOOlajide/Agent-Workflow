"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { NodeStatus } from "@/types/workflow";

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-yellow-500 animate-pulse",
  success: "bg-green-500",
  error: "bg-red-500",
};

function TailoringSuggestionNodeComponent() {
  const status = useWorkflowStore((s) => s.nodeStatuses.suggest);
  const suggestions = useWorkflowStore((s) => s.suggestions);

  return (
    <Card className="w-[380px] border-2 shadow-lg bg-gradient-to-br from-card via-card to-card/50">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!bg-violet-500 !border-background"
      />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm">
            {status === "running" ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-white" />
            )}
          </div>
          <h3 className="font-semibold text-sm text-foreground flex-1">
            Tailoring Suggestions
          </h3>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        </div>

        {status === "running" && (
          <p className="text-xs text-muted-foreground">
            Generating tailoring suggestions with AI...
          </p>
        )}

        {suggestions && status === "success" && (
          <div className="space-y-1.5 text-xs">
            <p className="text-foreground font-medium">
              {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} generated
            </p>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set(suggestions.map((s) => s.section))).map(
                (section) => (
                  <span
                    key={section}
                    className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 text-[10px]"
                  >
                    {section}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {status === "idle" && (
          <p className="text-xs text-muted-foreground">
            AI generates resume diff suggestions
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!bg-violet-500 !border-background"
      />
    </Card>
  );
}

export const TailoringSuggestionNode = memo(TailoringSuggestionNodeComponent);
