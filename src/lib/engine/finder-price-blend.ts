/**
 * Instant finder market price: Collectr + eBay last-five sold only
 * (equal weight when both exist; single source if one is missing).
 */

export interface FinderCollectrEbayPrices {
  collectr: number | null;
  ebay_sold_avg: number | null;
  /** tcgcollector.com API (optional; see TCG_COLLECTOR_ACCESS_TOKEN). */
  tcg_collector?: number | null;
}

export function calculateCollectrEbayBlend(prices: FinderCollectrEbayPrices): {
  blendedPriceCents: number;
  usedSources: ("collectr" | "ebay_sold_avg" | "tcg_collector")[];
} {
  const { collectr, ebay_sold_avg: ebay, tcg_collector: tcg } = prices;
  const parts: {
    name: "collectr" | "ebay_sold_avg" | "tcg_collector";
    cents: number;
  }[] = [];
  if (collectr != null && collectr > 0) parts.push({ name: "collectr", cents: collectr });
  if (ebay != null && ebay > 0) parts.push({ name: "ebay_sold_avg", cents: ebay });
  if (tcg != null && tcg > 0) parts.push({ name: "tcg_collector", cents: tcg });

  if (parts.length === 0) {
    return { blendedPriceCents: 0, usedSources: [] };
  }

  const sum = parts.reduce((s, p) => s + p.cents, 0);
  return {
    blendedPriceCents: Math.round(sum / parts.length),
    usedSources: parts.map((p) => p.name),
  };
}
