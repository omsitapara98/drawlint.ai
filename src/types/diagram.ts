import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

// Re-export for convenience
export type { ExcalidrawElement };

export interface DiagramNode {
  id: string;
  type:
    | "client"
    | "api-gateway"
    | "load-balancer"
    | "service"
    | "worker"
    | "database"
    | "cache"
    | "queue"
    | "pubsub"
    | "storage"
    | "cdn"
    | "dns"
    | "firewall"
    | "server"
    | "unknown";
  label: string;
  position: { x: number; y: number };
}

export interface DiagramConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface SerializedDiagram {
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  rawElementCount: number;
  timestamp: number;
}

/* ── Graph parser types ──────────────────────────────────────── */

export interface GraphNode {
  id: string;
  label: string;
  type: DiagramNode["type"];
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  style: { strokeColor: string; backgroundColor: string };
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  sequence?: number;
}

export interface GraphAnnotation {
  id: string;
  text: string;
  position: { x: number; y: number };
  nearestNodeId: string;
}

export interface GraphCluster {
  id: string;
  label: string;
  count: number;
  memberIds: string[];
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
}

export interface ParsedDiagram {
  sections: {
    functionalRequirements: string;
    assumptions: string;
    nonFunctionalRequirements: string;
    coreEntities: string;
    capacityCalculations: string;
    apiRoutes: string;
  };
  hld: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    annotations: GraphAnnotation[];
    clusters: GraphCluster[];
  };
}
