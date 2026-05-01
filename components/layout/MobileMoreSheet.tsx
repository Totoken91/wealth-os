"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Flavor = "blue" | "orange" | "green" | "purple" | "pink";

interface MoreItem {
  label: string;
  href: string;
  flavor: Flavor;
  description?: string;
}

const ICON_BG: Record<Flavor, string> = {
  blue: "bg-gradient-to-b from-[#b8e0f8] to-[#5a9fd4]",
  orange: "bg-gradient-to-b from-[#ffd0a8] to-[#f08838]",
  green: "bg-gradient-to-b from-[#c8f0a8] to-[#6ac038]",
  purple: "bg-gradient-to-b from-[#e0b8e8] to-[#9a58c0]",
  pink: "bg-gradient-to-b from-[#ffc8d8] to-[#e858a0]",
};

const ITEMS: MoreItem[] = [
  { label: "Véhicules", href: "/vehicles", flavor: "pink", description: "Auto, moto, dépréciation" },
  { label: "Historique", href: "/history", flavor: "purple", description: "Snapshots & courbes" },
  { label: "Projection", href: "/projection", flavor: "blue", description: "Patrimoine futur" },
  { label: "Objectifs", href: "/goals", flavor: "orange", description: "Cibles & financement" },
  { label: "Préférences", href: "/settings", flavor: "green", description: "Rendement, taux, devise" },
  { label: "Sauvegarde", href: "/settings#backup", flavor: "pink", description: "Export / Import JSON" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileMoreSheet({ open, onClose }: Props) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-40">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />

      {/* Sheet */}
      <div
        className="
          absolute inset-x-0 bottom-0
          rounded-t-[20px] overflow-hidden
          bg-[rgba(248,250,253,0.97)] backdrop-blur-md
          border-t border-blueberry-700/25
          shadow-[0_-12px_30px_rgba(0,30,80,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]
          pb-[calc(env(safe-area-inset-bottom)+12px)]
        "
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
            ◆ Plus
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="h-8 w-8 -mr-2 grid place-items-center text-[16px] text-blueberry-900/60 hover:text-blueberry-900 leading-none"
          >
            ×
          </button>
        </div>

        <ul className="px-2 pb-2">
          {ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-[10px] transition-colors",
                    active
                      ? "bg-[linear-gradient(180deg,rgba(80,150,220,0.95)_0%,rgba(50,110,190,0.95)_100%)] text-white [text-shadow:0_-1px_0_rgba(0,0,0,0.4)]"
                      : "text-[#0a2a5a] hover:bg-blueberry-100/40 active:bg-blueberry-100/60",
                  )}
                >
                  <span
                    className={cn(
                      "w-7 h-7 rounded-[6px] shrink-0",
                      "border border-black/30",
                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.15)]",
                      ICON_BG[item.flavor],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold leading-tight">
                      {item.label}
                    </div>
                    {item.description && (
                      <div
                        className={cn(
                          "text-[11px] leading-tight mt-0.5",
                          active ? "text-white/80" : "text-blueberry-900/55",
                        )}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
