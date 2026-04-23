"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const ExcalidrawWrapper = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return { default: mod.Excalidraw };
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading viewer…</div>
      </div>
    ),
  },
);

interface ExcalidrawViewerProps {
  elements: Record<string, unknown>[];
}

export default function ExcalidrawViewer({ elements }: ExcalidrawViewerProps) {
  const { resolvedTheme } = useTheme();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const didScroll = useRef(false);

  // Scroll to content once after API is available and component is mounted
  useEffect(() => {
    if (didScroll.current) return;
    const timer = setInterval(() => {
      if (apiRef.current) {
        apiRef.current.scrollToContent(undefined, { fitToContent: true });
        didScroll.current = true;
        clearInterval(timer);
      }
    }, 300);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ExcalidrawWrapper
        initialData={{
          elements: elements as never,
          appState: {
            viewBackgroundColor: resolvedTheme === "dark" ? "#1e1e1e" : "#ffffff",
          },
        }}
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => { apiRef.current = api; }}
        viewModeEnabled={true}
        zenModeEnabled={true}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            export: false,
            loadScene: false,
            saveAsImage: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
      />
    </div>
  );
}
