import { NextResponse } from "next/server";
import { searchEbayListings } from "@/lib/apis/ebay-browse";
import { getEbaySoldAverage } from "@/lib/apis/ebay-sold";
import { searchCards } from "@/lib/apis/pokemon-tcg";
import { searchFacebookMarketplace } from "@/lib/apis/facebook-marketplace";
import { getCollectrMarketPriceCents } from "@/lib/apis/optional-marketplaces";
import { calculateCollectrEbayBlend } from "@/lib/engine/finder-price-blend";
import { titleLooksJapaneseImport } from "@/lib/listing/english-comps";
import { listingAtOrBelowReference } from "@/lib/engine/price-aggregator";
import type { Deal } from "@/lib/deals/types";
import { listingMarketReferenceCents } from "@/lib/listing/slab-reference-price";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import {
  finishSearchSuffix,
  parseCardFinish,
  titleMatchesFinishFilter,
} from "@/lib/pokemon/card-finish";
import { listingTitleMatchesSealedIntent } from "@/lib/pokemon/sealed-listing-gate";
import {
  buildListingQualifier,
  finderCategoryToProductType,
  type FinderListingCategory,
  type GradingCompany,
  type SealedProductKind,
} from "@/lib/pokemon/finder-query";

export const maxDuration = 60;

const GRADERS: GradingCompany[] = ["PSA", "BGS", "CGC", "SGC", "TAG"];

const SEALED_KINDS: SealedProductKind[] = [
  "any",
  "tin",
  "etb",
  "booster_box",
  "booster_bundle",
  "booster_pack",
  "blister",
  "upc",
  "case",
  "other",
];

function parseCategory(v: string | null): FinderListingCategory {
  const x = v?.trim().toLowerCase();
  if (x === "graded" || x === "sealed") return x;
  return "raw";
}

function parseGrader(v: string | null): GradingCompany {
  const u = v?.trim().toUpperCase();
  return GRADERS.includes(u as GradingCompany) ? (u as GradingCompany) : "PSA";
}

function parseSealedKind(v: string | null): SealedProductKind {
  const x = v?.trim().toLowerCase().replace(/-/g, "_") as SealedProductKind;
  return SEALED_KINDS.includes(x) ? x : "any";
}

const MARKET_SKEW_NOTE =
  "Market value uses Collectr (when COLLECTR_MARKET_API_URL is set) and eBay last-five English sold comps; Japanese import titles are filtered out so English PSA comps are not mixed with JP. Many cards share the same name across sets—use the set filter. See .env.local.example for a Collectr bridge.";

/**
 * Instant deal search -- scrapes eBay, fetches market prices from all sources,
 * compares, and returns deal-shaped results. No database, no auth required.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const setId = searchParams.get("setId")?.trim();
  const legacySet = searchParams.get("set")?.trim();
  const category = parseCategory(searchParams.get("category"));
  const grader = parseGrader(searchParams.get("grader"));
  const grade = searchParams.get("grade")?.trim() || "10";
  const sealedKind = parseSealedKind(searchParams.get("sealedKind"));
  const finish = parseCardFinish(searchParams.get("finish"));

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const setNameFromCatalog =
    setId && setId !== "all"
      ? POKEMON_SETS.find((s) => s.value === setId)?.label
      : undefined;
  const setNameForMarket = setNameFromCatalog ?? legacySet ?? undefined;

  const baseQualifier = buildListingQualifier({
    category,
    sealedKind: category === "sealed" ? sealedKind : undefined,
    grader: category === "graded" ? grader : undefined,
    grade: category === "graded" ? grade : undefined,
  });

  const finishSuffix =
    category === "raw" && finish !== "any" ? finishSearchSuffix(finish) : "";

  const listingQualifier = [baseQualifier, finishSuffix]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const productType = finderCategoryToProductType(
    category,
    category === "sealed" ? sealedKind : undefined
  );

  const marketContext = {
    cardName: query,
    setName: setNameForMarket,
    category,
    grader: category === "graded" ? grader : undefined,
    grade: category === "graded" ? grade : undefined,
  };

  try {
    const tcgSearchOpts =
      setId && setId !== "all" ? { setId } : undefined;

    const englishComp = (title: string) => !titleLooksJapaneseImport(title);

    const [ebayResult, fbResult, ebaySoldResult, tcgResult, collectrResult] =
      await Promise.allSettled([
        searchEbayListings(query, setNameForMarket, listingQualifier, {
          allowBundleKeyword: category === "sealed",
        }),
        searchFacebookMarketplace(query, setNameForMarket, listingQualifier),
        getEbaySoldAverage(query, setNameForMarket, listingQualifier, {
          titleFilter: englishComp,
        }),
        searchCards(query, tcgSearchOpts),
        getCollectrMarketPriceCents(marketContext),
      ]);

    const tcgCards =
      tcgResult.status === "fulfilled" ? tcgResult.value : [];
    const tcgCard = tcgCards[0] ?? null;

    const ebaySoldAvg =
      ebaySoldResult.status === "fulfilled"
        ? ebaySoldResult.value.averagePriceCents || null
        : null;

    const collectrPrice =
      collectrResult.status === "fulfilled" ? collectrResult.value : null;

    const marketPrices = {
      collectr: collectrPrice,
      ebay_sold_avg: ebaySoldAvg,
    };

    const blended = calculateCollectrEbayBlend({
      collectr: collectrPrice,
      ebay_sold_avg: ebaySoldAvg,
    });

    if (blended.blendedPriceCents === 0) {
      return NextResponse.json({
        deals: [],
        marketPrices,
        blendedPriceCents: 0,
        totalListings: 0,
        category,
        listingQualifier,
        finish: category === "raw" ? finish : undefined,
        disclaimer: MARKET_SKEW_NOTE,
        message:
          "No market price data: configure COLLECTR_MARKET_API_URL for Collectr, and ensure eBay sold comps return (English-only, sellers with feedback).",
      });
    }

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

    const listingsAfterFinish =
      category === "raw" && finish !== "any"
        ? allListings.filter((l) => titleMatchesFinishFilter(l.title, finish))
        : allListings;

    let listingsFiltered =
      category === "sealed"
        ? listingsAfterFinish.filter((l) =>
            listingTitleMatchesSealedIntent(l.title, sealedKind)
          )
        : listingsAfterFinish;

    listingsFiltered = listingsFiltered.filter(
      (l) => !titleLooksJapaneseImport(l.title)
    );

    const deals: Deal[] = listingsFiltered
      .map((listing): Deal | null => {
        const { referenceCents, note } = listingMarketReferenceCents({
          listingTitle: listing.title,
          category,
          blendedDefault: blended.blendedPriceCents,
          filterGrader: grader,
          filterGrade: grade,
          gradedAnchorCents: blended.blendedPriceCents,
        });

        if (referenceCents <= 0) return null;

        if (!listingAtOrBelowReference(listing.priceCents, referenceCents)) {
          return null;
        }

        const actualDiscount =
          ((referenceCents - listing.priceCents) / referenceCents) * 100;

        return {
          id: listing.id,
          cardName: listing.title,
          cardSet: tcgCard?.set ?? setNameForMarket ?? "",
          cardSeries: "",
          cardNumber: tcgCard?.number ?? "",
          rarity: tcgCard?.rarity ?? "",
          pokemonTcgId: tcgCard?.id ?? "",
          imageUrl:
            listing.imageUrl ||
            tcgCard?.imageLarge ||
            tcgCard?.imageSmall ||
            "",
          ebayItemId: listing.id,
          ebayTitle: listing.title,
          ebayPriceCents: listing.priceCents,
          ebayUrl: listing.url,
          ebayImageUrl: listing.imageUrl,
          sellerName: listing.sellerName,
          condition: listing.condition,
          blendedMarketPriceCents: referenceCents,
          discountPct: Math.round(actualDiscount * 100) / 100,
          foundAt: new Date().toISOString(),
          isActive: true,
          listingSource: listing.source,
          productType,
          prices: {
            tcgplayer: null,
            pricechartingRaw: null,
            pricechartingGraded: null,
            ebaySoldAvg: ebaySoldAvg,
            collectr: collectrPrice,
          },
          psaPrices: null,
          predictedGrade: null,
          ebayLast5AvgCents: ebaySoldAvg,
          listingReferenceNote: note,
        };
      })
      .filter((d): d is Deal => d !== null)
      .sort((a, b) => b.discountPct - a.discountPct);

    return NextResponse.json({
      deals,
      marketPrices,
      blendedPriceCents: blended.blendedPriceCents,
      totalListings: listingsFiltered.length,
      cardInfo: tcgCard
        ? {
            name: tcgCard.name,
            set: tcgCard.set,
            number: tcgCard.number,
            rarity: tcgCard.rarity,
            image: tcgCard.imageLarge || tcgCard.imageSmall,
          }
        : null,
      category,
      listingQualifier,
      finish: category === "raw" ? finish : undefined,
      sealedKind: category === "sealed" ? sealedKind : undefined,
      grader: category === "graded" ? grader : undefined,
      grade: category === "graded" ? grade : undefined,
      disclaimer: MARKET_SKEW_NOTE,
      ebaySoldSampleSize:
        ebaySoldResult.status === "fulfilled"
          ? ebaySoldResult.value.items.length
          : 0,
    });
  } catch (error) {
    console.error("Deal search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
