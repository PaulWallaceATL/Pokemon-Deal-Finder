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
 * Scrape eBay's completed/sold listings page to get recent sold prices.
 * No API key required — uses public search with sold items filter.
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

  // LH_Complete = completed listings, LH_Sold = sold only,
  // _sop = 13 sort by end date newest first
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

    // Sold date is typically in the .s-item__ended-date or .s-item__endedDate element
    const dateText =
      $item.find(".s-item__ended-date, .s-item__endedDate, .POSITIVE").text().trim();
    // Try to parse "Sold Apr 8, 2026" style dates
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
