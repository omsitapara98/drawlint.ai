"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ReviewLevel } from "@/types/feedback";

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  topicSlug: string;
  topicName: string;
  elements: unknown[];
}

type SubmitStep = "confirm" | "uploading" | "analyzing" | "done" | "error";

const LEVELS: ReviewLevel[] = ["mid", "senior", "staff", "deep"];

export default function SubmitDialog({
  open,
  onOpenChange,
  topicId,
  topicSlug,
  topicName,
  elements,
}: SubmitDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<SubmitStep>("confirm");
  const [reviewLevel, setReviewLevel] = useState<ReviewLevel>("senior");
  const [error, setError] = useState<string | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setStep("uploading");
    setError(null);

    // Fetch user's aiMode from server to decide whether to send credentials
    let apiKey: string | undefined;
    let endpoint: string | undefined;
    let deployment: string | undefined;
    try {
      const settingsRes = await fetch("/api/user/settings");
      if (settingsRes.ok) {
        const settings = (await settingsRes.json()) as { aiMode?: string };
        // Only send credentials if user's mode is NOT managed
        if (settings.aiMode && settings.aiMode !== "managed") {
          const { getCredentialsForRequest } = await import("@/lib/storage/ai-config");
          const creds = getCredentialsForRequest(settings.aiMode as "gemini" | "azure");
          apiKey = creds.apiKey;
          endpoint = creds.endpoint;
          deployment = creds.deployment;
        }
      }
    } catch { /* noop — server will use managed mode */ }

    try {
      setStep("analyzing");
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          elements,
          reviewLevel,
          apiKey,
          endpoint,
          deployment,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Submission failed (${res.status})`);
      }

      const data = (await res.json()) as {
        design: { _id: string };
        review: unknown;
      };
      setDesignId(data.design._id);
      setStep("done");

      // Redirect after brief delay
      setTimeout(() => {
        router.push(`/library/${topicSlug}/${data.design._id}`);
      }, 1500);
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  }, [topicId, topicSlug, elements, reviewLevel, router]);

  const handleRetry = useCallback(() => {
    setStep("confirm");
    setError(null);
  }, []);

  const handleClose = useCallback(
    (val: boolean) => {
      if (step === "uploading" || step === "analyzing") return; // don't close during submit
      if (!val) {
        setStep("confirm");
        setError(null);
      }
      onOpenChange(val);
    },
    [step, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "done" ? "Submitted!" : "Submit Design"}
          </DialogTitle>
          <DialogDescription>
            {step === "confirm" && "Submit your design to the community library for AI review."}
            {step === "uploading" && "Uploading your design..."}
            {step === "analyzing" && "Running AI review — this may take a minute..."}
            {step === "done" && "Your design has been submitted and reviewed!"}
            {step === "error" && "Something went wrong. Please try again."}
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" && (
          <div className="space-y-4">
            {/* Topic */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Topic</p>
              <p className="mt-0.5 text-sm font-medium">{topicName}</p>
            </div>

            {/* Level selector */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Review Level</p>
              <div className="flex h-9 items-center rounded-full border bg-background p-0.5">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setReviewLevel(lvl)}
                    className={`h-8 rounded-full px-3 text-xs font-medium transition-all ${
                      reviewLevel === lvl
                        ? "bg-violet-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lvl === "deep" ? "Deep" : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(step === "uploading" || step === "analyzing") && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm text-muted-foreground">
              {step === "uploading" ? "Uploading..." : "Analyzing..."}
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm text-muted-foreground">Redirecting to your design...</p>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          </div>
        )}

        <DialogFooter>
          {step === "confirm" && (
            <Button
              onClick={handleSubmit}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              Submit to Library
            </Button>
          )}
          {step === "error" && (
            <Button onClick={handleRetry} variant="outline">
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
