import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

// Re-export for convenience
export type { ExcalidrawElement };

export interface DiagramNode {
  id: string;
  type:
    | "service"
    | "database"
    | "queue"
    | "cache"
    | "load-balancer"
    | "client"
    | "storage"
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
