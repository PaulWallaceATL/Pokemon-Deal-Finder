/**
 * Instant finder market price: Collectr + eBay last-five sold only
 * (equal weight when both exist; single source if one is missing).
 */

export interface FinderCollectrEbayPrices {
  collectr: number | null;
  ebay_sold_avg: number | null;
}

export function calculateCollectrEbayBlend(prices: FinderCollectrEbayPrices): {
  blendedPriceCents: number;
  usedSources: ("collectr" | "ebay_sold_avg")[];
} {
  const { collectr, ebay_sold_avg: ebay } = prices;
  const parts: { name: "collectr" | "ebay_sold_avg"; cents: number }[] = [];
  if (collectr != null && collectr > 0) parts.push({ name: "collectr", cents: collectr });
  if (ebay != null && ebay > 0) parts.push({ name: "ebay_sold_avg", cents: ebay });

  if (parts.length === 0) {
    return { blendedPriceCents: 0, usedSources: [] };
  }

  const sum = parts.reduce((s, p) => s + p.cents, 0);
  return {
    blendedPriceCents: Math.round(sum / parts.length),
    usedSources: parts.map((p) => p.name),
  };
}
