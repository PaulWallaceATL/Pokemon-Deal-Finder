const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export interface PriceChartingResult {
  rawPriceCents: number | null;
  gradedPriceCents: number | null;
  productName: string;
}

const mockResults: Record<string, PriceChartingResult> = {
  default: {
    rawPriceCents: 3900,
    gradedPriceCents: 8500,
    productName: "Pokemon Card (Mock)",
  },
};

export async function getPriceChartingPrices(
  cardName: string,
  cardSet?: string
): Promise<PriceChartingResult> {
  if (USE_MOCK) {
    return {
      ...mockResults.default,
      productName: `${cardName}${cardSet ? ` [${cardSet}]` : ""}`,
    };
  }

  const apiKey = process.env.PRICECHARTING_API_KEY;
  if (!apiKey) {
    throw new Error("PRICECHARTING_API_KEY must be set");
  }

  const query = cardSet ? `${cardName} ${cardSet}` : cardName;
  const url = new URL("https://www.pricecharting.com/api/product");
  url.searchParams.set("t", apiKey);
  url.searchParams.set("q", query);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`PriceCharting API error: ${response.status}`);
  }

  const data = await response.json();

  // PriceCharting returns prices in cents for some fields, dollars for others
  const loosePrice = data["loose-price"];
  const gradedPrice = data["graded-price"];

  return {
    rawPriceCents: loosePrice != null ? Math.round(loosePrice) : null,
    gradedPriceCents: gradedPrice != null ? Math.round(gradedPrice) : null,
    productName: data["product-name"] ?? query,
  };
}
