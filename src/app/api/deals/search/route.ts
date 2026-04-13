import { NextResponse } from "next/server";
import { searchEbayListings } from "@/lib/apis/ebay-browse";
import { getEbaySoldAverage } from "@/lib/apis/ebay-sold";
import { searchCards } from "@/lib/apis/pokemon-tcg";
import { getPriceChartingPrices } from "@/lib/apis/pricecharting";
import { searchFacebookMarketplace } from "@/lib/apis/facebook-marketplace";
import {
  calculateBlendedPrice,
  evaluateDeal,
} from "@/lib/engine/price-aggregator";
import type { PriceSourceName } from "@/lib/engine/types";
import type { Deal } from "@/lib/deals/types";

export const maxDuration = 60;

/**
 * Instant deal search -- scrapes eBay, fetches market prices from all sources,
 * compares, and returns deal-shaped results. No database, no auth required.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const set = searchParams.get("set")?.trim() || undefined;

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    // Run everything in parallel: listings + market prices + card metadata
    const [ebayResult, fbResult, ebaySoldResult, pcResult, tcgResult] =
      await Promise.allSettled([
        searchEbayListings(query, set),
        searchFacebookMarketplace(query, set),
        getEbaySoldAverage(query, set),
        getPriceChartingPrices(query, set),
        searchCards(query),
      ]);

    // Extract market prices
    const tcgCard =
      tcgResult.status === "fulfilled" && tcgResult.value.length > 0
        ? tcgResult.value[0]
        : null;

    const tcgplayerPrice = tcgCard?.tcgplayerPriceCents ?? null;

    const ebaySoldAvg =
      ebaySoldResult.status === "fulfilled"
        ? ebaySoldResult.value.averagePriceCents || null
        : null;

    const pcRawPrice =
      pcResult.status === "fulfilled"
        ? pcResult.value.rawPriceCents
        : null;

    const pcGradedPrice =
      pcResult.status === "fulfilled"
        ? pcResult.value.gradedPriceCents
        : null;

    // Calculate blended market price
    const prices: Record<PriceSourceName, number | null> = {
      tcgplayer: tcgplayerPrice,
      pricecharting_raw: pcRawPrice,
      pricecharting_graded: pcGradedPrice,
      ebay_sold_avg: ebaySoldAvg,
    };
    const blended = calculateBlendedPrice(prices);

    if (blended.blendedPriceCents === 0) {
      return NextResponse.json({
        deals: [],
        marketPrices: prices,
        blendedPriceCents: 0,
        message: "No market price data found for this card",
      });
    }

    // Combine all listings
    interface RawListing {
      id: string;
      title: string;
      priceCents: number;
      url: string;
      imageUrl: string;
      sellerName: string;
      condition: string;
      source: "ebay" | "facebook";
    }

    const allListings: RawListing[] = [];

    if (ebayResult.status === "fulfilled") {
      for (const l of ebayResult.value) {
        allListings.push({
          id: l.itemId,
          title: l.title,
          priceCents: l.priceCents,
          url: l.url,
          imageUrl: l.imageUrl,
          sellerName: l.sellerName,
          condition: l.condition,
          source: "ebay",
        });
      }
    }

    if (fbResult.status === "fulfilled") {
      for (const l of fbResult.value) {
        allListings.push({
          id: `fb-${l.listingId}`,
          title: l.title,
          priceCents: l.priceCents,
          url: l.url,
          imageUrl: l.imageUrl,
          sellerName: `${l.sellerName} (${l.location})`,
          condition: "Not Specified",
          source: "facebook",
        });
      }
    }

    // Build deal objects for ALL listings (even small discounts) so user sees everything
    const deals: Deal[] = allListings
      .map((listing): Deal | null => {
        const discountPct = evaluateDeal(
          listing.priceCents,
          blended.blendedPriceCents,
          0 // show all listings, even 0% discount
        );

        if (discountPct == null && listing.priceCents > blended.blendedPriceCents * 1.5) {
          return null; // skip listings priced way above market
        }

        const actualDiscount =
          ((blended.blendedPriceCents - listing.priceCents) /
            blended.blendedPriceCents) *
          100;

        return {
          id: listing.id,
          cardName: tcgCard?.name ?? query,
          cardSet: tcgCard?.set ?? set ?? "",
          cardSeries: "",
          cardNumber: tcgCard?.number ?? "",
          rarity: tcgCard?.rarity ?? "",
          pokemonTcgId: tcgCard?.id ?? "",
          imageUrl: tcgCard?.imageLarge ?? tcgCard?.imageSmall ?? listing.imageUrl,
          ebayItemId: listing.id,
          ebayTitle: listing.title,
          ebayPriceCents: listing.priceCents,
          ebayUrl: listing.url,
          ebayImageUrl: listing.imageUrl,
          sellerName: listing.sellerName,
          condition: listing.condition,
          blendedMarketPriceCents: blended.blendedPriceCents,
          discountPct: Math.round(actualDiscount * 100) / 100,
          foundAt: new Date().toISOString(),
          isActive: true,
          listingSource: listing.source,
          productType: "raw",
          prices: {
            tcgplayer: tcgplayerPrice,
            pricechartingRaw: pcRawPrice,
            pricechartingGraded: pcGradedPrice,
            ebaySoldAvg: ebaySoldAvg,
          },
          psaPrices: pcGradedPrice
            ? {
                psa10: Math.round(pcGradedPrice * 1.8),
                psa9: pcGradedPrice,
                psa8: Math.round(pcGradedPrice * 0.6),
              }
            : null,
          predictedGrade: null,
        };
      })
      .filter((d): d is Deal => d !== null)
      .sort((a, b) => b.discountPct - a.discountPct);

    return NextResponse.json({
      deals,
      marketPrices: prices,
      blendedPriceCents: blended.blendedPriceCents,
      totalListings: allListings.length,
      cardInfo: tcgCard
        ? {
            name: tcgCard.name,
            set: tcgCard.set,
            number: tcgCard.number,
            rarity: tcgCard.rarity,
            image: tcgCard.imageLarge || tcgCard.imageSmall,
          }
        : null,
    });
  } catch (error) {
    console.error("Deal search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
