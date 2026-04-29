import { cn } from "@/lib/utils";

export type TrafficLightColor = "red" | "yellow" | "green";

const BG: Record<TrafficLightColor, string> = {
  red: "bg-[radial-gradient(circle_at_35%_30%,#ff9a9a_0%,#ee5550_50%,#c4302a_90%)]",
  yellow:
    "bg-[radial-gradient(circle_at_35%_30%,#ffec8a_0%,#f5b73a_50%,#c8902a_90%)]",
  green:
    "bg-[radial-gradient(circle_at_35%_30%,#a8ff8a_0%,#4ada48_50%,#2ba830_90%)]",
};

interface TrafficLightProps extends React.HTMLAttributes<HTMLSpanElement> {
  color: TrafficLightColor;
}

export function TrafficLight({ color, className, ...rest }: TrafficLightProps) {
  return (
    <span
      {...rest}
      className={cn(
        "relative inline-block w-4 h-4 rounded-full",
        "border border-black/50",
        "shadow-[inset_0_-3px_4px_rgba(0,0,0,0.25)]",
        BG[color],
        // highlight blanc top-left
        "after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:w-[7px] after:h-[5px]",
        "after:rounded-full after:bg-white/90 after:blur-[0.5px]",
        className,
      )}
    />
  );
}
