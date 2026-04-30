import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "neutral"
  | "tangerine"
  | "grape"
  | "lime"
  | "blueberry"
  | "strawberry";

const VARIANTS: Record<ButtonVariant, string> = {
  // gradient #fafafa → #d8d8d8 → #c0c0c0, dark text
  neutral:
    "bg-gradient-to-b from-[#fafafa] via-[#d8d8d8] to-[#c0c0c0] text-[#1a1a1a] [text-shadow:0_1px_0_rgba(255,255,255,0.6)] border-black/40",
  // primary, tangerine
  tangerine:
    "bg-gradient-to-b from-[#ff9a4a] via-[#f06820] to-[#c84810] text-white [text-shadow:0_-1px_0_rgba(0,0,0,0.3)] border-[rgba(120,40,0,0.6)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.2),0_2px_4px_rgba(180,70,20,0.4)]",
  grape:
    "bg-gradient-to-b from-[#c898e8] via-[#9858c8] to-[#6828a0] text-white [text-shadow:0_-1px_0_rgba(0,0,0,0.3)] border-[rgba(70,20,100,0.6)]",
  lime: "bg-gradient-to-b from-[#b8e060] via-[#80c020] to-[#5a9008] text-white [text-shadow:0_-1px_0_rgba(0,0,0,0.3)] border-[rgba(40,80,0,0.6)]",
  blueberry:
    "bg-gradient-to-b from-[#6ec0f0] via-[#3a7fc4] to-[#2a5a9a] text-white [text-shadow:0_-1px_0_rgba(0,0,0,0.3)] border-[rgba(0,40,90,0.6)]",
  strawberry:
    "bg-gradient-to-b from-[#ff9a8a] via-[#e85648] to-[#b02818] text-white [text-shadow:0_-1px_0_rgba(0,0,0,0.3)] border-[rgba(110,20,10,0.6)]",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "neutral", className, type = "button", ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        {...rest}
        className={cn(
          "inline-flex items-center justify-center h-9 px-4",
          "rounded-[18px] text-[12px] font-bold",
          "border",
          "shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.15)]",
          "transition-[transform,filter,box-shadow] duration-100",
          "hover:brightness-[1.05]",
          "active:translate-y-[1px] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]",
          "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(58,138,204,0.5)]",
          "disabled:opacity-50 disabled:pointer-events-none",
          VARIANTS[variant],
          className,
        )}
      />
    );
  },
);
Button.displayName = "Button";
