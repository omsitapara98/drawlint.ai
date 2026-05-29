import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const STORAGE_KEY = "drawlint:diagram";
const EXPLANATION_KEY = "drawlint:hld-explanation";

export function saveDiagram(elements: ExcalidrawElement[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadDiagram(): ExcalidrawElement[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExcalidrawElement[];
  } catch {
    return null;
  }
}

export function clearDiagram(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently ignore
  }
}

export function saveExplanation(text: string): void {
  try {
    localStorage.setItem(EXPLANATION_KEY, text);
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadExplanation(): string {
  try {
    return localStorage.getItem(EXPLANATION_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearExplanation(): void {
  try {
    localStorage.removeItem(EXPLANATION_KEY);
  } catch {
    // silently ignore
  }
}
