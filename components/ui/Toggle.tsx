import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelOn?: string;
  labelOff?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  labelOn = "On",
  labelOff = "Off",
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 select-none",
        "h-9 px-1 rounded-full",
        "border border-black/35",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.15),0_1px_0_rgba(255,255,255,0.6)]",
        checked
          ? "bg-gradient-to-b from-[#6ec0f0] via-[#3a7fc4] to-[#2a5a9a] text-white"
          : "bg-gradient-to-b from-[#fafafa] via-[#d8d8d8] to-[#c0c0c0] text-[#1a1a1a]",
        "transition-colors",
        className,
      )}
    >
      <span
        className={cn(
          "block w-7 h-7 rounded-full",
          "bg-gradient-to-b from-white to-[#d0d0d0]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.25)]",
          "transition-transform",
          checked ? "translate-x-0" : "translate-x-0",
        )}
      />
      <span className="px-2 text-[11px] font-bold uppercase tracking-wider [text-shadow:0_1px_0_rgba(255,255,255,0.4)]">
        {checked ? labelOn : labelOff}
      </span>
    </button>
  );
}
