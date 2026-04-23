"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ExcalidrawWrapper = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return { default: mod.Excalidraw };
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-background">
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Loading viewer…</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ExcalidrawWrapper
        initialData={{ elements: elements as never }}
        viewModeEnabled={true}
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
