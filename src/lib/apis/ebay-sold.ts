import * as cheerio from "cheerio";
import { parseScrapedSellerFeedbackCount } from "@/lib/listing/seller-feedback";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export interface EbaySoldItem {
  title: string;
  priceCents: number;
  soldDate: string;
}

export interface EbaySoldResult {
  items: EbaySoldItem[];
  /** Mean of up to five most recent sold comps (see `SOLD_SAMPLE_SIZE`). */
  averagePriceCents: number;
}

export interface EbaySoldOptions {
  /** Drop comps whose titles fail this check (e.g. English-only). */
  titleFilter?: (title: string) => boolean;
  /**
   * Raw finder: use **only** completed sold HTML (`LH_Sold=1`). Never call the
   * Browse `item_summary` API — it is not sold history and routinely returns
   * active slab BINs that look like “comps.” If scrape yields nothing, return
   * an empty result instead of a misleading average.
   */
  scrapeOnly?: boolean;
}

const SOLD_SAMPLE_SIZE = 5;
const SOLD_FETCH_CAP = 24;

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

function averageFromItems(items: EbaySoldItem[]): number {
  if (items.length === 0) return 0;
  return Math.round(
    items.reduce((sum, i) => sum + i.priceCents, 0) / items.length
  );
}

async function soldViaApi(
  query: string,
  options?: EbaySoldOptions
): Promise<EbaySoldResult> {
  const token = await getEbayOAuthToken();
  if (!token) return { items: [], averagePriceCents: 0 };

  const params = new URLSearchParams({
    q: query,
    category_ids: "183454",
    filter: "buyingOptions:{FIXED_PRICE}",
    sort: "newlyListed",
    limit: String(SOLD_FETCH_CAP),
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

  const picked: EbaySoldItem[] = [];
  for (const item of apiItems as {
    title: string;
    price: { value: string };
    seller?: { feedbackScore?: number };
  }[]) {
    const fb = item.seller?.feedbackScore ?? 0;
    if (fb <= 0) continue;
    if (options?.titleFilter && !options.titleFilter(item.title)) continue;
    picked.push({
      title: item.title,
      priceCents: Math.round(parseFloat(item.price?.value ?? "0") * 100),
      soldDate: new Date().toISOString().split("T")[0],
    });
    if (picked.length >= SOLD_SAMPLE_SIZE) break;
  }

  return {
    items: picked,
    averagePriceCents: averageFromItems(picked),
  };
}

async function soldViaScrape(
  query: string,
  options?: EbaySoldOptions
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
    if (items.length >= SOLD_SAMPLE_SIZE) return false;

    const $item = $(el);
    const title = $item.find(".s-item__title span, .s-item__title").first().text().trim();
    if (!title || title === "Shop on eBay") return;

    if (options?.titleFilter && !options.titleFilter(title)) return;

    const priceText = $item.find(".s-item__price").first().text();
    const priceCents = parsePriceCents(priceText);
    if (!priceCents || priceCents <= 0) return;

    const sellerLine = $item
      .find(".s-item__seller-info-text, .s-item__seller-info")
      .text()
      .trim();
    const fb = parseScrapedSellerFeedbackCount(sellerLine);
    if (fb === 0) return;

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

  return {
    items,
    averagePriceCents: averageFromItems(items),
  };
}

/**
 * Get eBay sold/completed listing prices.
 * Uses the API when available, falls back to scraping.
 */
export async function getEbaySoldAverage(
  cardName: string,
  cardSet?: string,
  listingQualifier?: string,
  options?: EbaySoldOptions
): Promise<EbaySoldResult> {
  if (USE_MOCK) {
    const items = mockSoldItems.slice(0, SOLD_SAMPLE_SIZE).map((i) => ({
      ...i,
      title: `${cardName} ${cardSet ?? ""} ${listingQualifier ?? ""} - ${i.title}`.trim(),
    }));
    return { items, averagePriceCents: averageFromItems(items) };
  }

  const query = [cardName, cardSet, listingQualifier]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (options?.scrapeOnly) {
    try {
      const scraped = await soldViaScrape(query, options);
      if (scraped.items.length > 0) return scraped;
    } catch (err) {
      console.warn("eBay sold scrape-only (raw) failed:", err);
    }
    /**
     * Vercel / serverless often cannot scrape eBay sold HTML (0 rows). Browse
     * `item_summary` is **not** sold history (active listings) — noisy for raw,
     * but better than a dead blend. On Vercel we default this on when EBAY
     * credentials exist; set `EBAY_SOLD_RAW_ALLOW_BROWSE_FALLBACK=false` to opt out.
     */
    const browseFallback =
      process.env.EBAY_SOLD_RAW_ALLOW_BROWSE_FALLBACK === "true" ||
      (process.env.VERCEL === "1" &&
        process.env.EBAY_SOLD_RAW_ALLOW_BROWSE_FALLBACK !== "false");
    if (browseFallback && process.env.EBAY_APP_ID) {
      try {
        const api = await soldViaApi(query, options);
        if (api.items.length > 0) return api;
      } catch (err) {
        console.warn("eBay sold Browse fallback (raw) failed:", err);
      }
    }
    return { items: [], averagePriceCents: 0 };
  }

  /**
   * Completed sales: the sold HTML search (LH_Sold=1) is the reliable source.
   * Browse API `item_summary/search` is for buyable listings, not sold history,
   * and often surfaces active BIN slabs that skew “raw” comps into PSA prices.
   */
  const scrapeFirst = process.env.EBAY_SOLD_API_FIRST !== "true";
  if (scrapeFirst) {
    try {
      const scraped = await soldViaScrape(query, options);
      if (scraped.items.length > 0) return scraped;
    } catch (err) {
      console.warn("eBay sold scrape failed, trying Browse API fallback:", err);
    }
  }

  if (process.env.EBAY_APP_ID) {
    try {
      const result = await soldViaApi(query, options);
      if (result.items.length > 0) return result;
    } catch (err) {
      console.warn("eBay sold API failed:", err);
    }
  }

  if (!scrapeFirst) {
    try {
      return await soldViaScrape(query, options);
    } catch (err) {
      console.warn("eBay sold scrape failed after API:", err);
    }
  }

  return { items: [], averagePriceCents: 0 };
}
