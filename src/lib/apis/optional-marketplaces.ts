/**
 * Collectr (collectr.com) pricing for the finder: set `COLLECTR_MARKET_API_URL`
 * to an HTTPS endpoint that accepts POST JSON
 * `{ cardName, setName?, category, grader?, grade?, cardNumber?, listingTitle?, variantHints? }`
 * and returns `{ priceCents: number }`
 * (English / US market price your bridge resolves from Collectr).
 */

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
}): Promise<number | null> {
  const url = process.env.COLLECTR_MARKET_API_URL;
  const key = process.env.COLLECTR_MARKET_API_KEY;
  return postPriceCents(url, key, context);
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
