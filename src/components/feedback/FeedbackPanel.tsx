"use client";

import type { DiagramFeedback, FeedbackItem, AnalysisStatus } from "@/types/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "./LoadingSpinner";

interface FeedbackPanelProps {
  feedback: DiagramFeedback | null;
  status: AnalysisStatus;
  error?: string;
}

function getScoreColor(score: number): string {
  if (score < 40) return "text-red-500";
  if (score <= 70) return "text-yellow-500";
  return "text-green-500";
}

function getScoreBg(score: number): string {
  if (score < 40) return "bg-red-500/10 ring-red-500/30";
  if (score <= 70) return "bg-yellow-500/10 ring-yellow-500/30";
  return "bg-green-500/10 ring-green-500/30";
}

function severityVariant(severity: FeedbackItem["severity"]) {
  switch (severity) {
    case "critical":
      return "destructive" as const;
    case "warning":
      return "secondary" as const;
    case "info":
      return "outline" as const;
  }
}

function severityLabel(severity: FeedbackItem["severity"]): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    case "info":
      return "Info";
  }
}

function FeedbackItemCard({ item }: { item: FeedbackItem }) {
  return (
    <Card className="gap-2">
      <CardHeader className="flex-row items-center gap-2 pb-0">
        <Badge variant={severityVariant(item.severity)}>
          {severityLabel(item.severity)}
        </Badge>
        <CardTitle className="text-sm font-bold">{item.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{item.description}</p>
        {item.affectedComponents && item.affectedComponents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.affectedComponents.map((comp) => (
              <Badge key={comp} variant="outline" className="text-xs">
                {comp}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemList({ items }: { items: FeedbackItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No issues found ✓
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2 pt-2">
      {items.map((item, i) => (
        <FeedbackItemCard key={`${item.title}-${i}`} item={item} />
      ))}
    </div>
  );
}

function tabLabel(name: string, count: number): string {
  return `${name} (${count})`;
}

export function FeedbackPanel({ feedback, status, error }: FeedbackPanelProps) {
  // Idle state
  if (status === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">
          ✏️
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Ready to analyze</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your analysis will appear here
          </p>
        </div>
      </div>
    );
  }

  // Analyzing state
  if (status === "analyzing") {
    return <LoadingSpinner message="Analyzing your design..." />;
  }

  // Error state
  if (status === "error") {
    return (
      <div className="p-4">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-red-500">Analysis Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-400">
              {error ?? "An unexpected error occurred."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete state without feedback (shouldn't happen but handle gracefully)
  if (!feedback) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-center text-sm text-muted-foreground">
          No feedback available.
        </p>
      </div>
    );
  }

  // Complete state with feedback
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        {/* Score */}
        <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 p-4">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-2xl ring-4 ${getScoreBg(feedback.score)} shadow-sm`}
          >
            <span className={`text-3xl font-bold ${getScoreColor(feedback.score)}`}>
              {feedback.score}
            </span>
          </div>
          <div>
            <p className="text-base font-semibold">Design Score</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div>
          <h3 className="mb-1 text-sm font-semibold">Summary</h3>
          <p className="text-sm text-muted-foreground">{feedback.summary}</p>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="scalability">
          <TabsList className="w-full flex-wrap">
            <TabsTrigger value="scalability">
              {tabLabel("Scalability", feedback.scalabilityIssues.length)}
            </TabsTrigger>
            <TabsTrigger value="bottlenecks">
              {tabLabel("Bottlenecks", feedback.bottlenecks.length)}
            </TabsTrigger>
            <TabsTrigger value="spof">
              {tabLabel("SPOFs", feedback.singlePointsOfFailure.length)}
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              {tabLabel("Suggestions", feedback.suggestions.length)}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scalability">
            <ItemList items={feedback.scalabilityIssues} />
          </TabsContent>
          <TabsContent value="bottlenecks">
            <ItemList items={feedback.bottlenecks} />
          </TabsContent>
          <TabsContent value="spof">
            <ItemList items={feedback.singlePointsOfFailure} />
          </TabsContent>
          <TabsContent value="suggestions">
            <ItemList items={feedback.suggestions} />
          </TabsContent>
        </Tabs>

        {/* Follow-up Questions */}
        {feedback.followUpQuestions.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="mb-2 text-sm font-semibold">Follow-up Questions</h3>
              <ol className="list-inside list-decimal space-y-1">
                {feedback.followUpQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {q}
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
