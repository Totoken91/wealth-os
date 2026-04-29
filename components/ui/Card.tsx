import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
}

export function Card({ header, className, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        "relative overflow-hidden mb-[14px]",
        "bg-white/[0.78] backdrop-blur-md",
        "border border-blueberry-700/25 rounded-[14px]",
        "px-[18px] py-4",
        "shadow-[inset_0_1.5px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(0,0,0,0.08),0_4px_12px_rgba(40,80,130,0.12),0_2px_4px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[30%] rounded-t-[14px] pointer-events-none bg-gradient-to-b from-white/50 to-transparent"
      />
      <div className="relative z-[1]">
        {header ? (
          <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80 [text-shadow:0_1px_0_rgba(255,255,255,0.8)] mb-[10px]">
            ◆ {header}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
