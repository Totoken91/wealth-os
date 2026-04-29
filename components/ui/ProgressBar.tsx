import { cn } from "@/lib/utils";

export type ProgressFlavor =
  | "tangerine"
  | "blueberry"
  | "lime"
  | "grape"
  | "strawberry";

const FILL: Record<ProgressFlavor, string> = {
  tangerine:
    "bg-gradient-to-b from-[#ff9a4a] via-[#f06820] to-[#c84810] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(120,30,0,0.4)]",
  blueberry:
    "bg-gradient-to-b from-[#6ec0f0] via-[#3a7fc4] to-[#2a5a9a] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,30,80,0.4)]",
  lime: "bg-gradient-to-b from-[#b8e060] via-[#80c020] to-[#5a9008] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(40,80,0,0.4)]",
  grape:
    "bg-gradient-to-b from-[#c898e8] via-[#9858c8] to-[#6828a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(70,20,100,0.4)]",
  strawberry:
    "bg-gradient-to-b from-[#ff98a8] via-[#e84858] to-[#a02030] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(120,0,20,0.4)]",
};

interface ProgressBarProps {
  value: number; // 0..100
  flavor?: ProgressFlavor;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  flavor = "tangerine",
  animated = true,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-[18px] w-full rounded-[10px] overflow-hidden",
        "bg-gradient-to-b from-black/10 to-black/5",
        "border border-blueberry-700/40",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.15),0_1px_0_rgba(255,255,255,0.7)]",
        className,
      )}
    >
      <div
        className={cn("relative h-full transition-[width] duration-300", FILL[flavor])}
        style={{ width: `${clamped}%` }}
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.2)_0_4px,transparent_4px_8px)]",
            animated && "animate-stripes",
          )}
        />
      </div>
    </div>
  );
}
