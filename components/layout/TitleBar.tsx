"use client";

import { usePathname } from "next/navigation";
import { TrafficLight } from "@/components/ui/TrafficLight";
import { resolveTitle } from "@/lib/page-title";

export function TitleBar() {
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  return (
    <div
      className="
        relative h-[42px] hidden md:flex items-center px-[14px]
        bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(220,230,245,0.85)_30%,rgba(180,200,225,0.85)_70%,rgba(150,180,210,0.9)_100%)]
        border-b border-[rgba(50,90,140,0.3)]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
      "
    >
      <div className="flex gap-[9px]">
        <TrafficLight color="red" />
        <TrafficLight color="yellow" />
        <TrafficLight color="green" />
      </div>
      <div
        className="
          absolute left-1/2 -translate-x-1/2
          text-[13px] font-semibold tracking-[0.02em]
          text-[#1a3a6a]
          [text-shadow:0_1px_0_rgba(255,255,255,0.9)]
        "
      >
        {title}
      </div>
    </div>
  );
}
