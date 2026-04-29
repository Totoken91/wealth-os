# Wealth OS — Brief Claude Code

> Console de pilotage patrimonial personnelle, local-first, esthétique iMac G3 multicolore (plastique bonbon translucide).
> Stack : Next.js 14 (App Router) + TypeScript + Tailwind + Recharts + Zustand + localStorage (v1) → Supabase (v2).

---

## 1. Contexte et objectif

Application web personnelle pour piloter mon patrimoine sérieusement. Pas un Excel glorifié : un vrai outil avec courbes, projections, scénarios, dans une esthétique forte et personnelle.

**Cible utilisateur : moi seul** (v1). Pas d'auth en v1, tout en localStorage.

**Trois questions auxquelles l'app doit répondre instantanément :**
1. Où j'en suis aujourd'hui ?
2. Comment mon patrimoine évolue dans le temps ?
3. Où je vais si je continue mon rythme actuel — et si je fais un gros achat (voiture, immo) ?

**Principe directeur :** saisie manuelle = robustesse + zéro dépendance API + rapidité de dev. Optimiser pour la vitesse de saisie (le rituel hebdo doit prendre <30s).

---

## 2. Stack technique imposée

```
Framework      : Next.js 14 App Router (TypeScript, strict mode)
Styling        : Tailwind CSS (config custom — pas shadcn/ui, esthétique trop différente)
State          : Zustand (avec persist middleware → localStorage)
Charts         : Recharts (avec custom theme matching iMac G3 palette)
Icons          : lucide-react
Forms          : react-hook-form + zod (validation)
Dates          : date-fns
ID             : nanoid
Tables         : @tanstack/react-table
Notifs         : sonner (toasts customisés)
Tests          : Vitest + React Testing Library
```

**Pas de backend en v1.** Toute la donnée vit dans localStorage via Zustand persist. Architecture pensée pour migrer vers Supabase en v2 sans réécrire la logique métier.

---

## 3. Design system : "iMac G3 Multicolor"

### 3.1 Inspiration et principes

Hommage direct aux iMac G3 (1998-2001) : plastique translucide, formes organiques, 5 saveurs fruitées + Bondi Blue original. Pas du software Aqua poli — du **hardware bonbon**. Codes :

- **Translucidité** partout : backdrop-filter blur + saturate, pas de surfaces opaques
- **Bordures plastiques** : 1-2px sombres pour simuler le contour épais du plastique vu de profil
- **Highlights intérieurs blancs** en haut des éléments pour simuler la lumière qui traverse le plastique
- **Highlights horizontaux glossy** sur les boutons (style "lozenge Aqua")
- **Couleur fonctionnelle** : chaque catégorie a sa saveur, ce n'est pas décoratif
- **Densité d'info conservée** : sous le skin bonbon, c'est un outil pro avec tableaux denses et chiffres alignés en mono

### 3.2 Palette : 5 saveurs + 1 originale

Tailwind config custom à mettre dans `tailwind.config.ts` :

```typescript
colors: {
  // Blueberry — ETF / Primary
  blueberry: {
    50:  '#e6f1fb',
    100: '#b8e0f8',
    200: '#88c8ec',
    400: '#5a9fd4',
    500: '#3a8acc',
    600: '#2a6bb0',
    700: '#1a5f9a',
    800: '#0a3a6a',
    900: '#062855',
  },
  // Tangerine — Vehicle / Action primary
  tangerine: {
    50:  '#fff4e8',
    100: '#ffd0a8',
    200: '#ffb478',
    400: '#f5984a',
    500: '#f06820',
    600: '#d05810',
    700: '#a04408',
    800: '#6a2a0a',
    900: '#4a1c05',
  },
  // Lime — Stocks / Positive accent
  lime: {
    50:  '#f0f8e0',
    100: '#d8f0a8',
    200: '#b8e060',
    400: '#98d048',
    500: '#80c020',
    600: '#6aa820',
    700: '#5a9008',
    800: '#2a4a08',
    900: '#1a3005',
  },
  // Strawberry — Cash / Negative accent
  strawberry: {
    50:  '#ffe8ec',
    100: '#ffc0c8',
    200: '#ff98a8',
    400: '#f06878',
    500: '#e84858',
    600: '#c83040',
    700: '#a02030',
    800: '#5a0a18',
    900: '#3a040c',
  },
  // Grape — Crypto / Secondary action
  grape: {
    50:  '#f4ecf8',
    100: '#e0b8e8',
    200: '#c898d8',
    400: '#b878d0',
    500: '#9858c8',
    600: '#8a48b0',
    700: '#6828a0',
    800: '#4a0a6a',
    900: '#2a0440',
  },
  // Bondi — original 1998, neutral primary
  bondi: {
    50:  '#e0f0f4',
    100: '#a8d8e4',
    200: '#78c0d4',
    400: '#48a0bc',
    500: '#1d8aa8',
    600: '#106a85',
    700: '#0a4f65',
    800: '#063a4d',
    900: '#022530',
  },
}
```

### 3.3 Mapping fonctionnel

| Catégorie | Saveur | Usage |
|---|---|---|
| **ETF** | Blueberry | Pills, accents, par défaut |
| **Crypto** | Grape | Pills, secondary actions |
| **Stocks/Actions** | Lime | Pills, accents positifs |
| **Cash** | Strawberry | Pills, alertes neutres (PAS rouge) |
| **Véhicules** | Tangerine | Pills, primary CTA (saisie DCA) |
| **Neutre/UI** | Bondi | Sidebar, links, focus rings |

⚠️ **Règles sémantiques :**
- Vert/rouge restent réservés aux **gains/pertes** financières (utiliser `lime-700` pour gains et `strawberry-700` pour pertes — pas les couleurs catégorielles)
- Strawberry pour Cash ≠ Strawberry pour pertes (la teinte textuelle diffère : pill cash = `strawberry-800` sur fond gradient ; perte = `strawberry-700` sur fond blanc)

### 3.4 Typographie

Polices via `next/font` : Inter + JetBrains Mono.

CSS Variables :
```css
--font-sans: 'Inter', 'Lucida Grande', 'Helvetica Neue', sans-serif;
--font-mono: 'JetBrains Mono', 'Monaco', 'Lucida Console', monospace;
```

Règles :
- **Tous les chiffres financiers** en `font-mono tabular-nums`
- **Titres et chiffres clés** en `font-sans` weight 200-300 (light, élégant style Aqua)
- **Labels de section** : `text-[10px] font-extrabold uppercase tracking-wider`
- Le préfixe `◆` est utilisé devant les card headers (caractère diamant U+25C6)

### 3.5 Composants signatures

#### Card

```tsx
<div className="
  relative overflow-hidden
  bg-white/78 backdrop-blur-md
  border border-blueberry-700/25
  rounded-[14px] px-[18px] py-4
  shadow-[inset_0_1.5px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(0,0,0,0.08),0_4px_12px_rgba(40,80,130,0.12),0_2px_4px_rgba(0,0,0,0.06)]
  mb-[14px]
">
  <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-white/50 to-transparent rounded-t-[14px] pointer-events-none" />
  <div className="relative z-10">{children}</div>
</div>
```

#### NetWorthCard (hero, multicolore tri-saveur)

```tsx
<div className="
  relative overflow-hidden
  bg-gradient-to-br from-tangerine-100/70 via-blueberry-100/70 to-grape-100/70
  backdrop-blur-lg backdrop-saturate-[1.3]
  border-2 border-blueberry-700/40
  rounded-[18px] p-7
  shadow-[inset_0_2px_0_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.08),0_8px_24px_rgba(40,80,130,0.2)]
">
  {/* Reflets plastique top-left et bottom-right via radial-gradient */}
  <div className="absolute -top-[30%] -left-[10%] w-[60%] h-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,255,255,0.7)_0%,transparent_60%)] pointer-events-none" />
  <div className="absolute -bottom-[40%] -right-[10%] w-[50%] h-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,255,255,0.4)_0%,transparent_60%)] pointer-events-none" />
  
  <div className="relative z-10">
    <div className="text-[11px] font-extrabold uppercase tracking-wider text-blueberry-800/80 mb-1.5">
      ◆ {label}
    </div>
    <div className="font-sans text-[56px] font-extralight tracking-tight text-blueberry-900 leading-none">
      {formatEuro(value)}
    </div>
  </div>
</div>
```

#### Button (4 variantes saveur + 1 neutre)

Toutes les variantes partagent :
- `height: 36px`, `padding: 0 16px`, `border-radius: 18px`
- `font-weight: 700`, `font-size: 12px`
- `border: 1px solid rgba(0,0,0,0.4)`
- box-shadow combiné (highlight intérieur top + ombre intérieure bottom + drop-shadow)
- `text-shadow: 0 1px 0 rgba(255,255,255,0.6)` (ou inverse pour variants colorées)
- `transition: all 100ms`

Variantes (gradient + couleur texte) :
- **`btn-neutral`** : gradient `#fafafa → #d8d8d8 → #c0c0c0`, texte `#1a1a1a`
- **`btn-tangerine`** (primary) : gradient `tangerine-400 → tangerine-500 → tangerine-700`, texte blanc
- **`btn-grape`** : gradient `grape-200 → grape-500 → grape-700`, texte blanc
- **`btn-lime`** : gradient `lime-200 → lime-500 → lime-700`, texte blanc
- **`btn-blueberry`** : gradient `blueberry-200 → blueberry-500 → blueberry-700`, texte blanc

États :
- `:hover` → brightness 105%
- `:active` → `translateY(1px)` + shadow réduite
- `:focus-visible` → halo `box-shadow: 0 0 0 3px rgba(58,138,204,0.5)`

#### Pill catégorie

```tsx
<span className="
  inline-block px-2.5 py-0.5 rounded-[10px]
  text-[9.5px] font-extrabold uppercase tracking-wider
  border border-black/35
  shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]
">
```

Backgrounds (mapper selon catégorie) :
- ETF : `bg-gradient-to-b from-blueberry-100 via-blueberry-400 to-blueberry-500`, text `text-blueberry-800`
- Crypto : `bg-gradient-to-b from-grape-100 via-grape-400 to-grape-700`, text `text-grape-800`
- Stocks : `bg-gradient-to-b from-lime-100 via-lime-400 to-lime-700`, text `text-lime-800`
- Cash : `bg-gradient-to-b from-strawberry-100 via-strawberry-400 to-strawberry-600`, text `text-strawberry-800`
- Vehicle : `bg-gradient-to-b from-tangerine-100 via-tangerine-400 to-tangerine-600`, text `text-tangerine-800`

#### TitleBar (Aqua traffic lights)

```tsx
<div className="
  h-[42px] px-3.5 flex items-center
  bg-gradient-to-b from-white/90 via-blueberry-50/85 to-blueberry-200/90
  border-b border-blueberry-700/30
  shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
  relative
">
  <div className="flex gap-[9px]">
    <TrafficLight color="red" />
    <TrafficLight color="yellow" />
    <TrafficLight color="green" />
  </div>
  <div className="absolute left-1/2 -translate-x-1/2 text-[13px] font-semibold text-blueberry-800 [text-shadow:0_1px_0_rgba(255,255,255,0.9)]">
    {title}
  </div>
</div>
```

`TrafficLight` : 16px circle avec radial-gradient (red `#ff9a9a → #ee5550 → #c4302a`, yellow `#ffec8a → #f5b73a → #c8902a`, green `#a8ff8a → #4ada48 → #2ba830`), inset shadow bottom, et highlight blanc top-left.

#### Toolbar tabs (onglets bonbons)

Tabs identiques aux Buttons mais avec petit "saveur dot" 8px à gauche du label, qui indique la saveur de la section. Tab active = variant `btn-blueberry`.

#### ProgressBar (style iTunes 2003 stripes)

```tsx
<div className="
  h-[18px] rounded-[10px] overflow-hidden
  bg-gradient-to-b from-black/10 to-black/5
  border border-blueberry-700/40
  shadow-[inset_0_1px_2px_rgba(0,0,0,0.15),0_1px_0_rgba(255,255,255,0.7)]
">
  <div
    className="
      h-full relative
      bg-gradient-to-b from-tangerine-400 via-tangerine-500 to-tangerine-700
      shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(120,30,0,0.4)]
    "
    style={{ width: `${progress}%` }}
  >
    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.2)_0_4px,transparent_4px_8px)] animate-stripes" />
  </div>
</div>
```

Animation `animate-stripes` : déplace le pattern de 8px sur 1s en boucle (effet "marche progressive" iTunes).

### 3.6 Background du desktop

Body principal :
```css
background: radial-gradient(ellipse at top, #d4e8f5 0%, #a8c8e8 50%, #7da8d0 100%);
```

Plus deux pseudo-elements `body::before` et `body::after` avec radial-gradient flouté (orange + violet) en `position: fixed`, `filter: blur(20px)`, `pointer-events: none`. Crée des "bulles de lumière" en background sans gêner.

### 3.7 Mode "Sage" (toned down) — fonctionnalité v1.1

Toggle dans Settings : "Réduire les effets visuels". Quand activé :
- Backdrop-filter et blur retirés (passe en `bg-white/95`)
- Highlights intérieurs des cartes désactivés
- Hero card en monochromatique blueberry au lieu du tri-saveur
- Animations désactivées (stripes itunes statiques)

Garde le mapping couleurs catégoriel intact. Stocké en `settings.visualMode: 'full' | 'sage'`. Implémenter via classe sur `<body>` (`.mode-sage`) et CSS conditionnel.

---

## 4. Modèle de données (TypeScript)

```typescript
// types/index.ts

export type HoldingType = 'etf' | 'crypto' | 'stock' | 'cash';
export type VehicleType = 'car' | 'motorcycle' | 'other';
export type TransactionType = 'buy' | 'sell';

export interface Holding {
  id: string;
  type: HoldingType;
  ticker: string;
  name: string;
  currency: 'EUR' | 'USD';
  currentPrice: number;
  currentPriceUpdatedAt: string;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  holdingId: string;
  type: TransactionType;
  date: string;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  exchangeRate?: number;
  notes?: string;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  name: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  currentValueUpdatedAt: string;
  annualDepreciation: number;
}

export interface Snapshot {
  id: string;
  date: string;
  totalNet: number;
  breakdown: {
    etf: number;
    crypto: number;
    stock: number;
    cash: number;
    vehicles: number;
  };
  capitalInvested: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  source: 'cash' | 'investment' | 'mixed';
  notes?: string;
  createdAt: string;
}

export interface Settings {
  baseCurrency: 'EUR';
  defaultAnnualReturn: number;
  defaultVehicleDepreciation: number;
  weeklyDcaTarget?: number;
  monthlyDcaTarget?: number;
  visualMode: 'full' | 'sage';
  lastDataUpdateReminder?: string;
}

export interface AppState {
  holdings: Holding[];
  transactions: Transaction[];
  vehicles: Vehicle[];
  snapshots: Snapshot[];
  goals: Goal[];
  settings: Settings;
}
```

---

## 5. Logique métier (`/lib/finance.ts`)

Toutes fonctions **pures**, testables, sans dépendance au store.

```typescript
calculateAveragePurchasePrice(transactions: Transaction[]): number
calculateCurrentQuantity(transactions: Transaction[]): number
calculateCurrentValueEUR(holding: Holding, transactions: Transaction[]): number
calculateCapitalInvestedEUR(transactions: Transaction[]): number
calculateUnrealizedPnL(holding: Holding, transactions: Transaction[]): { eur: number; pct: number }
calculateRealizedPnL(transactions: Transaction[]): number  // FIFO

calculateTotalNet(state: AppState): number
calculateBreakdown(state: AppState): Snapshot['breakdown']
calculateTotalCapitalInvested(state: AppState): number

calculateVehicleCurrentValue(vehicle: Vehicle): number

projectFutureValue(params: {
  initialCapital: number;
  monthlyContribution: number;
  annualReturn: number;
  years: number;
  events?: Array<{ year: number; amount: number; type: 'withdrawal' | 'deposit' }>;
}): Array<{ year: number; value: number; capitalInvested: number; gains: number }>

createSnapshot(state: AppState): Snapshot
shouldCreateSnapshot(state: AppState): boolean

calculateWeeklyDcaActual(transactions: Transaction[], weekRef: Date): number
calculateMonthlyDcaActual(transactions: Transaction[], monthRef: Date): number
```

**Tests unitaires obligatoires** sur chaque fonction (Vitest). Min 1 cas nominal + 1 edge case.

### Détails métier critiques

**PRU pondéré en EUR pour holding USD :**
```
PRU_eur = Σ(quantité × prix_usd × taux_eur_usd_au_moment_achat) / Σ(quantité)
```
Stocker `exchangeRate` à chaque transaction USD est obligatoire.

**Capital investi cumulé :**
- À l'achat : `capital += quantité × prix × taux + frais`
- À la vente : `capital -= quantité × PRU_actuel × taux` (PAS le prix de vente)

**Décote véhicule entre saisies :**
```
valeur_affichée = currentValue × (1 - annualDepreciation)^(jours_écoulés / 365)
```

**Tests à écrire absolument :**
- Achat puis vente partielle : capital et PRU corrects
- Holding multi-devise avec taux différents : PRU EUR cohérent
- Snapshot quand state vide : tout à 0
- Projection avec retrait : courbe décroche à la bonne année

---

## 6. Architecture des dossiers

```
/app
  /layout.tsx
  /page.tsx                # redirect → /dashboard
  /dashboard/page.tsx
  /dca/page.tsx
  /positions/page.tsx
  /positions/[id]/page.tsx
  /vehicles/page.tsx
  /history/page.tsx
  /projection/page.tsx
  /goals/page.tsx
  /settings/page.tsx

/components
  /layout
    WindowFrame.tsx        # le "plastique transparent" wrapper
    TitleBar.tsx
    Toolbar.tsx
    Sidebar.tsx
  /ui
    Card.tsx
    Button.tsx             # 5 variantes saveur
    Pill.tsx               # 5 saveurs
    ProgressBar.tsx
    TrafficLight.tsx
    Input.tsx
    Select.tsx
    Dialog.tsx
    Table.tsx
  /charts
    PortfolioLineChart.tsx
    AllocationDonut.tsx
    ProjectionChart.tsx
  /forms
    AddTransactionForm.tsx
    AddHoldingForm.tsx
    AddVehicleForm.tsx
    UpdatePricesForm.tsx
  /dashboard
    NetWorthCard.tsx
    BreakdownCard.tsx
    QuickActionsCard.tsx
    RecentActivityCard.tsx
    GoalsProgressCard.tsx

/lib
  /finance.ts
  /store.ts
  /utils.ts
  /formatters.ts
  /constants.ts            # mapping catégorie → saveur

/types
  /index.ts

/tests
  /finance.test.ts
```

---

## 7. Spécification écran par écran

### 7.1 Layout global

Tout le contenu wrappé dans `<WindowFrame>` qui rend :
- Body background : radial-gradient bondi + bulles fruitées en pseudo-elements
- `WindowFrame` : div centrée 1100px avec bordure plastique externe + intérieur blanc cassé translucide
- À l'intérieur : `<TitleBar>` + `<Toolbar>` + flex `<Sidebar>` + `<main>`

### 7.2 Sidebar (gauche, fixe, 210px)

Background `bg-gradient-to-b from-blueberry-100/45 via-blueberry-200/40 to-blueberry-400/45` avec `shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]`.

Sections séparées par `sidebar-section-title` :
- **Navigation** : Dashboard, DCA, Positions, Véhicules
- **Analyse** : Historique, Projection, Objectifs
- **Système** : Préférences, Sauvegarde

Chaque item a une icône `sb-icon` (mini badge plastique 18px de la saveur correspondante). Item actif = gradient blueberry foncé avec texte blanc.

Footer sidebar : indicateur "Dernière maj prix : il y a 3j" cliquable.

### 7.3 Dashboard `/dashboard`

**Header full-width — NetWorthCard :**
- Hero card multi-saveur (gradient Tangerine→Blueberry→Grape)
- Label "◆ Patrimoine net total"
- Chiffre `text-[56px] font-extralight`
- Pills delta : variation J-30 + YTD

**Grille 12 cols :**

Row 1 :
- **Courbe 90j (col-8)** : Recharts AreaChart blueberry + ligne pointillée capital. Toggle 30J/90J/1A/Tout.
- **AllocationDonut (col-4)** : SVG donut natif avec 5 saveurs. Centre glossy. Légende cliquable → filtre.

Row 2 :
- **QuickActionsCard (col-3)** :
  - "+ Saisir DCA" (btn-tangerine, primary)
  - "Mettre à jour prix" (btn-grape)
  - "Snapshot manuel" (btn-lime)
  - "Exporter données" (btn-neutral)
- **GoalsProgressCard (col-5)** : top 1 objectif avec ProgressBar tangerine stripes
- **RecentActivityCard (col-4)** : 5 dernières transactions

Row 3 :
- **PositionsTable (col-12)** : tableau complet

### 7.4 DCA `/dca`

Form en haut : Date, Holding (combobox + create), Type buy/sell toggle, Quantité, Prix, Taux EUR/USD si USD, Frais, Notes. Bouton "Enregistrer" btn-tangerine + Ctrl+Enter.

Sous le form : table transactions avec filtres + edit/delete par ligne.

Sticky right panel : stats hebdo + jauges vs targets (ProgressBar lime).

### 7.5 Positions `/positions`

Tableau @tanstack/react-table dense, sortable. Filtres par catégorie (Pills cliquables). Recherche.

Bouton "Mettre à jour les prix" (btn-grape) → modal mise à jour en lot, Tab navigation.

Click ligne → `/positions/[id]` : courbe historique + transactions filtrées + actions.

### 7.6 Véhicules `/vehicles`

Cards par véhicule : photo, prix achat, valeur actuelle (gros chiffre), bouton update, décote totale, mini-courbe. Pill "VÉHICULE" tangerine.

Bouton "+ Ajouter véhicule" (btn-tangerine).

### 7.7 Historique `/history`

Courbe full-width (Recharts ComposedChart) :
- Patrimoine total (blueberry-500)
- Capital investi (gris dashed)
- Zone entre : lime-200/30% si gain, strawberry-200/30% si perte
- Annotations événements

Filtres période : 1M/3M/6M/1A/3A/Tout.
Sous : table snapshots.

### 7.8 Projection `/projection`

**Panel gauche (sticky) :**
- Capital initial (default: patrimoine actuel)
- DCA mensuel (default: moyenne 6 mois)
- Rendement slider 0-15% (default 7%)
- Horizon 1-40 ans
- Inflation 0-5% (default 2%)
- Toggle "€ constants"

**Panel central :**
- 3 scénarios overlay : pessimiste (strawberry-300), médian (blueberry-500), optimiste (lime-500)

**Panel droit — événements futurs :**
- Liste événements (ex: "Achat Supra -42 000€ en 2029")
- Bouton "+ Ajouter"
- Impact direct sur la courbe
- Chiffre clé impact retraite

**Footer :** "À 65 ans, tu auras X € (en € constants : Y €)".

### 7.9 Objectifs `/goals`

Cards par objectif : name, target, ProgressBar (couleur saveur thème), meta "manque X € sur Y mois → Z €/mois", edit/delete.

### 7.10 Settings `/settings`

- Paramètres globaux
- Targets DCA hebdo/mensuel
- **Toggle "Visual mode"** : Full / Sage
- **Section "Données" CRITIQUE :**
  - "Exporter (JSON)" → backup
  - "Importer (JSON)" → restore
  - "Effacer toutes les données" (double confirmation)

⚠️ Export/import JSON CRITIQUE en v1 — seule sécurité contre perte. Bannière au premier launch.

---

## 8. Comportements transverses

### Snapshots automatiques
À chaque modif state : `shouldCreateSnapshot()`. Max 1/jour.

### Rappels de mise à jour
- `currentPriceUpdatedAt` > 7j → badge tangerine "À actualiser"
- Tous prix > 14j → bannière dashboard
- Pas de DCA depuis 10j + target défini → toast rappel

### Format des chiffres
- € : `42 350 €` (espace fine, symbole après, 0 décimales si entier)
- % : `+2,4 %` ou `-1,8 %` (couleur, signe, virgule française)
- Crypto : jusqu'à 8 décimales
- Actions/ETF : jusqu'à 4 décimales

### Devise
v1 : tout converti en EUR. Taux EUR/USD saisi par transaction et stocké. Pour valo actuelle USD, l'utilisateur saisit "taux EUR/USD actuel" dans Settings.

### Performance
- `useMemo` sur tout calcul dérivé du state
- Selectors Zustand pour éviter re-renders
- Charts : 365 points max, downsample au-delà
- ⚠️ **Backdrop-filter coûteux** : limiter aux cartes "hero". Sur cartes secondaires, accepter `bg-white/85` solid.

---

## 9. Roadmap

### v1.0 — MVP (3-4 semaines)
- WindowFrame + TitleBar + Toolbar + Sidebar
- Dashboard complet
- DCA
- Positions + détail
- Véhicules
- Historique avec snapshots
- Projection avec événements
- Goals
- Settings + Export/Import JSON
- Tests unitaires `/lib/finance.ts`

### v1.1 — Polish
- Mode "Sage"
- Rappels prix obsolètes
- Ctrl+K command palette
- Empty states soignés
- Animation stripes ProgressBar

### v2.0 — Cloud sync (hors scope)
- Auth Supabase
- Migration localStorage → Supabase
- Multi-device
- Optionnel : API CoinGecko

---

## 10. Checklist de démarrage

1. `npx create-next-app@latest wealth-os --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*"`
2. Installer deps section 2
3. Configurer Tailwind avec palette section 3.2
4. Setup fonts Inter + JetBrains Mono via `next/font`
5. Créer `/types/index.ts`
6. Créer `/lib/finance.ts` + tests Vitest
7. Créer `/lib/store.ts` Zustand persist (clé `wealth-os-state-v1`)
8. Créer `/lib/formatters.ts` + `/lib/constants.ts`
9. Composants UI atomiques : Button (5), Pill, Card, ProgressBar, TrafficLight
10. `WindowFrame`, `TitleBar`, `Toolbar`, `Sidebar`
11. **Settings (Export/Import en premier !)** → DCA → Positions → Dashboard → Vehicles → History → Projection → Goals
12. Tester export/import JSON en simulant crash localStorage
13. Déploiement Vercel (gratuit, repo privé GitHub)

---

## 11. Règles de code

- TypeScript strict, **jamais de `any`**
- Composants serveur par défaut, `"use client"` si nécessaire
- Zustand store **non importé dans composants serveur**
- Fonctions de `/lib/finance.ts` **pures**
- Composition de petits composants
- Commentaires uniquement pour logiques non-évidentes
- Conventional commits : `feat:`, `fix:`, `refactor:`, `chore:`
- **Pas de `<style jsx>`, tout en Tailwind classes**

---

## 12. Première session avec Claude Code

Premier message à donner :

> "Lis le fichier CLAUDE_CODE_BRIEF.md à la racine. Fais-moi un récap de ce que tu comprends du projet en 10 lignes max, propose-moi un ordre de tâches précis pour la session 1 (objectif : avoir un Next.js qui boot avec le WindowFrame, TitleBar avec traffic lights, Toolbar, Sidebar, et un Dashboard placeholder qui affiche le NetWorthCard hero — pour valider la direction esthétique en premier), et pose-moi 3-5 questions de clarification s'il y en a. Ne commence à coder qu'après que j'aie validé."

Sessions courtes (1-2h) avec un objectif unique. Toujours commit à la fin.

**Important :** la session 1 sert UNIQUEMENT à valider que l'esthétique iMac G3 est faisable et belle dans Next.js. Si elle déraille, on ajuste avant d'aller plus loin. Pas de logique métier en session 1.

---

**Wealth OS — pilote ton patrimoine comme un Mac de 1999 pilote ton bureau.**
**Build fast. Ship often. Eat your own dogfood.**
