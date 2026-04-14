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

  if (wantNum && num && (num === wantNum || num.includes(wantNum) || wantNum.includes(num))) {
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

/**
 * Best-effort TCGPlayer-aligned price for a listing-derived card line.
 */
export async function getPokemonTcgMarketPriceCentsForListing(opts: {
  cardName: string;
  setName?: string;
  catalogNumber?: string;
}): Promise<number | null> {
  const safe = opts.cardName.replace(/"/g, "").trim();
  if (safe.length < 2) return null;

  const qParts = [`name:"${safe}"`];
  if (opts.setName?.trim()) {
    qParts.push(`set.name:"${opts.setName.replace(/"/g, "").trim()}"`);
  }
  if (opts.catalogNumber?.trim()) {
    qParts.push(`number:"${opts.catalogNumber.replace(/"/g, "").trim()}"`);
  }
  const q = qParts.join(" ");

  try {
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=12&orderBy=-set.releaseDate`,
      { headers: headers(), signal: AbortSignal.timeout(10_000), cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: Array<{
        name?: string;
        number?: string;
        set?: { name?: string };
        tcgplayer?: { prices?: Record<string, { market?: number }> };
      }>;
    };
    const rows = data.data ?? [];
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
  } catch {
    return null;
  }
}
