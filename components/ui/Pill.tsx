import { cn } from "@/lib/utils";

export type PillFlavor = "etf" | "crypto" | "stock" | "cash" | "vehicle";

const FLAVORS: Record<PillFlavor, string> = {
  etf: "bg-gradient-to-b from-[#b8e0f8] via-[#6ab4e0] to-[#3a8acc] text-[#0a3a6a]",
  crypto:
    "bg-gradient-to-b from-[#e0b8e8] via-[#b878d0] to-[#8a48b0] text-[#4a0a6a]",
  stock:
    "bg-gradient-to-b from-[#d8f0a8] via-[#98d048] to-[#6aa820] text-[#2a4a08]",
  cash: "bg-gradient-to-b from-[#ffc0c8] via-[#f06878] to-[#c83040] text-[#5a0a18]",
  vehicle:
    "bg-gradient-to-b from-[#ffd0a8] via-[#f5984a] to-[#d06820] text-[#6a2a0a]",
};

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  flavor: PillFlavor;
}

export function Pill({ flavor, className, children, ...rest }: PillProps) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-block px-[10px] py-[3px] rounded-[10px]",
        "text-[9.5px] font-extrabold uppercase tracking-[0.07em]",
        "border border-black/35",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]",
        "[text-shadow:0_1px_0_rgba(255,255,255,0.4)]",
        FLAVORS[flavor],
        className,
      )}
    >
      {children}
    </span>
  );
}
