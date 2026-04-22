interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-violet-500" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        {message ?? "Processing…"}
      </p>
    </div>
  );
}
