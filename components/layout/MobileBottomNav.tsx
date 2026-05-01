"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MobileMoreSheet } from "@/components/layout/MobileMoreSheet";
import { cn } from "@/lib/utils";

type Flavor = "blue" | "orange" | "green" | "purple" | "neutral";

interface NavItem {
  label: string;
  href?: string;
  flavor: Flavor;
  match?: (pathname: string) => boolean;
}

const ICON_BG: Record<Flavor, string> = {
  blue: "bg-gradient-to-b from-[#b8e0f8] to-[#5a9fd4]",
  orange: "bg-gradient-to-b from-[#ffd0a8] to-[#f08838]",
  green: "bg-gradient-to-b from-[#c8f0a8] to-[#6ac038]",
  purple: "bg-gradient-to-b from-[#e0b8e8] to-[#9a58c0]",
  neutral: "bg-gradient-to-b from-[#fafafa] to-[#c0c0c0]",
};

const PRIMARY: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", flavor: "blue" },
  { label: "DCA", href: "/dca", flavor: "orange" },
  { label: "Positions", href: "/positions", flavor: "green" },
  { label: "Comptes", href: "/accounts", flavor: "purple" },
];

// "Plus" is active when on a secondary route
const SECONDARY_ROUTES = [
  "/vehicles",
  "/history",
  "/projection",
  "/goals",
  "/settings",
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = SECONDARY_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  return (
    <>
      <nav
        className="
          md:hidden fixed bottom-0 inset-x-0 z-30
          bg-[linear-gradient(180deg,rgba(240,245,252,0.96)_0%,rgba(215,225,240,0.96)_100%)]
          border-t border-[rgba(50,90,140,0.25)]
          shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_-4px_12px_rgba(0,30,80,0.08)]
          backdrop-blur-md
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <ul className="flex items-stretch">
          {PRIMARY.map((item) => {
            const href = item.href as string;
            const active =
              pathname === href ||
              (href === "/dashboard" && pathname === "/") ||
              pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                    active
                      ? "text-[#0a3a8a]"
                      : "text-blueberry-900/65 hover:text-blueberry-900",
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-[5px]",
                      "border border-black/30",
                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.12)]",
                      ICON_BG[item.flavor],
                      active && "ring-2 ring-blueberry-600/60 ring-offset-1 ring-offset-transparent",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] tracking-[0.02em] leading-none mt-1",
                      active ? "font-extrabold" : "font-semibold",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "w-full flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                moreActive || moreOpen
                  ? "text-[#0a3a8a]"
                  : "text-blueberry-900/65 hover:text-blueberry-900",
              )}
            >
              <span
                className={cn(
                  "w-6 h-6 rounded-[5px] grid place-items-center",
                  "border border-black/30",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.12)]",
                  ICON_BG.neutral,
                  (moreActive || moreOpen) &&
                    "ring-2 ring-blueberry-600/60 ring-offset-1 ring-offset-transparent",
                )}
              >
                <span className="text-[12px] leading-none text-blueberry-900/80">
                  •••
                </span>
              </span>
              <span
                className={cn(
                  "text-[10px] tracking-[0.02em] leading-none mt-1",
                  (moreActive || moreOpen) ? "font-extrabold" : "font-semibold",
                )}
              >
                Plus
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
