import { cn } from "@/lib/utils";

export type DeltaTone = "pos" | "neg" | "neutral";

const TONES: Record<DeltaTone, string> = {
  pos: "bg-gradient-to-b from-[#c8f0a0] via-[#7ac848] to-[#5aa830] text-[#1a4a08] [text-shadow:0_1px_0_rgba(255,255,255,0.5)]",
  neg: "bg-gradient-to-b from-[#ffb4be] via-[#e84858] to-[#a02030] text-[#5a0a18] [text-shadow:0_1px_0_rgba(255,255,255,0.4)]",
  neutral:
    "bg-gradient-to-b from-[#f0e8b8] via-[#d8c878] to-[#b8a858] text-[#4a3a08] [text-shadow:0_1px_0_rgba(255,255,255,0.5)]",
};

interface PillDeltaProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: DeltaTone;
}

export function PillDelta({
  tone,
  className,
  children,
  ...rest
}: PillDeltaProps) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-[5px] rounded-[14px]",
        "text-[12px] font-bold",
        "border border-black/30",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.1)]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
