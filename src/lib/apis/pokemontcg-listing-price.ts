/**
 * Free market hint from Pokémon TCG API (api.pokemontcg.io): uses embedded
 * TCGPlayer `market` when present, else falls back to tcgplayer-scraper.
 * No TCG Collector token required.
 */

import { scrapeTcgplayerPrice } from "@/lib/apis/tcgplayer-scraper";

function headers(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  const key = process.env.POKEMON_TCG_API_KEY?.trim();
  if (key) h["X-Api-Key"] = key;
  return h;
}

function scoreCard(
  card: {
    name?: string;
    number?: string;
    set?: { name?: string };
  },
  opts: { cardName: string; setName?: string; catalogNumber?: string }
): number {
  let s = 0;
  const name = (card.name ?? "").toLowerCase();
  const num = (card.number ?? "").toLowerCase().replace(/\s/g, "");
  const set = (card.set?.name ?? "").toLowerCase();
  const wantName = opts.cardName.toLowerCase().slice(0, 48);
  const wantNum = (opts.catalogNumber ?? "").toLowerCase().replace(/\s/g, "");
  const wantSet = (opts.setName ?? "").toLowerCase();

  if (
    wantNum &&
    num &&
    (num === wantNum || num.includes(wantNum) || wantNum.includes(num))
  ) {
    s += 50;
  }
  if (wantSet && set.includes(wantSet)) s += 40;
  if (wantName && name.includes(wantName.slice(0, 20))) s += 20;
  return s;
}

function tcgplayerCentsFromCard(card: {
  tcgplayer?: { prices?: Record<string, { market?: number }> };
}): number | null {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;
  for (const p of Object.values(prices)) {
    if (p?.market != null && p.market > 0) {
      return Math.round(p.market * 100);
    }
  }
  return null;
}

type CardRow = {
  name?: string;
  number?: string;
  set?: { name?: string };
  tcgplayer?: { prices?: Record<string, { market?: number }> };
};

async function fetchCardsByQuery(q: string): Promise<CardRow[]> {
  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=12&orderBy=-set.releaseDate`,
    { headers: headers(), signal: AbortSignal.timeout(10_000), cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: CardRow[] };
  return data.data ?? [];
}

function pickBest(rows: CardRow[], opts: {
  cardName: string;
  setName?: string;
  catalogNumber?: string;
}): CardRow | null {
  if (rows.length === 0) return null;
  let best = rows[0]!;
  let bestScore = scoreCard(best, opts);
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i]!;
    const sc = scoreCard(c, opts);
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  }
  return best;
}

async function priceFromBest(best: CardRow | null): Promise<number | null> {
  if (!best) return null;
  let cents = tcgplayerCentsFromCard(best);
  if (cents == null && best.name && best.set?.name) {
    try {
      const scraped = await scrapeTcgplayerPrice(best.name, best.set.name);
      cents = scraped.marketPriceCents;
    } catch {
      /* leave null */
    }
  }
  return cents && cents > 0 ? cents : null;
}

function buildQueries(opts: {
  cardName: string;
  setName?: string;
  catalogNumber?: string;
  alternateNames: string[];
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (parts: string[]) => {
    const q = parts.join(" ");
    if (q.length < 4) return;
    if (seen.has(q)) return;
    seen.add(q);
    out.push(q);
  };

  const raw = opts.cardName.replace(/"/g, "").trim();
  const shortName = raw.length > 72 ? raw.slice(0, 72).trim() : raw;
  const set = opts.setName?.replace(/"/g, "").trim();
  const num = opts.catalogNumber?.replace(/"/g, "").trim();

  const nameClause = (n: string) => `name:"${n.replace(/"/g, "").trim()}"`;
  if (shortName.length >= 2) {
    const p = [nameClause(shortName)];
    if (set) p.push(`set.name:"${set}"`);
    if (num) p.push(`number:"${num}"`);
    add(p);
    if (num) {
      const p2 = [nameClause(shortName)];
      if (set) p2.push(`set.name:"${set}"`);
      add(p2);
    }
    if (shortName !== raw.slice(0, 40)) {
      add([nameClause(raw.slice(0, 40))]);
    }
  }

  for (const alt of opts.alternateNames) {
    const a = alt.replace(/"/g, "").trim();
    if (a.length < 2 || a.length > 80) continue;
    const p = [nameClause(a)];
    if (set) p.push(`set.name:"${set}"`);
    add(p);
    add([nameClause(a)]);
  }

  return out;
}

/**
 * Best-effort TCGPlayer-aligned price for a listing-derived card line.
 * Retries with looser Lucene when the catalog number over-filters, and can
 * use `alternateNames` (e.g. Pokémon TCG search for the user's query) when the
 * marketplace title parses into a noisy string.
 */
export async function getPokemonTcgMarketPriceCentsForListing(opts: {
  cardName: string;
  setName?: string;
  catalogNumber?: string;
  /** Extra `name:"…"` attempts (e.g. catalog card name from `searchCards(q)`). */
  alternateNames?: string[];
}): Promise<number | null> {
  const primary = opts.cardName.replace(/"/g, "").trim();
  if (primary.length < 2) return null;

  const alternates = [...(opts.alternateNames ?? [])].filter(
    (n) =>
      n &&
      n.trim().length >= 2 &&
      n.trim().toLowerCase() !== primary.toLowerCase()
  );

  const queries = buildQueries({
    cardName: primary,
    setName: opts.setName,
    catalogNumber: opts.catalogNumber,
    alternateNames: alternates,
  });

  for (const q of queries) {
    try {
      const rows = await fetchCardsByQuery(q);
      const best = pickBest(rows, {
        cardName: primary,
        setName: opts.setName,
        catalogNumber: opts.catalogNumber,
      });
      const cents = await priceFromBest(best);
      if (cents != null) return cents;
    } catch {
      /* try next */
    }
  }

  return null;
}
