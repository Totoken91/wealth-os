import { cn } from "@/lib/utils";

export function WindowFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative z-10 w-full",
        "md:mx-auto md:my-6 md:w-[1100px] md:max-w-[calc(100%-32px)]",
        "md:rounded-[24px] md:p-1",
        // plastique bleuté translucide (desktop only)
        "md:bg-[linear-gradient(135deg,rgba(180,220,250,0.4)_0%,rgba(120,180,230,0.3)_50%,rgba(80,140,200,0.4)_100%)]",
        "md:backdrop-blur-[30px] md:backdrop-saturate-[1.4]",
        // bordure plastique + highlight + ombre lourde — desktop only
        "md:shadow-[0_0_0_2px_rgba(40,80,130,0.5),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.15),0_30px_80px_rgba(0,30,80,0.4),0_10px_30px_rgba(0,0,0,0.3)]",
        className,
      )}
    >
      <div
        className={cn(
          "overflow-hidden",
          "md:rounded-[20px]",
          "bg-[rgba(248,250,253,0.92)]",
          "md:backdrop-blur-[10px]",
          "md:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
