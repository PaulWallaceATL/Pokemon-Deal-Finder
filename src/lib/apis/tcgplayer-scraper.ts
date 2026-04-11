import * as cheerio from "cheerio";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export interface TcgplayerPrice {
  marketPriceCents: number | null;
  lowPriceCents: number | null;
  midPriceCents: number | null;
  highPriceCents: number | null;
  productUrl: string;
}

const SCRAPE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function parseDollarsToCents(text: string | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : Math.round(parsed * 100);
}

/**
 * Scrape TCGPlayer search results to find a card's product page,
 * then scrape the product page for market pricing.
 */
export async function scrapeTcgplayerPrice(
  cardName: string,
  cardSet?: string
): Promise<TcgplayerPrice> {
  if (USE_MOCK) {
    return {
      marketPriceCents: 3799,
      lowPriceCents: 3200,
      midPriceCents: 3799,
      highPriceCents: 4500,
      productUrl: "https://www.tcgplayer.com/product/mock",
    };
  }

  const query = cardSet ? `${cardName} ${cardSet}` : cardName;
  const searchUrl = `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(query)}&view=grid`;

  const searchRes = await fetch(searchUrl, { headers: SCRAPE_HEADERS });
  if (!searchRes.ok) {
    throw new Error(`TCGPlayer search failed: ${searchRes.status}`);
  }

  const searchHtml = await searchRes.text();
  const $search = cheerio.load(searchHtml);

  // Find the first product link from search results
  const productLink =
    $search('a[href*="/product/"]').first().attr("href") ??
    $search(".search-result a").first().attr("href");

  if (!productLink) {
    return {
      marketPriceCents: null,
      lowPriceCents: null,
      midPriceCents: null,
      highPriceCents: null,
      productUrl: searchUrl,
    };
  }

  const productUrl = productLink.startsWith("http")
    ? productLink
    : `https://www.tcgplayer.com${productLink}`;

  const productRes = await fetch(productUrl, { headers: SCRAPE_HEADERS });
  if (!productRes.ok) {
    throw new Error(`TCGPlayer product page failed: ${productRes.status}`);
  }

  const productHtml = await productRes.text();
  const $ = cheerio.load(productHtml);

  // TCGPlayer embeds pricing in structured elements or JSON-LD
  let marketPriceCents: number | null = null;
  let lowPriceCents: number | null = null;
  let midPriceCents: number | null = null;
  let highPriceCents: number | null = null;

  // Try JSON-LD structured data first
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      if (json["@type"] === "Product" && json.offers) {
        const price = json.offers.lowPrice ?? json.offers.price;
        if (price) lowPriceCents = Math.round(parseFloat(price) * 100);
        if (json.offers.highPrice) {
          highPriceCents = Math.round(parseFloat(json.offers.highPrice) * 100);
        }
      }
    } catch {
      // ignore parse errors
    }
  });

  // Scrape the visible price table/section
  $(".price-point__data, .market-price, [class*='marketPrice']").each(
    (_, el) => {
      const text = $(el).text();
      const cents = parseDollarsToCents(text);
      if (cents && !marketPriceCents) marketPriceCents = cents;
    }
  );

  // Fall back to any prominent dollar amount on the page
  if (!marketPriceCents) {
    const priceMatch = productHtml.match(/\$(\d+\.\d{2})/);
    if (priceMatch) {
      marketPriceCents = Math.round(parseFloat(priceMatch[1]) * 100);
    }
  }

  midPriceCents = marketPriceCents;

  return {
    marketPriceCents,
    lowPriceCents,
    midPriceCents,
    highPriceCents,
    productUrl,
  };
}
