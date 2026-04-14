/**
 * TCG Collector REST API (https://www.tcgcollector.com/api).
 * Auth: Bearer access token from your account (see API docs / C# SDK config).
 *
 * Query shapes follow the official OpenAPI / .NET SDK (PascalCase query keys).
 * If search returns empty, confirm parameter names in the live Swagger UI.
 */

import type { FinderListingCategory } from "@/lib/pokemon/finder-query";

const DEFAULT_BASE = "https://www.tcgcollector.com/api";

export interface TcgCollectorVariantRow {
  variantLabel: string;
  priceCents: number | null;
}

export interface TcgCollectorListingMatch {
  cardId: number | null;
  /** Single number folded into the instant finder blend (see pickPrimaryPriceCents). */
  primaryPriceCents: number | null;
  variants: TcgCollectorVariantRow[];
}

function baseUrl(): string {
  const raw = process.env.TCG_COLLECTOR_BASE_URL?.trim() || DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

function bearer(): string | null {
  const t = process.env.TCG_COLLECTOR_ACCESS_TOKEN?.trim();
  return t || null;
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/** TCG Collector / TCGPlayer-style dollars → cents (API is usually decimal USD). */
export function tcgCollectorMoneyToCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (Number.isInteger(value) && value >= 10_000) return Math.round(value);
  return Math.round(value * 100);
}

function asRecord(x: unknown): Record<string, unknown> | null {
  return x && typeof x === "object" ? (x as Record<string, unknown>) : null;
}

function firstNumber(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function normalizeCardsPayload(json: unknown): Record<string, unknown>[] {
  const root = asRecord(json);
  if (!root) return [];
  const candidates = [
    root.items,
    root.Items,
    root.data,
    root.Data,
    root.value,
    root.Value,
    root.results,
    root.Results,
    root.cards,
    root.Cards,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c
        .map((x) => asRecord(x))
        .filter((x): x is Record<string, unknown> => x != null);
    }
  }
  if (root.id != null || root.cardId != null || root.Id != null || root.CardId != null) {
    return [root];
  }
  return [];
}

function numberField(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function stringField(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function expansionName(card: Record<string, unknown>): string {
  const exp = asRecord(card.expansion ?? card.Expansion);
  return stringField(exp ?? {}, "name", "Name");
}

function collectorNumber(card: Record<string, unknown>): string {
  return stringField(
    card,
    "numberString",
    "NumberString",
    "collectorNumber",
    "CollectorNumber",
    "number",
    "Number"
  );
}

function scoreCardMatch(
  card: Record<string, unknown>,
  opts: { cardName: string; setName?: string; catalogNumber?: string }
): number {
  let score = 0;
  const name = stringField(card, "name", "Name").toLowerCase();
  const num = collectorNumber(card).toLowerCase();
  const exp = expansionName(card).toLowerCase();
  const setL = (opts.setName ?? "").toLowerCase();
  const numL = (opts.catalogNumber ?? "").toLowerCase();
  const q = opts.cardName.toLowerCase().slice(0, 48);

  if (numL && num) {
    const a = num.replace(/\s/g, "");
    const b = numL.replace(/\s/g, "");
    if (a === b || a.includes(b) || b.includes(a)) score += 60;
  }
  if (setL) {
    if (exp && exp.includes(setL)) score += 45;
    else if (name.includes(setL)) score += 25;
  }
  if (q && name.includes(q.slice(0, 24))) score += 15;
  return score;
}

function pickBestCard(
  cards: Record<string, unknown>[],
  opts: { cardName: string; setName?: string; catalogNumber?: string }
): Record<string, unknown> | null {
  if (cards.length === 0) return null;
  let best = cards[0]!;
  let bestScore = scoreCardMatch(best, opts);
  for (let i = 1; i < cards.length; i++) {
    const c = cards[i]!;
    const s = scoreCardMatch(c, opts);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

function extractPriceFromTcgPriceNode(node: Record<string, unknown>): number | null {
  const raw = firstNumber(
    node.price,
    node.Price,
    node.amount,
    node.Amount,
    node.value,
    node.Value,
    node.averagePrice,
    node.AveragePrice,
    node.marketPrice,
    node.MarketPrice
  );
  if (raw == null) return null;
  const cents = tcgCollectorMoneyToCents(raw);
  return cents > 0 ? cents : null;
}

function extractVariants(card: Record<string, unknown>): TcgCollectorVariantRow[] {
  const rawVariants = (card.cardVariants ??
    card.CardVariants ??
    card.cardVariantDtos ??
    card.CardVariantDtos) as unknown;
  if (!Array.isArray(rawVariants)) return [];

  const rows: TcgCollectorVariantRow[] = [];
  for (const v of rawVariants) {
    const vo = asRecord(v);
    if (!vo) continue;
    const typeObj = asRecord(vo.cardVariantType ?? vo.CardVariantType);
    const label =
      stringField(vo, "name", "Name") ||
      stringField(typeObj ?? {}, "name", "Name") ||
      "Variant";

    const pricesRaw = (vo.tcgPrices ?? vo.TcgPrices) as unknown;
    let priceCents: number | null = null;
    if (Array.isArray(pricesRaw)) {
      for (const p of pricesRaw) {
        const po = asRecord(p);
        if (!po) continue;
        priceCents = extractPriceFromTcgPriceNode(po);
        if (priceCents) break;
      }
    }
    if (!priceCents) {
      const direct = firstNumber(
        vo.price,
        vo.Price,
        vo.marketPrice,
        vo.MarketPrice
      );
      if (direct != null) priceCents = tcgCollectorMoneyToCents(direct) || null;
    }
    rows.push({ variantLabel: label, priceCents });
  }
  return rows;
}

function medianPositive(values: number[]): number | null {
  const v = values.filter((x) => x > 0).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[mid]! : Math.round((v[mid - 1]! + v[mid]!) / 2);
}

function pickPrimaryPriceCents(
  variants: TcgCollectorVariantRow[],
  category: FinderListingCategory
): number | null {
  const priced = variants.filter((r) => r.priceCents && r.priceCents > 0);
  if (priced.length === 0) return null;

  if (category === "raw") {
    const nonSlab = priced.filter(
      (r) => !/\b(psa|bgs|cgc|sgc|tag|slab|graded)\b/i.test(r.variantLabel)
    );
    const pool = nonSlab.length ? nonSlab : priced;
    return Math.min(...pool.map((r) => r.priceCents!));
  }
  if (category === "graded") {
    const slab = priced.filter((r) =>
      /\b(psa|bgs|cgc|sgc|tag)\b/i.test(r.variantLabel)
    );
    const pool = slab.length ? slab : priced;
    const cents = pool.map((r) => r.priceCents!);
    return medianPositive(cents);
  }
  const cents = priced.map((r) => r.priceCents!);
  return medianPositive(cents);
}

async function fetchJson(
  path: string,
  searchParams?: URLSearchParams
): Promise<unknown | null> {
  const token = bearer();
  if (!token) return null;
  const url =
    `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}` +
    (searchParams && [...searchParams.keys()].length
      ? `?${searchParams.toString()}`
      : "");
  try {
    const res = await fetch(url, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/**
 * Search + optional card detail; returns variant rows and a primary price for the finder blend.
 */
export async function getTcgCollectorListingMatch(opts: {
  cardName: string;
  setName?: string;
  catalogNumber?: string;
  category: FinderListingCategory;
}): Promise<TcgCollectorListingMatch | null> {
  if (!bearer()) return null;

  const parts = [opts.cardName];
  if (opts.catalogNumber) parts.push(opts.catalogNumber);
  if (opts.setName) parts.push(opts.setName);
  const cardSearch = parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 220);

  const qs = new URLSearchParams();
  qs.set("CardSearch", cardSearch);
  qs.append("TcgRegionNames", "International");
  qs.set("Page", "1");
  qs.set("PageSize", "30");

  const listJson = await fetchJson("/cards", qs);
  const cards = normalizeCardsPayload(listJson);
  if (cards.length === 0) return null;

  const best = pickBestCard(cards, {
    cardName: opts.cardName,
    setName: opts.setName,
    catalogNumber: opts.catalogNumber,
  });
  if (!best) return null;

  const id =
    numberField(best, "id", "Id", "cardId", "CardId") ??
    numberField(best, "cardID", "CardID");

  let detail: Record<string, unknown> = best;
  if (id != null) {
    const detailJson = await fetchJson(`/cards/${id}`);
    const d = asRecord(detailJson);
    if (d && (d.cardVariants != null || d.CardVariants != null)) {
      detail = d;
    }
  }

  let variants = extractVariants(detail);
  if (variants.length === 0) {
    variants = extractVariants(best);
  }

  const primaryPriceCents = pickPrimaryPriceCents(variants, opts.category);

  return {
    cardId: id,
    primaryPriceCents,
    variants,
  };
}
