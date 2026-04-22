"use client";

import type { SectionContents } from "@/types/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FeedbackPanelProps {
  sections: SectionContents | null;
}

const SECTION_LABELS: { key: keyof SectionContents; label: string }[] = [
  { key: "functionalRequirements", label: "Functional Requirements" },
  { key: "assumptions", label: "Assumptions" },
  { key: "nonFunctionalRequirements", label: "Non-Functional Requirements" },
  { key: "coreEntities", label: "Core Entities" },
  { key: "capacityCalculations", label: "Capacity Calculations" },
  { key: "apiRoutes", label: "API Routes" },
  { key: "hld", label: "High-Level Design" },
];

export function FeedbackPanel({ sections }: FeedbackPanelProps) {
  if (!sections) {
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

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-4">
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
      </div>
    </ScrollArea>
  );
}
