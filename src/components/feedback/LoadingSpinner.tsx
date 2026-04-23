interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="relative flex items-center justify-center h-12 w-12">
        {/* Outer ring – slow clockwise */}
        <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-2 border-transparent border-t-violet-500 border-r-violet-500/30" />
        {/* Middle ring – fast counter-clockwise */}
        <div className="absolute inset-1.5 h-9 w-9 animate-spin [animation-duration:0.8s] [animation-direction:reverse] rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400/30" />
        {/* Inner ring – medium clockwise */}
        <div className="absolute inset-3 h-6 w-6 animate-spin [animation-duration:1.5s] rounded-full border-2 border-transparent border-t-violet-300" />
        {/* Central glow dot */}
        <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_10px_oklch(0.72_0.25_285)]" />
      </div>
      <p className="text-sm text-muted-foreground animate-[pulse_3s_ease-in-out_infinite]">
        {message ?? "Processing…"}
      </p>
    </div>
  );
}
