"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const ExcalidrawWrapper = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return { default: mod.Excalidraw };
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading canvas…</div>
      </div>
    ),
  },
);

interface DiagramCanvasProps {
  onChange?: (elements: readonly ExcalidrawElement[]) => void;
  initialData?: ExcalidrawElement[];
}

export default function DiagramCanvas({
  onChange,
  initialData,
}: DiagramCanvasProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    import("@excalidraw/excalidraw/index.css" as string);
  }, []);

  const excalidrawTheme = mounted && resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div className="relative w-full h-full">
      <ExcalidrawWrapper
        theme={excalidrawTheme}
        initialData={{
          elements: initialData ?? [],
          appState: { theme: excalidrawTheme },
        }}
        onChange={(elements) => {
          onChange?.(elements);
        }}
      />
    </div>
  );
}
