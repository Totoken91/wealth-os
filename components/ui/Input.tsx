import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono, ...rest }, ref) => (
    <input
      ref={ref}
      {...rest}
      className={cn(
        "w-full h-9 px-3 rounded-[8px]",
        "text-[13px] text-[#0a2855]",
        "bg-white/95 border border-blueberry-700/40",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.7)]",
        "outline-none transition-shadow",
        "focus:border-blueberry-600 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_0_0_3px_rgba(58,138,204,0.35)]",
        "placeholder:text-[#0a2855]/35",
        "disabled:opacity-60",
        mono && "font-mono tabular-nums",
        className,
      )}
    />
  ),
);
Input.displayName = "Input";

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/80 [text-shadow:0_1px_0_rgba(255,255,255,0.7)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-[11px] text-blueberry-900/55">{hint}</span>
      ) : null}
    </label>
  );
}
