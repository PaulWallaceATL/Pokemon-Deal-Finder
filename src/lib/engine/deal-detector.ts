import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { PriceSourceName, ScanResult } from "./types";
import { calculateBlendedPrice, evaluateDeal } from "./price-aggregator";
import { searchEbayListings } from "@/lib/apis/ebay-browse";
import { getEbaySoldAverage } from "@/lib/apis/ebay-sold";
import { getCardById, type PokemonCard } from "@/lib/apis/pokemon-tcg";
import { getPriceChartingPrices } from "@/lib/apis/pricecharting";
import { searchFacebookMarketplace } from "@/lib/apis/facebook-marketplace";
import { insertPriceSnapshots } from "@/lib/db/market-prices";
import { upsertDeal, deactivateStaleDeals } from "@/lib/db/deals";

type TrackedCardRow = Database["public"]["Tables"]["tracked_cards"]["Row"];
type MarketPriceInsert = Database["public"]["Tables"]["market_prices"]["Insert"];

interface NormalizedListing {
  itemId: string;
  title: string;
  priceCents: number;
  url: string;
  imageUrl: string;
  sellerName: string;
  condition: string;
  source: "ebay" | "facebook";
}

const MIN_DISCOUNT_PCT = 15;

/**
 * Run the deal detection engine for a single tracked card.
 * 1. Fetch prices from all sources in parallel
 * 2. Calculate blended market price
 * 3. Save price snapshots
 * 4. Fetch active eBay listings
 * 5. Identify deals (listings below blended * threshold)
 * 6. Upsert deals and deactivate stale ones
 */
export async function scanCardForDeals(
  supabase: SupabaseClient<Database>,
  card: TrackedCardRow
): Promise<ScanResult> {
  const result: ScanResult = {
    trackedCardId: card.id,
    cardName: card.card_name,
    dealsFound: 0,
    pricesUpdated: 0,
    errors: [],
  };

  // 1. Fetch prices from all sources in parallel
  const [tcgResult, ebaySoldResult, pcResult] = await Promise.allSettled([
    card.pokemon_tcg_id
      ? getCardById(card.pokemon_tcg_id)
      : Promise.resolve(null),
    getEbaySoldAverage(card.card_name, card.card_set ?? undefined),
    getPriceChartingPrices(card.card_name, card.card_set ?? undefined),
  ]);

  const tcgCard: PokemonCard | null =
    tcgResult.status === "fulfilled" ? tcgResult.value : null;
  const tcgplayerPrice = tcgCard?.tcgplayerPriceCents ?? null;
  if (tcgResult.status === "rejected") {
    result.errors.push(`TCGPlayer: ${tcgResult.reason}`);
  }

  const ebaySoldAvg =
    ebaySoldResult.status === "fulfilled"
      ? ebaySoldResult.value.averagePriceCents || null
      : null;
  if (ebaySoldResult.status === "rejected") {
    result.errors.push(`eBay Sold: ${ebaySoldResult.reason}`);
  }

  const pcRawPrice =
    pcResult.status === "fulfilled"
      ? pcResult.value.rawPriceCents
      : null;
  const pcGradedPrice =
    pcResult.status === "fulfilled"
      ? pcResult.value.gradedPriceCents
      : null;
  if (pcResult.status === "rejected") {
    result.errors.push(`PriceCharting: ${pcResult.reason}`);
  }

  // 2. Calculate blended market price
  const prices: Record<PriceSourceName, number | null> = {
    tcgplayer: tcgplayerPrice,
    pricecharting_raw: pcRawPrice,
    pricecharting_graded: pcGradedPrice,
    ebay_sold_avg: ebaySoldAvg,
  };

  const blended = calculateBlendedPrice(prices);

  if (blended.blendedPriceCents === 0) {
    result.errors.push("No price sources available, skipping");
    return result;
  }

  // 3. Save price snapshots
  const snapshots: MarketPriceInsert[] = [];
  const sourceEntries: [PriceSourceName, number | null][] = [
    ["tcgplayer", tcgplayerPrice],
    ["pricecharting_raw", pcRawPrice],
    ["pricecharting_graded", pcGradedPrice],
    ["ebay_sold_avg", ebaySoldAvg],
  ];

  for (const [source, priceCents] of sourceEntries) {
    if (priceCents != null && priceCents > 0) {
      snapshots.push({
        tracked_card_id: card.id,
        source,
        price_cents: priceCents,
      });
    }
  }

  try {
    await insertPriceSnapshots(supabase, snapshots);
    result.pricesUpdated = snapshots.length;
  } catch (err) {
    result.errors.push(`Price snapshot insert: ${err}`);
  }

  // 4. Fetch active listings from eBay AND Facebook Marketplace in parallel
  const allListings: NormalizedListing[] = [];

  const [ebayResult, fbResult] = await Promise.allSettled([
    searchEbayListings(card.card_name, card.card_set ?? undefined),
    searchFacebookMarketplace(card.card_name, card.card_set ?? undefined),
  ]);

  if (ebayResult.status === "fulfilled") {
    for (const l of ebayResult.value) {
      allListings.push({ ...l, itemId: l.itemId, source: "ebay" });
    }
  } else {
    result.errors.push(`eBay Browse: ${ebayResult.reason}`);
  }

  if (fbResult.status === "fulfilled") {
    for (const l of fbResult.value) {
      allListings.push({
        itemId: `fb-${l.listingId}`,
        title: l.title,
        priceCents: l.priceCents,
        url: l.url,
        imageUrl: l.imageUrl,
        sellerName: `${l.sellerName} (${l.location})`,
        condition: "Not Specified",
        source: "facebook",
      });
    }
  } else {
    result.errors.push(`Facebook Marketplace: ${fbResult.reason}`);
  }

  if (allListings.length === 0) {
    result.errors.push("No listings found from any source");
    return result;
  }

  // 5. Identify deals and upsert with full card metadata
  const activeItemIds: string[] = [];

  for (const listing of allListings) {
    activeItemIds.push(listing.itemId);

    const discountPct = evaluateDeal(
      listing.priceCents,
      blended.blendedPriceCents,
      MIN_DISCOUNT_PCT
    );

    if (discountPct != null) {
      const productType = detectProductType(listing.title, listing.condition);

      try {
        await upsertDeal(supabase, {
          tracked_card_id: card.id,
          user_id: card.user_id,
          ebay_item_id: listing.itemId,
          ebay_title: listing.title,
          ebay_price_cents: listing.priceCents,
          ebay_url: listing.url,
          ebay_image_url: listing.imageUrl,
          seller_name: listing.sellerName,
          condition: listing.condition,
          blended_market_price_cents: blended.blendedPriceCents,
          discount_pct: discountPct,
          is_active: true,
          listing_source: listing.source,
          product_type: productType,
          card_name: card.card_name,
          card_set: card.card_set,
          card_series: tcgCard?.set ?? null,
          card_number: tcgCard?.number ?? null,
          rarity: tcgCard?.rarity ?? null,
          pokemon_tcg_id: card.pokemon_tcg_id,
          image_url: card.image_url ?? tcgCard?.imageLarge ?? null,
          prices_tcgplayer: tcgplayerPrice,
          prices_pricecharting_raw: pcRawPrice,
          prices_pricecharting_graded: pcGradedPrice,
          prices_ebay_sold_avg: ebaySoldAvg,
          psa_price_10: pcGradedPrice ? Math.round(pcGradedPrice * 1.8) : null,
          psa_price_9: pcGradedPrice,
          psa_price_8: pcGradedPrice ? Math.round(pcGradedPrice * 0.6) : null,
        });
        result.dealsFound++;
      } catch (err) {
        result.errors.push(`Deal upsert (${listing.itemId}): ${err}`);
      }
    }
  }

  // 6. Mark stale deals as inactive
  if (activeItemIds.length > 0) {
    try {
      await deactivateStaleDeals(supabase, card.id, activeItemIds);
    } catch (err) {
      result.errors.push(`Stale deal deactivation: ${err}`);
    }
  }

  return result;
}

const GRADED_KEYWORDS = /\bpsa\s*\d|bgs\s*\d|cgc\s*\d|graded|slab\b/i;
const SEALED_KEYWORDS = /\bsealed|etb|booster\s*box|booster\s*pack|booster\s*bundle|tin|upc|blister|case\b/i;

function detectProductType(title: string, condition: string): string {
  const text = `${title} ${condition}`;
  if (GRADED_KEYWORDS.test(text)) return "graded";
  if (SEALED_KEYWORDS.test(text)) return "raw";
  if (/factory\s*sealed/i.test(condition)) return "etb";
  return "raw";
}

/**
 * Run the deal detection engine for all tracked cards.
 */
export async function scanAllCards(
  supabase: SupabaseClient<Database>,
  cards: TrackedCardRow[]
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  // Process sequentially to avoid rate limiting
  for (const card of cards) {
    const result = await scanCardForDeals(supabase, card);
    results.push(result);
  }

  return results;
}
