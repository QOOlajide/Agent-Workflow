"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { User, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { NodeStatus } from "@/types/workflow";

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-yellow-500 animate-pulse",
  success: "bg-green-500",
  error: "bg-red-500",
};

function ProfileLoaderNodeComponent() {
  const status = useWorkflowStore((s) => s.nodeStatuses.profile);
  const profile = useWorkflowStore((s) => s.profile);

  return (
    <Card className="w-[380px] border-2 shadow-lg bg-gradient-to-br from-card via-card to-card/50">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!bg-emerald-500 !border-background"
      />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
            {status === "running" ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <User className="h-4 w-4 text-white" />
            )}
          </div>
          <h3 className="font-semibold text-sm text-foreground flex-1">
            Your profile
          </h3>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        </div>

        {status === "running" && (
          <p className="text-xs text-muted-foreground">Loading your saved profile…</p>
        )}

        {profile && status === "success" && (
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground line-clamp-2">{profile.summary}</p>
            <div className="flex gap-3 text-muted-foreground">
              <span>{profile.skills.length} skills</span>
              <span>{profile.experiences.length} experiences</span>
              <span>{profile.projects.length} projects</span>
            </div>
          </div>
        )}

        {status === "idle" && (
          <p className="text-xs text-muted-foreground leading-snug">
            Uses the profile from your account. In development this reads{" "}
            <code className="text-[10px] bg-muted px-1 rounded">data/profile/profile.json</code>
            ; at sign-up you&apos;ll add a resume once so this step never blocks the flow.
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!bg-emerald-500 !border-background"
      />
    </Card>
  );
}

export const ProfileLoaderNode = memo(ProfileLoaderNodeComponent);
