export const PAGE_TITLES: Record<string, string> = {
  "/": "Wealth OS — Tableau de bord",
  "/dashboard": "Wealth OS — Tableau de bord",
  "/dca": "Wealth OS — Saisie DCA",
  "/positions": "Wealth OS — Positions",
  "/accounts": "Wealth OS — Comptes",
  "/vehicles": "Wealth OS — Véhicules",
  "/history": "Wealth OS — Historique",
  "/projection": "Wealth OS — Projection",
  "/goals": "Wealth OS — Objectifs",
  "/settings": "Wealth OS — Préférences",
  "/kitchen": "Wealth OS — Kitchen",
};

const SHORT_TITLES: Record<string, string> = {
  "/": "Tableau de bord",
  "/dashboard": "Tableau de bord",
  "/dca": "Saisie DCA",
  "/positions": "Positions",
  "/accounts": "Comptes",
  "/vehicles": "Véhicules",
  "/history": "Historique",
  "/projection": "Projection",
  "/goals": "Objectifs",
  "/settings": "Préférences",
  "/kitchen": "Kitchen",
};

export function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const root = "/" + pathname.split("/").filter(Boolean)[0];
  return PAGE_TITLES[root] ?? "Wealth OS";
}

export function resolveShortTitle(pathname: string): string {
  if (SHORT_TITLES[pathname]) return SHORT_TITLES[pathname];
  const root = "/" + pathname.split("/").filter(Boolean)[0];
  return SHORT_TITLES[root] ?? "Wealth OS";
}
