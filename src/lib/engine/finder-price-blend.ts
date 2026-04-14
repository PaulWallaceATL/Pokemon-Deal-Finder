import type { FinderListingCategory } from "@/lib/pokemon/finder-query";

export type FinderMarketSource =
  | "tcgplayer"
  | "pricecharting_raw"
  | "pricecharting_graded"
  | "ebay_sold_avg"
  | "collectr"
  | "alt_app";

export interface FinderMarketPrices {
  tcgplayer: number | null;
  pricecharting_raw: number | null;
  pricecharting_graded: number | null;
  ebay_sold_avg: number | null;
  collectr: number | null;
  alt_app: number | null;
}

const WEIGHTS: Record<
  FinderListingCategory,
  Record<FinderMarketSource, number>
> = {
  raw: {
    tcgplayer: 0.22,
    pricecharting_raw: 0.26,
    pricecharting_graded: 0.06,
    ebay_sold_avg: 0.32,
    collectr: 0.07,
    alt_app: 0.07,
  },
  graded: {
    tcgplayer: 0.12,
    pricecharting_raw: 0.1,
    pricecharting_graded: 0.32,
    ebay_sold_avg: 0.28,
    collectr: 0.09,
    alt_app: 0.09,
  },
  sealed: {
    tcgplayer: 0.12,
    pricecharting_raw: 0.18,
    pricecharting_graded: 0.02,
    ebay_sold_avg: 0.48,
    collectr: 0.1,
    alt_app: 0.1,
  },
};

/**
 * Weighted blend for the finder UI. Missing sources drop out and weights
 * rescale like `calculateBlendedPrice`.
 */
export function calculateFinderBlendedPrice(
  category: FinderListingCategory,
  prices: FinderMarketPrices
): { blendedPriceCents: number; usedSources: FinderMarketSource[] } {
  const weights = WEIGHTS[category];
  const entries = (Object.keys(weights) as FinderMarketSource[]).map((name) => ({
    name,
    priceCents: prices[name],
    weight: weights[name],
  }));

  const available = entries.filter((e) => e.priceCents != null && e.priceCents > 0);
  if (available.length === 0) {
    return { blendedPriceCents: 0, usedSources: [] };
  }

  const totalW = available.reduce((s, e) => s + e.weight, 0);
  let blended = 0;
  for (const e of available) {
    blended += e.priceCents! * (e.weight / totalW);
  }

  return {
    blendedPriceCents: Math.round(blended),
    usedSources: available.map((e) => e.name),
  };
}
