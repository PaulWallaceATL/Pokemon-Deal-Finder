import * as cheerio from "cheerio";
import { parseScrapedSellerFeedbackCount } from "@/lib/listing/seller-feedback";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export interface EbayListing {
  itemId: string;
  title: string;
  priceCents: number;
  url: string;
  imageUrl: string;
  imageUrls: string[];
  sellerName: string;
  condition: string;
  /** Browse API `seller.feedbackScore`; scrape may omit (undefined). */
  sellerFeedbackScore?: number;
}

const EBAY_APP_ID = process.env.EBAY_APP_ID;

const SCRAPE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const mockListings: EbayListing[] = [
  {
    itemId: "mock-eb-001",
    title: "Pokemon Card Ultra Rare NM Pack Fresh",
    priceCents: 2499,
    url: "https://www.ebay.com/itm/mock-001",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    imageUrls: ["https://via.placeholder.com/800x1120?text=Card+Front"],
    sellerName: "pokecards_seller",
    condition: "Near Mint",
  },
  {
    itemId: "mock-eb-002",
    title: "Pokemon Card Ultra Rare LP",
    priceCents: 2899,
    url: "https://www.ebay.com/itm/mock-002",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    imageUrls: ["https://via.placeholder.com/800x1120?text=Card+Front"],
    sellerName: "card_central",
    condition: "Lightly Played",
  },
];

function toHighRes(url: string): string {
  return url.replace(/s-l\d+(\.\w+)$/, "s-l1600$1");
}

function parsePriceCents(text: string | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : Math.round(parsed * 100);
}

/**
 * Get an OAuth application token from eBay using client credentials grant.
 * This uses the App ID (Client ID) and Cert ID (Client Secret).
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

  if (!response.ok) {
    console.warn(`eBay OAuth failed: ${response.status}`);
    return null;
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export interface EbaySearchOptions {
  /** When true, do not add `-bundle` (needed for sealed booster bundle / ETB-ish queries). */
  allowBundleKeyword?: boolean;
}

/**
 * Search eBay via the official Browse API (works reliably from cloud servers).
 */
async function searchViaApi(
  query: string,
  opts?: EbaySearchOptions
): Promise<EbayListing[]> {
  const token = await getEbayOAuthToken();
  if (!token) return [];

  const bundleNeg = opts?.allowBundleKeyword ? "" : " -bundle";
  // Exclude digital codes, lots, and accessories from results
  const refinedQuery = `${query} -code -online -digital -lot${bundleNeg} -custom -proxy -repack`;

  const params = new URLSearchParams({
    q: refinedQuery,
    category_ids: "183454",
    filter: "buyingOptions:{FIXED_PRICE},price:[1..],deliveryCountry:US",
    sort: "newlyListed",
    limit: "40",
  });

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    console.warn(`eBay Browse API failed: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const items = data.itemSummaries ?? [];

  const JUNK_PATTERNS = /\b(code|online code|digital|tcg live|ptcgo|lot of|bulk|custom|proxy|repack|sleeve|binder|toploader|supplies)\b/i;

  return items
    .filter(
      (item: {
        title: string;
        price: { value: string };
        seller?: { username: string; feedbackScore?: number };
      }) => {
        if (JUNK_PATTERNS.test(item.title)) return false;
        const price = parseFloat(item.price?.value ?? "0");
        if (price < 0.50) return false;
        const fb = item.seller?.feedbackScore ?? 0;
        if (fb <= 0) return false;
        return true;
      }
    )
    .slice(0, 20)
    .map(
      (item: {
        itemId: string;
        title: string;
        price: { value: string; currency: string };
        itemWebUrl: string;
        image?: { imageUrl: string };
        thumbnailImages?: { imageUrl: string }[];
        seller?: { username: string; feedbackScore?: number };
        condition?: string;
        conditionId?: string;
      }): EbayListing => {
        const priceDollars = parseFloat(item.price?.value ?? "0");
        const imageUrl = item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? "";
        return {
          itemId: item.itemId,
          title: item.title,
          priceCents: Math.round(priceDollars * 100),
          url: item.itemWebUrl,
          imageUrl,
          imageUrls: [imageUrl],
          sellerName: item.seller?.username ?? "unknown",
          condition: item.condition ?? "Not Specified",
          sellerFeedbackScore: item.seller?.feedbackScore ?? 0,
        };
      }
    );
}

/**
 * Search eBay via HTML scraping (fallback when API keys not configured).
 */
async function searchViaScrape(
  query: string
): Promise<EbayListing[]> {
  const searchUrl =
    `https://www.ebay.com/sch/i.html?` +
    new URLSearchParams({
      _nkw: query,
      _sacat: "183454",
      LH_BIN: "1",
      _sop: "15",
      _ipg: "60",
    }).toString();

  const response = await fetch(searchUrl, { headers: SCRAPE_HEADERS });
  if (!response.ok) {
    throw new Error(`eBay search scrape failed: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const listings: EbayListing[] = [];

  $(".s-item").each((_, el) => {
    if (listings.length >= 20) return false;

    const $item = $(el);
    const title = $item.find(".s-item__title span, .s-item__title").first().text().trim();
    if (!title || title === "Shop on eBay") return;

    const priceText = $item.find(".s-item__price").first().text();
    const priceCents = parsePriceCents(priceText);
    if (!priceCents || priceCents <= 0) return;

    const link = $item.find("a.s-item__link").attr("href") ?? "";
    const thumbUrl =
      $item.find(".s-item__image-wrapper img").attr("src") ??
      $item.find("img").first().attr("src") ??
      "";

    const hiresUrl = toHighRes(thumbUrl);
    const conditionText = $item.find(".SECONDARY_INFO").text().trim();
    const sellerInfo = $item.find(".s-item__seller-info-text, .s-item__seller-info").text().trim();
    const parsedFb = parseScrapedSellerFeedbackCount(sellerInfo);

    const idMatch = link.match(/\/itm\/(\d+)/);
    const itemId = idMatch?.[1] ?? `eb-${Date.now()}-${listings.length}`;

    if (parsedFb === 0) return;

    listings.push({
      itemId,
      title,
      priceCents,
      url: link.split("?")[0],
      imageUrl: hiresUrl,
      imageUrls: [hiresUrl],
      sellerName: sellerInfo || "unknown",
      condition: conditionText || "Not Specified",
      sellerFeedbackScore: parsedFb ?? undefined,
    });
  });

  return listings;
}

/**
 * Search eBay for active Buy It Now listings.
 * Uses the official Browse API when credentials are available,
 * falls back to HTML scraping otherwise.
 */
export async function searchEbayListings(
  cardName: string,
  cardSet?: string,
  listingQualifier?: string,
  options?: EbaySearchOptions
): Promise<EbayListing[]> {
  if (USE_MOCK) {
    return mockListings.map((l) => ({
      ...l,
      title: `${cardName} ${cardSet ?? ""} ${listingQualifier ?? ""} ${l.condition}`.trim(),
      sellerFeedbackScore: 250,
    }));
  }

  const query = [cardName, cardSet, listingQualifier]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  // Prefer the official API (works from cloud servers)
  if (EBAY_APP_ID) {
    try {
      const results = await searchViaApi(query, options);
      if (results.length > 0) return results;
    } catch (err) {
      console.warn("eBay API search failed, trying scrape:", err);
    }
  }

  // Fallback to scraping (works locally, may fail from cloud IPs)
  return searchViaScrape(query);
}
