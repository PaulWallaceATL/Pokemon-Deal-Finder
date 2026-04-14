/**
 * Optional Collectr pricing via **Apify** (no Collectr web scraping in this repo).
 *
 * Set `APIFY_COLLECTR_ACTOR_ID` (+ existing `APIFY_API_TOKEN`) to an Apify actor
 * whose input/output you control—e.g. a custom actor that uses Collectr’s
 * **official** API or UI per their terms. The default POST body matches what the
 * bridge would receive so you can clone your bridge logic into Apify.
 *
 * Actor must respond to `run-sync-get-dataset-items` with a JSON array; we read
 * the **first** item and look for `priceCents` / `marketPrice` / etc.
 */

const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();
const COLLECTR_ACTOR = process.env.APIFY_COLLECTR_ACTOR_ID?.trim();

function actorPathSegment(actorId: string): string {
  return actorId.replace(/\//g, "~");
}

function extractCentsFromItem(item: Record<string, unknown>): number | null {
  const directKeys = [
    "priceCents",
    "price_cents",
    "marketPriceCents",
    "valueCents",
    "guidePriceCents",
  ];
  for (const k of directKeys) {
    const v = item[k];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      return Math.round(v);
    }
  }

  const mp = item.marketPrice ?? item.market_price ?? item.priceUsd;
  if (typeof mp === "number" && Number.isFinite(mp) && mp > 0) {
    if (mp >= 10_000) return Math.round(mp);
    return Math.round(mp * 100);
  }

  const price = item.price;
  if (typeof price === "number" && Number.isFinite(price) && price > 0) {
    if (price >= 10_000) return Math.round(price);
    return Math.round(price * 100);
  }
  if (typeof price === "string") {
    const n = parseFloat(price.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100);
  }

  return null;
}

export async function getCollectrPriceViaApify(context: {
  cardName: string;
  setName?: string;
  category: string;
  grader?: string;
  grade?: string;
  cardNumber?: string;
  listingTitle?: string;
  variantHints?: string;
  explicitlyUngraded?: boolean;
}): Promise<number | null> {
  if (!APIFY_TOKEN || !COLLECTR_ACTOR) return null;

  const url = `https://api.apify.com/v2/acts/${actorPathSegment(COLLECTR_ACTOR)}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardName: context.cardName,
        setName: context.setName,
        category: context.category,
        grader: context.grader,
        grade: context.grade,
        cardNumber: context.cardNumber,
        listingTitle: context.listingTitle,
        variantHints: context.variantHints,
        explicitlyUngraded: context.explicitlyUngraded,
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!response.ok) {
      console.warn(
        `Apify Collectr actor ${response.status}: ${(await response.text()).slice(0, 200)}`
      );
      return null;
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    if (!first || typeof first !== "object") return null;

    const cents = extractCentsFromItem(first as Record<string, unknown>);
    return cents != null && cents > 0 ? cents : null;
  } catch (e) {
    console.warn("Apify Collectr actor failed:", e);
    return null;
  }
}
