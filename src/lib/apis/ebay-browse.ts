import * as cheerio from "cheerio";

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
}

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
    imageUrls: ["https://via.placeholder.com/800x1120?text=Card+Front", "https://via.placeholder.com/800x1120?text=Card+Back"],
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
  {
    itemId: "mock-eb-003",
    title: "Pokemon Card Pack Fresh Mint!",
    priceCents: 3499,
    url: "https://www.ebay.com/itm/mock-003",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    imageUrls: ["https://via.placeholder.com/800x1120?text=Card+Front", "https://via.placeholder.com/800x1120?text=Card+Back"],
    sellerName: "mint_pokemon",
    condition: "Mint",
  },
  {
    itemId: "mock-eb-004",
    title: "Pokemon Card Played Condition",
    priceCents: 1999,
    url: "https://www.ebay.com/itm/mock-004",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    imageUrls: ["https://via.placeholder.com/800x1120?text=Card+Front"],
    sellerName: "budget_tcg",
    condition: "Moderately Played",
  },
  {
    itemId: "mock-eb-005",
    title: "Pokemon Card NM/M",
    priceCents: 3700,
    url: "https://www.ebay.com/itm/mock-005",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    imageUrls: ["https://via.placeholder.com/800x1120?text=Card+Front", "https://via.placeholder.com/800x1120?text=Card+Back"],
    sellerName: "top_tier_cards",
    condition: "Near Mint",
  },
];

/**
 * Convert an eBay thumbnail URL to the highest-resolution version.
 * eBay image URLs follow the pattern: i.ebayimg.com/images/g/.../s-l{size}.jpg
 */
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
 * Scrape eBay search results for active Buy It Now listings.
 * Uses eBay's public search page — no API key required.
 */
export async function searchEbayListings(
  cardName: string,
  cardSet?: string
): Promise<EbayListing[]> {
  if (USE_MOCK) {
    return mockListings.map((l) => ({
      ...l,
      title: `${cardName} ${cardSet ?? ""} ${l.condition}`.trim(),
    }));
  }

  const query = cardSet ? `${cardName} ${cardSet}` : cardName;

  // _nkw = keywords, _sacat = category (183454 = Pokemon TCG),
  // LH_BIN = Buy It Now, _sop = sort by price + shipping lowest first
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
    if (listings.length >= 15) return false;

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

    // Upgrade thumbnail to high-res: eBay thumbnails use s-l225 or s-l300,
    // replacing with s-l1600 gets the full-size listing photo
    const hiresUrl = toHighRes(thumbUrl);

    const conditionText = $item.find(".SECONDARY_INFO").text().trim();
    const sellerInfo = $item.find(".s-item__seller-info-text, .s-item__seller-info").text().trim();

    const idMatch = link.match(/\/itm\/(\d+)/);
    const itemId = idMatch?.[1] ?? `eb-${Date.now()}-${listings.length}`;

    listings.push({
      itemId,
      title,
      priceCents,
      url: link.split("?")[0],
      imageUrl: hiresUrl,
      imageUrls: [hiresUrl],
      sellerName: sellerInfo || "unknown",
      condition: conditionText || "Not Specified",
    });
  });

  return listings;
}
