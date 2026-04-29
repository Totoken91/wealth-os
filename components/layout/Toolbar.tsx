"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type DotFlavor = "blueberry" | "tangerine" | "lime" | "strawberry" | "grape";

const DOTS: Record<DotFlavor, string> = {
  blueberry: "bg-gradient-to-b from-[#b8e0f8] to-[#3a8acc]",
  tangerine: "bg-gradient-to-b from-[#ffd0a8] to-[#d06820]",
  lime: "bg-gradient-to-b from-[#d8f0a8] to-[#6aa820]",
  strawberry: "bg-gradient-to-b from-[#ffc0c8] to-[#c83040]",
  grape: "bg-gradient-to-b from-[#e0b8e8] to-[#8a48b0]",
};

interface TabDef {
  label: string;
  href: string;
  flavor: DotFlavor;
}

const TABS: TabDef[] = [
  { label: "Dashboard", href: "/dashboard", flavor: "blueberry" },
  { label: "DCA", href: "/dca", flavor: "tangerine" },
  { label: "Positions", href: "/positions", flavor: "lime" },
  { label: "Véhicules", href: "/vehicles", flavor: "strawberry" },
  { label: "Historique", href: "/history", flavor: "grape" },
  { label: "Projection", href: "/projection", flavor: "blueberry" },
  { label: "Objectifs", href: "/goals", flavor: "tangerine" },
];

export function Toolbar() {
  const pathname = usePathname();
  return (
    <div
      className="
        h-14 flex items-center gap-[6px] px-[14px]
        bg-[linear-gradient(180deg,rgba(240,245,252,0.95)_0%,rgba(215,225,240,0.95)_100%)]
        border-b border-[rgba(50,90,140,0.2)]
        overflow-x-auto
      "
    >
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Tab key={tab.href} tab={tab} active={active} />
        );
      })}
    </div>
  );
}

function Tab({ tab, active }: { tab: TabDef; active: boolean }) {
  return (
    <Link
      href={tab.href}
      className={cn(
        "inline-flex items-center gap-[6px] h-[34px] px-4 rounded-[17px]",
        "text-[12px] font-semibold whitespace-nowrap",
        "border transition-[filter,box-shadow] duration-100",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.15)]",
        "hover:brightness-[1.05]",
        active
          ? "bg-gradient-to-b from-[#6ec0f0] via-[#3a7fc4] to-[#2a5a9a] text-white border-black/50 [text-shadow:0_-1px_0_rgba(0,0,0,0.4)]"
          : "bg-gradient-to-b from-[#fafafa] via-[#d8d8d8] to-[#c0c0c0] text-[#1a1a1a] border-black/35 [text-shadow:0_1px_0_rgba(255,255,255,0.6)]",
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full border border-black/30",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
          DOTS[tab.flavor],
        )}
      />
      {tab.label}
    </Link>
  );
}
