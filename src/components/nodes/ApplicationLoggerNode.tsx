"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, CheckCircle2 } from "lucide-react";
import { NODE_CARD_BODY_CLASS, NODE_CARD_CLASS } from "@/components/nodes/node-card";
import { useWorkflowStore } from "@/store/workflow-store";
import type { NodeStatus } from "@/types/workflow";

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-yellow-500 animate-pulse",
  success: "bg-green-500",
  error: "bg-red-500",
};

function ApplicationLoggerNodeComponent() {
  const status = useWorkflowStore((s) => s.nodeStatuses.log);
  const workflowStatus = useWorkflowStore((s) => s.status);
  const logRow = useWorkflowStore((s) => s.logRow);
  const logApplication = useWorkflowStore((s) => s.logApplication);
  const error = useWorkflowStore((s) => s.error);

  const canLog = workflowStatus === "reviewed";
  const isLogging = workflowStatus === "logging";

  return (
    <Card className={NODE_CARD_CLASS}>
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!bg-teal-500 !border-background"
      />

      <div className={NODE_CARD_BODY_CLASS}>
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm">
            {isLogging ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <ClipboardList className="h-4 w-4 text-white" />
            )}
          </div>
          <h3 className="font-semibold text-sm text-foreground flex-1">
            Application Logger
          </h3>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        </div>

        {status === "idle" && !canLog && (
          <p className="text-xs text-muted-foreground">
            Logs finalized application to Google Sheets & local JSON
          </p>
        )}

        {canLog && (
          <Button
            size="sm"
            className="w-full gap-1.5 bg-teal-600 hover:bg-teal-700 nodrag"
            onClick={() => logApplication()}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Log Application
          </Button>
        )}

        {isLogging && (
          <p className="text-xs text-muted-foreground">Logging application...</p>
        )}

        {logRow && status === "success" && (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-medium">Application logged</span>
            </div>
            <div className="p-2 bg-muted/50 rounded space-y-1 text-muted-foreground">
              <p>{logRow.title}</p>
              <p>Score: {logRow.fitScore} — {logRow.recommendation}</p>
              <p className="text-[10px]">{logRow.timestamp}</p>
            </div>
          </div>
        )}

        {status === "error" && error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    </Card>
  );
}

export const ApplicationLoggerNode = memo(ApplicationLoggerNodeComponent);
