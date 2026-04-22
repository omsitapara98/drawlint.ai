"use client";

import dynamic from "next/dynamic";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const ExcalidrawWrapper = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return { default: mod.Excalidraw };
  },
  { ssr: false },
);

interface DiagramCanvasProps {
  onChange?: (elements: readonly ExcalidrawElement[]) => void;
  initialData?: ExcalidrawElement[];
}

export default function DiagramCanvas({
  onChange,
  initialData,
}: DiagramCanvasProps) {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ExcalidrawWrapper
        initialData={{
          elements: initialData ?? [],
          appState: {
            theme: prefersDark ? "dark" : "light",
          },
        }}
        onChange={(elements) => {
          onChange?.(elements);
        }}
      />
    </div>
  );
}
