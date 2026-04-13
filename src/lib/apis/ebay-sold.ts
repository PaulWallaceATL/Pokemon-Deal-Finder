import * as cheerio from "cheerio";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export interface EbaySoldItem {
  title: string;
  priceCents: number;
  soldDate: string;
}

export interface EbaySoldResult {
  items: EbaySoldItem[];
  averagePriceCents: number;
}

const SCRAPE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const mockSoldItems: EbaySoldItem[] = [
  { title: "Card Sold NM", priceCents: 3800, soldDate: "2026-04-08" },
  { title: "Card Sold LP", priceCents: 3600, soldDate: "2026-04-06" },
  { title: "Card Sold NM/M", priceCents: 4000, soldDate: "2026-04-04" },
  { title: "Card Sold NM", priceCents: 3900, soldDate: "2026-04-02" },
  { title: "Card Sold LP", priceCents: 3700, soldDate: "2026-03-30" },
];

function parsePriceCents(text: string | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : Math.round(parsed * 100);
}

/**
 * Get an OAuth application token from eBay.
 */
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getEbayOAuthToken(): Promise<string | null> {
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!appId || !certId) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const response = await fetch(
    "https://api.ebay.com/identity/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

/**
 * Search eBay sold items via the Browse API (filter for SOLD items).
 * The Browse API doesn't directly provide sold/completed listings,
 * so we search for recently ended items and use those prices as a proxy.
 */
async function soldViaApi(
  query: string
): Promise<EbaySoldResult> {
  const token = await getEbayOAuthToken();
  if (!token) return { items: [], averagePriceCents: 0 };

  const params = new URLSearchParams({
    q: query,
    category_ids: "183454",
    filter: "buyingOptions:{FIXED_PRICE}",
    sort: "newlyListed",
    limit: "10",
  });

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    }
  );

  if (!response.ok) return { items: [], averagePriceCents: 0 };

  const data = await response.json();
  const apiItems = data.itemSummaries ?? [];

  const items: EbaySoldItem[] = apiItems.slice(0, 10).map(
    (item: { title: string; price: { value: string } }) => ({
      title: item.title,
      priceCents: Math.round(parseFloat(item.price?.value ?? "0") * 100),
      soldDate: new Date().toISOString().split("T")[0],
    })
  );

  const averagePriceCents =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.priceCents, 0) / items.length)
      : 0;

  return { items, averagePriceCents };
}

/**
 * Scrape eBay sold listings (fallback).
 */
async function soldViaScrape(
  query: string
): Promise<EbaySoldResult> {
  const searchUrl =
    `https://www.ebay.com/sch/i.html?` +
    new URLSearchParams({
      _nkw: query,
      _sacat: "183454",
      LH_Complete: "1",
      LH_Sold: "1",
      _sop: "13",
      _ipg: "60",
    }).toString();

  const response = await fetch(searchUrl, { headers: SCRAPE_HEADERS });
  if (!response.ok) {
    throw new Error(`eBay sold scrape failed: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const items: EbaySoldItem[] = [];

  $(".s-item").each((_, el) => {
    if (items.length >= 10) return false;

    const $item = $(el);
    const title = $item.find(".s-item__title span, .s-item__title").first().text().trim();
    if (!title || title === "Shop on eBay") return;

    const priceText = $item.find(".s-item__price").first().text();
    const priceCents = parsePriceCents(priceText);
    if (!priceCents || priceCents <= 0) return;

    const dateText =
      $item.find(".s-item__ended-date, .s-item__endedDate, .POSITIVE").text().trim();
    const dateMatch = dateText.match(
      /(?:Sold\s+)?(\w{3}\s+\d{1,2},?\s+\d{4})/i
    );
    let soldDate = new Date().toISOString().split("T")[0];
    if (dateMatch) {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed.getTime())) {
        soldDate = parsed.toISOString().split("T")[0];
      }
    }

    items.push({ title, priceCents, soldDate });
  });

  const averagePriceCents =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.priceCents, 0) / items.length)
      : 0;

  return { items, averagePriceCents };
}

/**
 * Get eBay sold/completed listing prices.
 * Uses the API when available, falls back to scraping.
 */
export async function getEbaySoldAverage(
  cardName: string,
  cardSet?: string
): Promise<EbaySoldResult> {
  if (USE_MOCK) {
    const items = mockSoldItems.map((i) => ({
      ...i,
      title: `${cardName} ${cardSet ?? ""} - ${i.title}`.trim(),
    }));
    const avg = Math.round(
      items.reduce((sum, i) => sum + i.priceCents, 0) / items.length
    );
    return { items, averagePriceCents: avg };
  }

  const query = cardSet ? `${cardName} ${cardSet}` : cardName;

  // Prefer API
  if (process.env.EBAY_APP_ID) {
    try {
      const result = await soldViaApi(query);
      if (result.items.length > 0) return result;
    } catch (err) {
      console.warn("eBay sold API failed, trying scrape:", err);
    }
  }

  return soldViaScrape(query);
}
