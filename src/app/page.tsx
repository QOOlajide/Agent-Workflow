"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  Background,
  MiniMap,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { JobIngestionNode } from "@/components/nodes/JobIngestionNode";
import { JDAnalysisNode } from "@/components/nodes/JDAnalysisNode";
import { ProfileLoaderNode } from "@/components/nodes/ProfileLoaderNode";
import { FitScoringNode } from "@/components/nodes/FitScoringNode";
import { TailoringSuggestionNode } from "@/components/nodes/TailoringSuggestionNode";
import { ReviewNode } from "@/components/nodes/ReviewNode";
import { ApplicationLoggerNode } from "@/components/nodes/ApplicationLoggerNode";
import { useWorkflowStore } from "@/store/workflow-store";
import {
  NODE_FALLBACK_HEIGHT,
  NODE_GAP,
  NODE_WIDTH,
  Y_START,
} from "@/components/nodes/node-card";

const X_CENTER = 300;

const PIPELINE_ORDER = [
  "ingest",
  "analyze",
  "profile",
  "score",
  "suggest",
  "review",
  "log",
] as const;

function nodeHeight(node: Node): number {
  return node.measured?.height ?? node.height ?? NODE_FALLBACK_HEIGHT;
}

function stackNodes(nodes: Node[]): Node[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const nextY = new Map<string, number>();
  let y = Y_START;

  for (const id of PIPELINE_ORDER) {
    const node = byId.get(id);
    if (!node) continue;
    nextY.set(id, y);
    y += nodeHeight(node) + NODE_GAP;
  }

  return nodes.map((node) => {
    const stackedY = nextY.get(node.id);
    if (stackedY === undefined || node.position.y === stackedY) return node;
    return { ...node, position: { ...node.position, y: stackedY } };
  });
}

function sizedNode(
  id: (typeof PIPELINE_ORDER)[number],
  type: string,
  index: number
): Node {
  return {
    id,
    type,
    position: {
      x: X_CENTER,
      y: Y_START + index * (NODE_FALLBACK_HEIGHT + NODE_GAP),
    },
    style: { width: NODE_WIDTH },
    width: NODE_WIDTH,
    data: {},
  };
}

const initialNodes: Node[] = [
  sizedNode("ingest", "jobIngestion", 0),
  sizedNode("analyze", "jdAnalysis", 1),
  sizedNode("profile", "profileLoader", 2),
  sizedNode("score", "fitScoring", 3),
  sizedNode("suggest", "tailoringSuggestion", 4),
  sizedNode("review", "review", 5),
  sizedNode("log", "applicationLogger", 6),
];

const initialEdges: Edge[] = [
  { id: "e-ingest-analyze", source: "ingest", target: "analyze", animated: true },
  { id: "e-analyze-profile", source: "analyze", target: "profile", animated: true },
  { id: "e-profile-score", source: "profile", target: "score", animated: true },
  { id: "e-score-suggest", source: "score", target: "suggest", animated: true },
  { id: "e-suggest-review", source: "suggest", target: "review", animated: true },
  { id: "e-review-log", source: "review", target: "log", animated: true },
];

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const workflowError = useWorkflowStore((s) => s.error);

  const nodeTypes = useMemo(
    () => ({
      jobIngestion: JobIngestionNode,
      jdAnalysis: JDAnalysisNode,
      profileLoader: ProfileLoaderNode,
      fitScoring: FitScoringNode,
      tailoringSuggestion: TailoringSuggestionNode,
      review: ReviewNode,
      applicationLogger: ApplicationLoggerNode,
    }),
    []
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      if (!changes.some((change) => change.type === "dimensions")) return next;
      return stackNodes(next);
    });
  }, []);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  return (
    <div style={{ width: "100vw", height: "100vh" }} className="relative">
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/60 bg-background/90 backdrop-blur-sm pointer-events-auto">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            Application workflow
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            Pick a job → analyze → tailor → review
          </p>
        </div>
        <Link
          href="/settings"
          className="text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 underline-offset-4 hover:underline"
        >
          Profile & settings
        </Link>
      </header>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable
        nodesConnectable={false}
        deleteKeyCode={null}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background />
        <MiniMap
          nodeStrokeWidth={3}
          className="!bg-background/80 !border-border"
        />
      </ReactFlow>

      {workflowError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-lg px-4 py-3 bg-destructive/90 text-destructive-foreground rounded-lg text-sm shadow-lg">
          {workflowError}
        </div>
      )}
    </div>
  );
}
