"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type IconFlavor = "blue" | "orange" | "green" | "purple" | "pink";

const ICON_BG: Record<IconFlavor, string> = {
  blue: "bg-gradient-to-b from-[#b8e0f8] to-[#5a9fd4]",
  orange: "bg-gradient-to-b from-[#ffd0a8] to-[#f08838]",
  green: "bg-gradient-to-b from-[#c8f0a8] to-[#6ac038]",
  purple: "bg-gradient-to-b from-[#e0b8e8] to-[#9a58c0]",
  pink: "bg-gradient-to-b from-[#ffc8d8] to-[#e858a0]",
};

interface NavItem {
  label: string;
  href: string;
  icon: IconFlavor;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Navigation",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "blue" },
      { label: "Saisie DCA", href: "/dca", icon: "orange" },
      { label: "Positions", href: "/positions", icon: "green" },
      { label: "Comptes", href: "/accounts", icon: "purple" },
      { label: "Véhicules", href: "/vehicles", icon: "pink" },
    ],
  },
  {
    title: "Analyse",
    items: [
      { label: "Historique", href: "/history", icon: "purple" },
      { label: "Projection", href: "/projection", icon: "blue" },
      { label: "Objectifs", href: "/goals", icon: "orange" },
    ],
  },
  {
    title: "Système",
    items: [
      { label: "Préférences", href: "/settings", icon: "green" },
      { label: "Sauvegarde", href: "/settings#backup", icon: "pink" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="
        w-[210px] shrink-0 py-[14px]
        bg-[linear-gradient(180deg,rgba(180,220,250,0.45)_0%,rgba(140,195,235,0.4)_50%,rgba(110,175,220,0.45)_100%)]
        border-r border-[rgba(50,90,140,0.25)]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]
      "
    >
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="px-4 pt-[10px] pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[rgba(20,50,90,0.7)] [text-shadow:0_1px_0_rgba(255,255,255,0.7)]">
            {section.title}
          </div>
          {section.items.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === "/dashboard" && pathname === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-[10px] px-4 py-[7px] text-[13px] transition-colors",
                  active
                    ? "bg-[linear-gradient(180deg,rgba(80,150,220,0.95)_0%,rgba(50,110,190,0.95)_50%,rgba(35,85,160,0.95)_100%)] text-white font-semibold [text-shadow:0_-1px_0_rgba(0,0,0,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]"
                    : "text-[#0a2a5a] [text-shadow:0_1px_0_rgba(255,255,255,0.5)] hover:bg-white/40",
                )}
              >
                <span
                  className={cn(
                    "w-[18px] h-[18px] rounded shrink-0",
                    "border border-black/30",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.15)]",
                    ICON_BG[item.icon],
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-4 px-4 py-2 text-[10.5px] text-[rgba(20,50,90,0.65)]">
        Dernière maj prix : il y a 3j
      </div>
    </aside>
  );
}
