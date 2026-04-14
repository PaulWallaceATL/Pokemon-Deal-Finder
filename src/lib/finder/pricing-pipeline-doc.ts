/**
 * Living documentation for the instant finder pricing pipeline.
 * **Update this file** when you change blend rules, comp keys, or data sources
 * (`fetchListingCompBundle`, `calculateCollectrEbayBlend`, eBay sold, etc.).
 *
 * Rendered at `/pricing-pipeline`.
 */

export const PRICING_PIPELINE_DOC_VERSION = "2026-04-14c";

export const PRICING_PIPELINE_TITLE = "How instant finder prices a listing";

export const PRICING_PIPELINE_INTRO = [
  "The live deal search (`/api/deals/search`) compares each marketplace **ask** to a **reference guide** built from a few independent signals.",
  "A listing appears as a deal only when **ask ≤ reference** (at or below the guide—not above it).",
  "If a card “looks above market,” the guide is often **lower than your intuition** (comps or catalog skew), not a reversed comparison.",
];

export type PricingCodeRef = {
  /** Repo-relative path */
  path: string;
  /** Human label */
  label: string;
};

export type PricingPipelinePhase = {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  codeRefs: PricingCodeRef[];
};

export const PRICING_PIPELINE_PHASES: PricingPipelinePhase[] = [
  {
    id: "inputs",
    title: "1. Inputs",
    summary: "Everything that steers comps for a listing (or a deduped comp key).",
    bullets: [
      "Listing title, optional set filter, category (raw / graded / sealed).",
      "Print line: parsed from title plus optional **slab photo vision** (`OPENAI_API_KEY`).",
      "Grade: parsed from title (PSA 9, etc.) or falls back to sidebar grader + grade.",
      "Search query and optional Pokémon TCG API anchor card for catalog match (raw).",
    ],
    codeRefs: [
      { path: "src/lib/listing/listing-comp-query.ts", label: "Title → card line, print kind" },
      { path: "src/lib/listing/slab-print-vision.ts", label: "Slab label vision override" },
      { path: "src/lib/listing/slab-reference-price.ts", label: "Slab parse from title" },
    ],
  },
  {
    id: "parse",
    title: "2. Parse → search keys",
    summary: "Derive strings sent to eBay sold, Collectr, and catalog APIs.",
    bullets: [
      "**cardLine** — name + collector number for sold search (set passed separately).",
      "**collectrName** — cleaned name for your Collectr bridge.",
      "**combinedQualifier** — grader + grade tokens (graded), print tokens (reverse / holo / non-holo), sealed kind, raw finish suffix when applicable.",
    ],
    codeRefs: [
      { path: "src/app/api/deals/search/route.ts", label: "fetchListingCompBundle" },
      { path: "src/lib/pokemon/finder-query.ts", label: "buildListingQualifier" },
    ],
  },
  {
    id: "parallel",
    title: "3. Parallel fetches",
    summary: "Three (or four on raw) network calls run together via Promise.all.",
    bullets: [
      "**eBay sold** — completed listings HTML scrape (raw: scrape-only). Query = cardLine + set + qualifiers. Up to a small sample (e.g. ~5); **mean** sold price. Titles filtered: English, no Japanese imports, grade match (graded), raw excludes slab-looking sold when in raw mode. **Print:** reverse listings ↔ sold titles that read reverse; holo listings ↔ sold that read regular holo; **unknown** print ↔ sold that are **neither** clearly reverse nor clearly holo (so commons are not averaged with variant solds). When print is **unknown** but **TCG Collector / Pokémon TCG catalog** price exists, that catalog leg is used for the blend and the **eBay sold leg is omitted** (sold titles mix variants too often).",
      "**Collectr** — POST to `COLLECTR_MARKET_API_URL` with name, set, category, grader/grade, card #, variant hints.",
      "**TCG Collector** (optional token) — card search + variant row; **primary** price respects print when known.",
      "**Pokémon TCG API** (raw only, if TCG Collector missing) — TCGPlayer-style market for matched card.",
    ],
    codeRefs: [
      { path: "src/lib/apis/ebay-sold.ts", label: "getEbaySoldAverage" },
      { path: "src/lib/apis/optional-marketplaces.ts", label: "getCollectrMarketPriceCents" },
      { path: "src/lib/apis/tcg-collector.ts", label: "getTcgCollectorListingMatch" },
      { path: "src/lib/apis/pokemontcg-listing-price.ts", label: "getPokemonTcgMarketPriceCentsForListing" },
    ],
  },
  {
    id: "catalog-slot",
    title: "4. Catalog slot in the blend",
    summary: "Only one catalog number feeds the blend’s “tcg_collector” leg.",
    bullets: [
      "Prefer **TCG Collector** primary variant price when the token is set.",
      "Else (raw path) use **Pokémon TCG API** market price when available.",
      "If both missing, that leg is omitted from the blend.",
    ],
    codeRefs: [
      { path: "src/app/api/deals/search/route.ts", label: "catalogPriceForBlend" },
    ],
  },
  {
    id: "blend",
    title: "5. Blend → reference",
    summary: "Simple average of every positive source—no 0.3/0.3 weights like the DB engine.",
    bullets: [
      "Collectr, eBay sold average, and catalog (TCG Collector or Pokémon TCG) are collected.",
      "**blendedPriceCents = round(sum of available legs / count of legs)** — equal weight per leg. When print is **unknown** and a **catalog** price exists, **eBay sold is omitted** from the blend so mixed-variant sold titles do not move the guide.",
      "Graded reference uses that blend directly (no PSA grade ladder interpolation in the finder).",
    ],
    codeRefs: [
      { path: "src/lib/engine/finder-price-blend.ts", label: "calculateCollectrEbayBlend" },
      { path: "src/lib/listing/slab-reference-price.ts", label: "listingMarketReferenceCents" },
    ],
  },
  {
    id: "gate-sort",
    title: "6. Gate & sort",
    summary: "Filter and ranking for the response JSON.",
    bullets: [
      "**Gate:** `listing price ≤ blended reference` — over-ask listings are dropped.",
      "**Sort:** surviving deals ordered by **discount %** (largest gap between reference and ask first).",
      "**Header medians:** response `marketPrices` use **median** across listings for Collectr / eBay / catalog display—not the blend formula.",
    ],
    codeRefs: [
      { path: "src/lib/engine/price-aggregator.ts", label: "listingAtOrBelowReference" },
      { path: "src/app/api/deals/search/route.ts", label: "GET handler — deals map + sort" },
    ],
  },
];

export const PRICING_SOURCES_TABLE: {
  source: string;
  role: string;
  notes: string;
}[] = [
  {
    source: "eBay completed (scraped)",
    role: "Sold comps average",
    notes: "Raw mode avoids Browse “sold” fallback unless env allows (noisy). Graded applies title filters for grade + print.",
  },
  {
    source: "Collectr bridge",
    role: "Third-party market",
    notes: "Whatever your `COLLECTR_MARKET_API_URL` returns for the given context.",
  },
  {
    source: "TCG Collector / Pokémon TCG API",
    role: "Catalog anchor",
    notes: "Single leg: partner first, then API market for raw.",
  },
];

export const PRICING_CAVEATS = [
  "A **mean** of a few solds is sensitive to outliers; the blend mean can sit below or above “true” fair value.",
  "Collectr and catalog rows can still mismatch **exact slab variant** even with print hints and vision.",
  "Deduped **comp keys** batch network calls: listings sharing the same key reuse one bundle (title + vision print + grade).",
];

/** Mermaid source — paste into https://mermaid.live if the site renderer fails. */
export const PRICING_PIPELINE_MERMAID = `flowchart TB
  IN["Inputs: title, set, print kind, grade"] --> PARSE["Parse: card line + sold qualifiers"]
  PARSE --> FETCH["Parallel: eBay sold mean, Collectr, catalog slot"]
  FETCH --> BLEND["Blend: arithmetic mean of each positive leg"]
  BLEND --> GATE{"listing ask <= reference?"}
  GATE -->|yes| DEAL["Show deal; sort by discount pct"]
  GATE -->|no| DROP["Drop listing"]
`;
