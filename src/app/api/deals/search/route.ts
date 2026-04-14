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
import {
  extractSlabFromTitle,
  listingMarketReferenceCents,
} from "@/lib/listing/slab-reference-price";
import {
  soldTitleMatchesGradeRough,
  titleLooksLikeGradedOrSlab,
} from "@/lib/listing/raw-comps";
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
import {
  compKeyForListing,
  parseListingCompFromTitle,
  variantSoldQualifier,
} from "@/lib/listing/listing-comp-query";

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

const MAX_UNIQUE_COMP_KEYS = 26;
const COMP_FETCH_CONCURRENCY = 5;

const MARKET_SKEW_NOTE =
  "Raw mode uses completed sold eBay pages only (no Browse API fallback) plus title filters to drop slab wording. Set COLLECTR_MARKET_API_URL so Collectr can anchor ungraded price (explicitlyUngraded in the POST body); without it, the guide is eBay-only and may be thin if sold scrape returns few rows. Graded mode matches slab grade in each title. Japanese imports are filtered out.";

function medianPositiveCents(values: number[]): number | null {
  const v = values
    .filter((x) => Number.isFinite(x) && x > 0)
    .sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 1
    ? v[mid]!
    : Math.round((v[mid - 1]! + v[mid]!) / 2);
}

type CompBundle = {
  ebaySoldAvg: number | null;
  collectr: number | null;
  blendedPriceCents: number;
  sampleSize: number;
  /** Raw finder: PSA 10 Collectr hint for display only (not in blend). */
  collectrGradedPsa10: number | null;
};

function buildEffectiveListingQualifier(params: {
  category: FinderListingCategory;
  listingTitle: string;
  defaultGrader: GradingCompany;
  defaultGrade: string;
  sealedKind: SealedProductKind;
  finishSuffix: string;
}): string {
  const {
    category,
    listingTitle,
    defaultGrader,
    defaultGrade,
    sealedKind,
    finishSuffix,
  } = params;

  if (category === "graded") {
    const slab = extractSlabFromTitle(listingTitle);
    let grader = defaultGrader;
    let grade = defaultGrade;
    if (slab) {
      const c = slab.company.toUpperCase();
      if (["PSA", "BGS", "CGC", "SGC", "TAG"].includes(c)) {
        grader = c as GradingCompany;
      }
      grade = String(slab.grade);
    }
    const base = buildListingQualifier({
      category: "graded",
      grader,
      grade,
    });
    return [base, finishSuffix].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }
  if (category === "raw") {
    const base = buildListingQualifier({ category: "raw" });
    return [base, finishSuffix].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }
  const base = buildListingQualifier({
    category: "sealed",
    sealedKind,
  });
  return [base, finishSuffix].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

async function fetchListingCompBundle(args: {
  listingTitle: string;
  setName: string | undefined;
  category: FinderListingCategory;
  defaultGrader: GradingCompany;
  defaultGrade: string;
  sealedKind: SealedProductKind;
  finishSuffix: string;
  soldTitleFilter: (title: string) => boolean;
}): Promise<CompBundle> {
  const isSealed = args.category === "sealed";
  const parsed = parseListingCompFromTitle(args.listingTitle, args.setName);
  const effQualifier = buildEffectiveListingQualifier({
    category: args.category,
    listingTitle: args.listingTitle,
    defaultGrader: args.defaultGrader,
    defaultGrade: args.defaultGrade,
    sealedKind: args.sealedKind,
    finishSuffix: args.finishSuffix,
  });
  const combinedQualifier = [effQualifier, variantSoldQualifier(parsed)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const cardLine = isSealed
    ? args.listingTitle.slice(0, 120)
    : parsed.ebayCardQuery;
  const collectrName = isSealed
    ? args.listingTitle.slice(0, 160)
    : parsed.collectrCardName || cardLine;

  const variantHints =
    [
      parsed.isRadiant ? "radiant" : "",
      parsed.isReverseHolo ? "reverse holo" : "",
    ]
      .filter(Boolean)
      .join(", ") || undefined;

  let collectrGrader: GradingCompany | undefined;
  let collectrGradeStr: string | undefined;
  if (args.category === "graded") {
    const slab = extractSlabFromTitle(args.listingTitle);
    if (slab) {
      const c = slab.company.toUpperCase();
      if (["PSA", "BGS", "CGC", "SGC", "TAG"].includes(c)) {
        collectrGrader = c as GradingCompany;
        collectrGradeStr = String(slab.grade);
      }
    }
    if (!collectrGrader) {
      collectrGrader = args.defaultGrader;
      collectrGradeStr = args.defaultGrade;
    }
  }

  const gradedSoldTitleFilter =
    args.category === "graded" && collectrGrader && collectrGradeStr
      ? (t: string) =>
          args.soldTitleFilter(t) &&
          soldTitleMatchesGradeRough(t, collectrGrader, collectrGradeStr)
      : args.soldTitleFilter;

  const [soldRes, collectrMain, collectrPsa10Side] = await Promise.all([
    getEbaySoldAverage(cardLine, args.setName, combinedQualifier, {
      titleFilter: gradedSoldTitleFilter,
      /** Raw: never use Browse API for “sold” — it mixes active slab BINs. */
      scrapeOnly: args.category === "raw",
    }),
    getCollectrMarketPriceCents({
      cardName: collectrName,
      setName: args.setName,
      category: args.category,
      grader: collectrGrader,
      grade: collectrGradeStr,
      cardNumber: isSealed ? undefined : parsed.catalogNumber,
      listingTitle: args.listingTitle,
      variantHints,
      explicitlyUngraded: args.category === "raw" ? true : undefined,
    }),
    args.category === "raw"
      ? getCollectrMarketPriceCents({
          cardName: collectrName,
          setName: args.setName,
          category: "graded",
          grader: "PSA",
          grade: "10",
          cardNumber: isSealed ? undefined : parsed.catalogNumber,
          listingTitle: args.listingTitle,
          variantHints,
        })
      : Promise.resolve(null),
  ]);

  const ebayAvg =
    soldRes.averagePriceCents > 0 ? soldRes.averagePriceCents : null;
  const blend = calculateCollectrEbayBlend({
    collectr: collectrMain,
    ebay_sold_avg: ebayAvg,
  });

  return {
    ebaySoldAvg: ebayAvg,
    collectr: collectrMain,
    blendedPriceCents: blend.blendedPriceCents,
    sampleSize: soldRes.items.length,
    collectrGradedPsa10: collectrPsa10Side,
  };
}

async function mapInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}

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

  try {
    const tcgSearchOpts =
      setId && setId !== "all" ? { setId } : undefined;

    const englishComp = (title: string) => !titleLooksJapaneseImport(title);
    const soldTitleFilter = (t: string) =>
      englishComp(t) &&
      (category !== "raw" || !titleLooksLikeGradedOrSlab(t));

    const [ebayResult, fbResult, tcgResult] = await Promise.allSettled([
      searchEbayListings(query, setNameForMarket, listingQualifier, {
        allowBundleKeyword: category === "sealed",
      }),
      searchFacebookMarketplace(query, setNameForMarket, listingQualifier),
      searchCards(query, tcgSearchOpts),
    ]);

    const tcgCards =
      tcgResult.status === "fulfilled" ? tcgResult.value : [];
    const tcgCard = tcgCards[0] ?? null;

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

    if (listingsFiltered.length === 0) {
      return NextResponse.json({
        deals: [],
        marketPrices: { collectr: null, ebay_sold_avg: null },
        blendedPriceCents: 0,
        totalListings: 0,
        category,
        listingQualifier,
        finish: category === "raw" ? finish : undefined,
        sealedKind: category === "sealed" ? sealedKind : undefined,
        grader: category === "graded" ? grader : undefined,
        grade: category === "graded" ? grade : undefined,
        disclaimer: MARKET_SKEW_NOTE,
        message: "No listings matched your filters.",
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
    }

    const genericBundle = await fetchListingCompBundle({
      listingTitle: query,
      setName: setNameForMarket,
      category,
      defaultGrader: grader,
      defaultGrade: grade,
      sealedKind,
      finishSuffix,
      soldTitleFilter,
    });

    const freq = new Map<string, number>();
    const keyToExampleTitle = new Map<string, string>();
    for (const l of listingsFiltered) {
      const k = compKeyForListing(
        l.title,
        setNameForMarket,
        category,
        grader,
        grade
      );
      freq.set(k, (freq.get(k) ?? 0) + 1);
      if (!keyToExampleTitle.has(k)) keyToExampleTitle.set(k, l.title);
    }

    const sortedKeys = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    const keysToFetch = sortedKeys.slice(0, MAX_UNIQUE_COMP_KEYS);

    const keyedBundles = await mapInChunks(
      keysToFetch,
      COMP_FETCH_CONCURRENCY,
      async (k) => {
        const title = keyToExampleTitle.get(k)!;
        const b = await fetchListingCompBundle({
          listingTitle: title,
          setName: setNameForMarket,
          category,
          defaultGrader: grader,
          defaultGrade: grade,
          sealedKind,
          finishSuffix,
          soldTitleFilter,
        });
        return { k, b };
      }
    );

    const bundleByKey = new Map<string, CompBundle>();
    for (const { k, b } of keyedBundles) bundleByKey.set(k, b);

    const resolveBundle = (title: string): CompBundle => {
      const k = compKeyForListing(
        title,
        setNameForMarket,
        category,
        grader,
        grade
      );
      return bundleByKey.get(k) ?? genericBundle;
    };

    const perListingBundles = listingsFiltered.map((l) =>
      resolveBundle(l.title)
    );
    const blendsForHeader = perListingBundles
      .map((b) => b.blendedPriceCents)
      .filter((c) => c > 0);
    const headerBlendedCents =
      medianPositiveCents(blendsForHeader) ??
      (genericBundle.blendedPriceCents > 0
        ? genericBundle.blendedPriceCents
        : 0);

    const marketPrices = {
      collectr: medianPositiveCents(
        perListingBundles
          .map((b) => b.collectr)
          .filter((c): c is number => c != null && c > 0)
      ),
      ebay_sold_avg: medianPositiveCents(
        perListingBundles
          .map((b) => b.ebaySoldAvg)
          .filter((c): c is number => c != null && c > 0)
      ),
    };

    let maxSoldSample = genericBundle.sampleSize;
    for (const b of bundleByKey.values()) {
      maxSoldSample = Math.max(maxSoldSample, b.sampleSize);
    }

    const deals: Deal[] = listingsFiltered
      .map((listing): Deal | null => {
        const bundle = resolveBundle(listing.title);
        maxSoldSample = Math.max(maxSoldSample, bundle.sampleSize);

        const parsed = parseListingCompFromTitle(
          listing.title,
          setNameForMarket
        );

        const { referenceCents, note } = listingMarketReferenceCents({
          listingTitle: listing.title,
          category,
          blendedDefault: bundle.blendedPriceCents,
          filterGrader: grader,
          filterGrade: grade,
        });

        if (bundle.blendedPriceCents <= 0) return null;
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
          cardNumber: parsed.catalogNumber ?? tcgCard?.number ?? "",
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
            ebaySoldAvg: bundle.ebaySoldAvg,
            collectr: bundle.collectr,
            collectrGradedPsa10:
              category === "raw" ? bundle.collectrGradedPsa10 : null,
          },
          psaPrices: null,
          predictedGrade: null,
          ebayLast5AvgCents: bundle.ebaySoldAvg,
          listingReferenceNote: note,
        };
      })
      .filter((d): d is Deal => d !== null)
      .sort((a, b) => b.discountPct - a.discountPct);

    return NextResponse.json({
      deals,
      marketPrices,
      blendedPriceCents: headerBlendedCents,
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
      ebaySoldSampleSize: maxSoldSample,
      message:
        deals.length === 0 && listingsFiltered.length > 0
          ? "No listings were priced below the per-card market estimate (Collectr + eBay sold comps). Try a narrower search or check COLLECTR_MARKET_API_URL / eBay sold data."
          : undefined,
    });
  } catch (error) {
    console.error("Deal search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
