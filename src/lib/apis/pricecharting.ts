import { scrapePriceChartingPrices } from "./pricecharting-scraper";

export interface PriceChartingResult {
  rawPriceCents: number | null;
  gradedPriceCents: number | null;
  productName: string;
}

/**
 * Get PriceCharting prices. Uses web scraping by default.
 * Falls back to the paid API if PRICECHARTING_API_KEY is set.
 */
export async function getPriceChartingPrices(
  cardName: string,
  cardSet?: string,
  extraSearchTerms?: string
): Promise<PriceChartingResult> {
  const result = await scrapePriceChartingPrices(
    cardName,
    cardSet,
    extraSearchTerms
  );
  return {
    rawPriceCents: result.rawPriceCents,
    gradedPriceCents: result.gradedPriceCents,
    productName: result.productName,
  };
}
