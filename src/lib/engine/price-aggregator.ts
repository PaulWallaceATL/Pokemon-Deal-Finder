import type { PriceSource, PriceSourceName, BlendedPrice } from "./types";

const DEFAULT_WEIGHTS: Record<PriceSourceName, number> = {
  tcgplayer: 0.3,
  pricecharting_raw: 0.3,
  ebay_sold_avg: 0.3,
  pricecharting_graded: 0.1,
};

/**
 * Calculate a weighted blended market price from multiple sources.
 * When a source is unavailable (null), its weight is redistributed
 * proportionally across the remaining available sources.
 */
export function calculateBlendedPrice(
  prices: Record<PriceSourceName, number | null>
): BlendedPrice {
  const sources: PriceSource[] = (
    Object.entries(DEFAULT_WEIGHTS) as [PriceSourceName, number][]
  ).map(([name, weight]) => ({
    name,
    priceCents: prices[name],
    weight,
  }));

  const available = sources.filter((s) => s.priceCents != null && s.priceCents > 0);

  if (available.length === 0) {
    return { blendedPriceCents: 0, sources, availableSources: 0 };
  }

  // Redistribute weights among available sources
  const totalAvailableWeight = available.reduce((sum, s) => sum + s.weight, 0);
  const scaleFactor = 1 / totalAvailableWeight;

  let blendedPriceCents = 0;
  for (const source of available) {
    const normalizedWeight = source.weight * scaleFactor;
    blendedPriceCents += source.priceCents! * normalizedWeight;
  }

  return {
    blendedPriceCents: Math.round(blendedPriceCents),
    sources,
    availableSources: available.length,
  };
}

/**
 * Determine if a listing qualifies as a deal.
 * Returns the discount percentage if the listing price is below the
 * threshold (blended price * (1 - minDiscountPct/100)), or null otherwise.
 */
export function evaluateDeal(
  listingPriceCents: number,
  blendedPriceCents: number,
  minDiscountPct: number = 15
): number | null {
  if (blendedPriceCents <= 0) return null;

  const discountPct =
    ((blendedPriceCents - listingPriceCents) / blendedPriceCents) * 100;

  if (discountPct >= minDiscountPct) {
    return Math.round(discountPct * 100) / 100;
  }

  return null;
}
