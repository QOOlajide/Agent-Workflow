"use client";

import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Check, Pencil, X, Send } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { SectionChange, NodeStatus } from "@/types/workflow";

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-yellow-500 animate-pulse",
  success: "bg-green-500",
  error: "bg-red-500",
};

const SECTION_COLORS: Record<string, string> = {
  summary: "bg-blue-500/20 text-blue-400",
  skills: "bg-green-500/20 text-green-400",
  experience: "bg-orange-500/20 text-orange-400",
  projects: "bg-purple-500/20 text-purple-400",
  coursework: "bg-cyan-500/20 text-cyan-400",
};

type Decision = "pending" | "approve" | "edit" | "reject";

type ReviewState = {
  decision: Decision;
  editedAfter: string;
};

function ReviewNodeComponent() {
  const status = useWorkflowStore((s) => s.nodeStatuses.review);
  const workflowStatus = useWorkflowStore((s) => s.status);
  const suggestions = useWorkflowStore((s) => s.suggestions);
  const fitScore = useWorkflowStore((s) => s.fitScore);
  const submitReview = useWorkflowStore((s) => s.submitReview);

  const [reviews, setReviews] = useState<ReviewState[]>([]);

  // Initialize review state when suggestions arrive
  if (
    suggestions &&
    reviews.length !== suggestions.length &&
    workflowStatus === "review"
  ) {
    setReviews(
      suggestions.map((s) => ({
        decision: "pending",
        editedAfter: s.after,
      }))
    );
  }

  const setDecision = (idx: number, decision: Decision) => {
    setReviews((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, decision } : r))
    );
  };

  const setEdited = (idx: number, text: string) => {
    setReviews((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, editedAfter: text } : r))
    );
  };

  const allDecided =
    reviews.length > 0 && reviews.every((r) => r.decision !== "pending");

  const handleFinalize = () => {
    if (!suggestions) return;
    const approved: SectionChange[] = [];
    reviews.forEach((r, i) => {
      if (r.decision === "approve") {
        approved.push(suggestions[i]);
      } else if (r.decision === "edit") {
        approved.push({ ...suggestions[i], after: r.editedAfter });
      }
    });
    submitReview(approved);
  };

  const isReviewPhase = workflowStatus === "review";

  return (
    <Card className="w-[480px] border-2 shadow-lg bg-gradient-to-br from-card via-card to-card/50">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!bg-pink-500 !border-background"
      />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 shadow-sm">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-foreground flex-1">
            Review Suggestions
          </h3>
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        </div>

        {status === "idle" && (
          <p className="text-xs text-muted-foreground">
            Review and approve tailoring suggestions
          </p>
        )}

        {isReviewPhase && suggestions && fitScore && (
          <div className="space-y-3 nodrag nowheel">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {reviews.filter((r) => r.decision !== "pending").length}/
                {suggestions.length} reviewed
              </span>
              <span className="text-muted-foreground">
                Fit: {fitScore.score}/100
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
              {suggestions.map((change, idx) => (
                <SuggestionCard
                  key={idx}
                  change={change}
                  review={reviews[idx]}
                  onDecision={(d) => setDecision(idx, d)}
                  onEdit={(t) => setEdited(idx, t)}
                />
              ))}
            </div>

            <Button
              size="sm"
              className="w-full gap-1.5 bg-pink-600 hover:bg-pink-700"
              disabled={!allDecided}
              onClick={handleFinalize}
            >
              <Send className="h-3.5 w-3.5" />
              Finalize Review
              {!allDecided && (
                <span className="text-[10px] opacity-70 ml-1">
                  ({reviews.filter((r) => r.decision === "pending").length} remaining)
                </span>
              )}
            </Button>
          </div>
        )}

        {status === "success" && (
          <p className="text-xs text-green-400">
            Review complete — {reviews.filter((r) => r.decision !== "reject").length} changes applied
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!bg-pink-500 !border-background"
      />
    </Card>
  );
}

function SuggestionCard({
  change,
  review,
  onDecision,
  onEdit,
}: {
  change: SectionChange;
  review: ReviewState | undefined;
  onDecision: (d: Decision) => void;
  onEdit: (text: string) => void;
}) {
  if (!review) return null;

  const isEditing = review.decision === "edit";

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            SECTION_COLORS[change.section] || "bg-muted text-foreground"
          }`}
        >
          {change.section}
        </span>
        {change.label && (
          <span className="text-muted-foreground">{change.label}</span>
        )}
        {review.decision !== "pending" && (
          <span
            className={`ml-auto text-[10px] font-medium ${
              review.decision === "approve"
                ? "text-green-400"
                : review.decision === "edit"
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {review.decision.toUpperCase()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-red-400 font-medium block mb-1">
            BEFORE
          </span>
          <div className="p-2 rounded bg-red-500/5 border border-red-500/20 text-foreground/80 whitespace-pre-wrap break-words max-h-[80px] overflow-y-auto">
            {change.before}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-green-400 font-medium block mb-1">
            AFTER
          </span>
          {isEditing ? (
            <textarea
              className="w-full p-2 rounded bg-green-500/5 border border-green-500/40 text-foreground text-xs resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-green-500"
              value={review.editedAfter}
              onChange={(e) => onEdit(e.target.value)}
            />
          ) : (
            <div className="p-2 rounded bg-green-500/5 border border-green-500/20 text-foreground/80 whitespace-pre-wrap break-words max-h-[80px] overflow-y-auto">
              {change.after}
            </div>
          )}
        </div>
      </div>

      <p className="text-muted-foreground italic">{change.rationale}</p>

      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant={review.decision === "approve" ? "default" : "outline"}
          className="h-6 text-[10px] gap-1 flex-1"
          onClick={() => onDecision("approve")}
        >
          <Check className="h-3 w-3" />
          Approve
        </Button>
        <Button
          size="sm"
          variant={review.decision === "edit" ? "default" : "outline"}
          className="h-6 text-[10px] gap-1 flex-1"
          onClick={() => onDecision("edit")}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        <Button
          size="sm"
          variant={review.decision === "reject" ? "destructive" : "outline"}
          className="h-6 text-[10px] gap-1 flex-1"
          onClick={() => onDecision("reject")}
        >
          <X className="h-3 w-3" />
          Reject
        </Button>
      </div>
    </div>
  );
}

export const ReviewNode = memo(ReviewNodeComponent);
