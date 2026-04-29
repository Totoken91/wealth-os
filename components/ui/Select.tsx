import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  mono?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, mono, children, ...rest }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        {...rest}
        className={cn(
          "w-full h-9 pl-3 pr-9 rounded-[8px] appearance-none",
          "text-[13px] text-[#0a2855]",
          "bg-white/95 border border-blueberry-700/40",
          "shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.7)]",
          "outline-none transition-shadow",
          "focus:border-blueberry-600 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_0_0_3px_rgba(58,138,204,0.35)]",
          "disabled:opacity-60",
          mono && "font-mono tabular-nums",
          className,
        )}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-blueberry-700/70"
      >
        ▼
      </span>
    </div>
  ),
);
Select.displayName = "Select";
