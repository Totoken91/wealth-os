"use client";

import { forwardRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > {
  /** Numeric value. `undefined` renders an empty field. */
  value: number | undefined;
  /** Called with the parsed number, or `undefined` when the field is cleared. */
  onChange: (value: number | undefined) => void;
  mono?: boolean;
  /** Allow negative numbers (default: false). */
  allowNegative?: boolean;
  /** Maximum number of fractional digits accepted (default: 12). */
  maxDecimals?: number;
}

const sanitize = (raw: string, allowNegative: boolean, maxDecimals: number) => {
  // Replace comma with dot for normalization
  let s = raw.replace(",", ".");
  // Strip anything that isn't a digit, dot, or leading minus
  s = s.replace(/[^\d.\-]/g, "");
  // Only allow a leading minus
  if (allowNegative) {
    const negative = s.startsWith("-");
    s = (negative ? "-" : "") + s.replace(/-/g, "");
  } else {
    s = s.replace(/-/g, "");
  }
  // Only one dot
  const firstDot = s.indexOf(".");
  if (firstDot >= 0) {
    s =
      s.slice(0, firstDot + 1) +
      s.slice(firstDot + 1).replace(/\./g, "");
  }
  // Cap fractional digits
  const dotIdx = s.indexOf(".");
  if (dotIdx >= 0 && s.length - dotIdx - 1 > maxDecimals) {
    s = s.slice(0, dotIdx + 1 + maxDecimals);
  }
  return s;
};

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      className,
      mono,
      allowNegative = false,
      maxDecimals = 12,
      placeholder,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const externalText =
      value === undefined || Number.isNaN(value) ? "" : String(value);
    const [text, setText] = useState<string>(externalText);

    // Sync from outside when the parsed local text doesn't match the new value
    useEffect(() => {
      const localParsed = parseFloat(text.replace(",", "."));
      const valueIsEmpty = value === undefined || Number.isNaN(value);
      const textIsEmpty = text === "" || text === "-" || text === ".";
      if (valueIsEmpty && textIsEmpty) return;
      if (!valueIsEmpty && Number.isFinite(localParsed) && localParsed === value)
        return;
      setText(valueIsEmpty ? "" : String(value));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (raw: string) => {
      const cleaned = sanitize(raw, allowNegative, maxDecimals);
      setText(cleaned);
      if (cleaned === "" || cleaned === "-" || cleaned === ".") {
        onChange(undefined);
        return;
      }
      const parsed = parseFloat(cleaned);
      if (Number.isFinite(parsed)) {
        onChange(parsed);
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={(e) => {
          // Normalize trailing dot and leading dot
          if (text.endsWith(".") || text === "-" || text === ".") {
            const trimmed = text.replace(/\.$/, "");
            const parsed = parseFloat(trimmed);
            if (Number.isFinite(parsed)) {
              setText(String(parsed));
              onChange(parsed);
            } else {
              setText("");
              onChange(undefined);
            }
          }
          onBlur?.(e);
        }}
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
          mono !== false && "font-mono tabular-nums",
          className,
        )}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";
