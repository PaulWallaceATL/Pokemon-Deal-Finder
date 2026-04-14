/**
 * Collectr-style pricing for the finder, in order:
 * 1. `COLLECTR_MARKET_API_URL` — your HTTPS bridge (POST → `{ priceCents }`).
 * 2. `APIFY_COLLECTR_ACTOR_ID` + `APIFY_API_TOKEN` — Apify actor (see `collectr-apify.ts`).
 *
 * This app does **not** scrape Collectr’s website (their API terms forbid that
 * outside official API access). Use a bridge, official Collectr API keys in your
 * actor, or another compliant source inside Apify.
 */

import { getCollectrPriceViaApify } from "@/lib/apis/collectr-apify";

async function postPriceCents(
  url: string | undefined,
  apiKey: string | undefined,
  body: Record<string, unknown>
): Promise<number | null> {
  if (!url) return null;
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { priceCents?: number };
    if (typeof data.priceCents !== "number" || data.priceCents <= 0) return null;
    return Math.round(data.priceCents);
  } catch {
    return null;
  }
}

export async function getCollectrMarketPriceCents(context: {
  cardName: string;
  setName?: string;
  category: string;
  grader?: string;
  grade?: string;
  /** e.g. GG63, 105/159 — helps the bridge pick the right printing. */
  cardNumber?: string;
  /** Original marketplace title for disambiguation. */
  listingTitle?: string;
  /** e.g. "radiant, reverse holo" */
  variantHints?: string;
  /**
   * When category is `raw`, set true so the bridge returns **ungraded** market
   * price (not PSA 10).
   */
  explicitlyUngraded?: boolean;
}): Promise<number | null> {
  const url = process.env.COLLECTR_MARKET_API_URL;
  const key = process.env.COLLECTR_MARKET_API_KEY;
  const fromBridge = await postPriceCents(url, key, context);
  if (fromBridge != null) return fromBridge;
  return getCollectrPriceViaApify(context);
}

export async function getAltAppMarketPriceCents(context: {
  cardName: string;
  setName?: string;
  category: string;
  grader?: string;
  grade?: string;
}): Promise<number | null> {
  const url = process.env.ALT_APP_MARKET_API_URL;
  const key = process.env.ALT_APP_MARKET_API_KEY;
  return postPriceCents(url, key, context);
}
