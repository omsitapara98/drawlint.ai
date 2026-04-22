"use client";

import type { ParsedDiagram, GraphNode } from "@/types/diagram";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface FeedbackPanelProps {
  diagram: ParsedDiagram | null;
}

const SECTION_LABELS: {
  key: keyof ParsedDiagram["sections"];
  label: string;
}[] = [
  { key: "functionalRequirements", label: "Functional Requirements" },
  { key: "assumptions", label: "Assumptions" },
  { key: "nonFunctionalRequirements", label: "Non-Functional Requirements" },
  { key: "coreEntities", label: "Core Entities" },
  { key: "capacityCalculations", label: "Capacity Calculations" },
  { key: "apiRoutes", label: "API Routes" },
];

const TYPE_COLORS: Record<GraphNode["type"], string> = {
  client: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "api-gateway": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "load-balancer": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  service: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  worker: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  database: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cache: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  queue: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  pubsub: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  storage: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  cdn: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  dns: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  firewall: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  server: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  unknown: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function FeedbackPanel({ diagram }: FeedbackPanelProps) {
  if (!diagram) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">
          ✏️
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Ready to analyze</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click &quot;Analyze Design&quot; to extract your design sections
          </p>
        </div>
      </div>
    );
  }

  const { sections, hld } = diagram;
  const nodeMap = new Map(hld.nodes.map((n) => [n.id, n]));

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-4">
        {/* Text sections */}
        {SECTION_LABELS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {sections[key] ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {sections[key]}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No content yet
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* HLD Graph section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              High-Level Design
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {hld.nodes.length} component{hld.nodes.length !== 1 ? "s" : ""}
              {hld.clusters.length > 0 && (
                <> · {hld.clusters.length} cluster{hld.clusters.length !== 1 ? "s" : ""}</>
              )}
              {" · "}
              {hld.edges.length} connection{hld.edges.length !== 1 ? "s" : ""}
              {" · "}
              {hld.annotations.length} annotation{hld.annotations.length !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Components subsection */}
            {hld.nodes.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Components
                </h4>
                <div className="space-y-1.5">
                  {hld.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                    >
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[node.type]}`}
                      >
                        {node.type}
                      </Badge>
                      <span className="truncate">
                        {node.label || "(unlabeled)"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clusters subsection */}
            {hld.clusters.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Clusters
                </h4>
                <div className="space-y-1.5">
                  {hld.clusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-sm"
                    >
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      >
                        ×{cluster.count}
                      </Badge>
                      <span className="truncate">{cluster.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connections subsection */}
            {hld.edges.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Connections
                </h4>
                <div className="space-y-1.5">
                  {hld.edges.map((edge) => {
                    const fromNode = nodeMap.get(edge.from);
                    const toNode = nodeMap.get(edge.to);
                    return (
                      <div
                        key={edge.id}
                        className="rounded-md border px-2.5 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-1 text-xs">
                          {edge.sequence !== undefined && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 mr-1">
                              #{edge.sequence}
                            </Badge>
                          )}
                          <span className="font-medium truncate">
                            {fromNode?.label || edge.from || "?"}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium truncate">
                            {toNode?.label || edge.to || "?"}
                          </span>
                        </div>
                        {edge.label && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {edge.label}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Annotations subsection */}
            {hld.annotations.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Annotations
                </h4>
                <div className="space-y-1.5">
                  {hld.annotations.map((ann) => {
                    const nearNode = nodeMap.get(ann.nearestNodeId);
                    return (
                      <div
                        key={ann.id}
                        className="rounded-md border px-2.5 py-1.5 text-sm"
                      >
                        <p className="text-xs whitespace-pre-wrap">
                          {ann.text}
                        </p>
                        {nearNode && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            near: {nearNode.label || nearNode.id}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hld.nodes.length === 0 &&
              hld.edges.length === 0 &&
              hld.annotations.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No HLD components drawn yet
                </p>
              )}
          </CardContent>
        </Card>

        {/* Raw JSON dump */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Raw JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
              {JSON.stringify(diagram, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
