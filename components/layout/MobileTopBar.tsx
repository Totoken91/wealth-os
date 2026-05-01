"use client";

import { usePathname } from "next/navigation";
import { resolveShortTitle } from "@/lib/page-title";

export function MobileTopBar() {
  const pathname = usePathname();
  const title = resolveShortTitle(pathname);
  return (
    <header
      className="
        md:hidden sticky top-0 z-20
        h-11 flex items-center justify-between px-4
        bg-[linear-gradient(180deg,rgba(240,245,252,0.96)_0%,rgba(215,225,240,0.96)_100%)]
        border-b border-[rgba(50,90,140,0.2)]
        backdrop-blur-md
        shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
      "
    >
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/75 [text-shadow:0_1px_0_rgba(255,255,255,0.7)]">
        ◆ Wealth OS
      </div>
      <div className="text-[13px] font-semibold tracking-[0.01em] text-[#1a3a6a] [text-shadow:0_1px_0_rgba(255,255,255,0.8)]">
        {title}
      </div>
    </header>
  );
}
