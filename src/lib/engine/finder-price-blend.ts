/**
 * Instant finder reference price.
 * When **Collectr-style** data returns a value (`COLLECTR_MARKET_API_URL` or
 * `APIFY_COLLECTR_ACTOR_ID` + `APIFY_API_TOKEN`), that is the guide (eBay sold
 * averages often sit above “current market” and pull means up). If that leg is
 * missing, fall back to the **mean** of eBay sold + catalog legs.
 *
 * **Living doc:** keep `src/lib/finder/pricing-pipeline-doc.ts` in sync when this changes.
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

  if (collectr != null && collectr > 0) {
    return {
      blendedPriceCents: Math.round(collectr),
      usedSources: ["collectr"],
    };
  }

  const parts: {
    name: "collectr" | "ebay_sold_avg" | "tcg_collector";
    cents: number;
  }[] = [];
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
