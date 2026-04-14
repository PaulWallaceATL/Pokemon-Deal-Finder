import type { Database } from "@/lib/supabase/types";
import type { PredictedGradeData, ProductType } from "@/lib/mock-data";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];

/**
 * Unified deal shape consumed by the UI components.
 * Maps from the Supabase `deals` row to the shape `DealCard` expects.
 */
export interface Deal {
  id: string;
  cardName: string;
  cardSet: string;
  cardSeries: string;
  cardNumber: string;
  rarity: string;
  pokemonTcgId: string;
  imageUrl: string;
  ebayItemId: string;
  ebayTitle: string;
  ebayPriceCents: number;
  ebayUrl: string;
  ebayImageUrl: string;
  sellerName: string;
  condition: string;
  blendedMarketPriceCents: number;
  discountPct: number;
  foundAt: string;
  isActive: boolean;
  listingSource: "ebay" | "facebook";
  productType: ProductType;
  prices: {
    tcgplayer: number | null;
    pricechartingRaw: number | null;
    pricechartingGraded: number | null;
    ebaySoldAvg: number | null;
    /** Instant finder: Collectr bridge (see collectr.com). */
    collectr?: number | null;
    /** Raw finder only: Collectr PSA 10 reference (display; not used for deal %). */
    collectrGradedPsa10?: number | null;
    /** tcgcollector.com primary price used in blend when `TCG_COLLECTOR_ACCESS_TOKEN` is set. */
    tcgCollector?: number | null;
    /** Raw finder: Pokémon TCG API / TCGPlayer market when TCG Collector partner price is missing. */
    pokemonTcgplayerMarket?: number | null;
    /** Per-variant prices from TCG Collector (display). */
    tcgCollectorVariants?: { label: string; priceCents: number | null }[];
  };
  psaPrices: {
    psa10: number | null;
    psa9: number | null;
    psa8: number | null;
    psa7?: number | null;
    psa6?: number | null;
  } | null;
  predictedGrade: PredictedGradeData | null;
  /** Instant finder: eBay sold comps average (up to five listings). */
  ebayLast5AvgCents?: number | null;
  /** How the listing price was compared (e.g. slab-matched grade). */
  listingReferenceNote?: string | null;
}

export function dealRowToUI(row: DealRow): Deal {
  const hasPsa = row.psa_price_10 || row.psa_price_9 || row.psa_price_8;

  return {
    id: row.id,
    cardName: row.card_name ?? row.ebay_title ?? "Unknown Card",
    cardSet: row.card_set ?? "",
    cardSeries: row.card_series ?? "",
    cardNumber: row.card_number ?? "",
    rarity: row.rarity ?? "",
    pokemonTcgId: row.pokemon_tcg_id ?? "",
    imageUrl: row.image_url ?? row.ebay_image_url ?? "",
    ebayItemId: row.ebay_item_id,
    ebayTitle: row.ebay_title ?? "",
    ebayPriceCents: row.ebay_price_cents,
    ebayUrl: row.ebay_url,
    ebayImageUrl: row.ebay_image_url ?? "",
    sellerName: row.seller_name ?? "Unknown",
    condition: row.condition ?? "Not Specified",
    blendedMarketPriceCents: row.blended_market_price_cents,
    discountPct: Number(row.discount_pct),
    foundAt: row.found_at,
    isActive: row.is_active,
    listingSource: (row.listing_source as "ebay" | "facebook") ?? "ebay",
    productType: (row.product_type as ProductType) ?? "raw",
    prices: {
      tcgplayer: row.prices_tcgplayer,
      pricechartingRaw: row.prices_pricecharting_raw,
      pricechartingGraded: row.prices_pricecharting_graded,
      ebaySoldAvg: row.prices_ebay_sold_avg,
      collectr: null,
    },
    psaPrices: hasPsa
      ? {
          psa10: row.psa_price_10,
          psa9: row.psa_price_9,
          psa8: row.psa_price_8,
        }
      : null,
    predictedGrade: row.predicted_grade
      ? {
          grade: Number(row.predicted_grade),
          centering: {
            frontLR: row.predicted_grade_centering_lr ?? "N/A",
            frontTB: row.predicted_grade_centering_tb ?? "N/A",
          },
          confidence: (row.predicted_grade_confidence as "high" | "medium" | "low") ?? "low",
          source: (row.predicted_grade_source as "ai" | "canvas" | "condition") ?? "condition",
        }
      : null,
  };
}
