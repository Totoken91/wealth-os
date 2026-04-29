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
        "relative z-10 mx-auto my-6 w-[1100px] max-w-[calc(100%-32px)]",
        "rounded-[24px] p-1",
        // plastique bleuté translucide
        "bg-[linear-gradient(135deg,rgba(180,220,250,0.4)_0%,rgba(120,180,230,0.3)_50%,rgba(80,140,200,0.4)_100%)]",
        "backdrop-blur-[30px] backdrop-saturate-[1.4]",
        // bordure plastique 2px + highlight inner top + ombre portée importante
        "shadow-[0_0_0_2px_rgba(40,80,130,0.5),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.15),0_30px_80px_rgba(0,30,80,0.4),0_10px_30px_rgba(0,0,0,0.3)]",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-[20px] overflow-hidden",
          "bg-[rgba(248,250,253,0.92)] backdrop-blur-[10px]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
