export type PriceSourceName =
  | "tcgplayer"
  | "pricecharting_raw"
  | "pricecharting_graded"
  | "ebay_sold_avg";

export interface PriceSource {
  name: PriceSourceName;
  priceCents: number | null;
  weight: number;
}

export interface BlendedPrice {
  blendedPriceCents: number;
  sources: PriceSource[];
  availableSources: number;
}

export interface DealCandidate {
  trackedCardId: string;
  userId: string;
  ebayItemId: string;
  ebayTitle: string;
  ebayPriceCents: number;
  ebayUrl: string;
  ebayImageUrl: string;
  sellerName: string;
  condition: string;
  blendedMarketPriceCents: number;
  discountPct: number;
}

export interface ScanResult {
  trackedCardId: string;
  cardName: string;
  dealsFound: number;
  pricesUpdated: number;
  errors: string[];
}
