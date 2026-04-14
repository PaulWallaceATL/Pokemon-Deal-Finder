import * as cheerio from "cheerio";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export interface PriceChartingScrapedResult {
  rawPriceCents: number | null;
  gradedPriceCents: number | null;
  productName: string;
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
 * Scrape PriceCharting to get raw and graded prices for a Pokémon card.
 * Falls back to API if PRICECHARTING_API_KEY is set.
 */
export async function scrapePriceChartingPrices(
  cardName: string,
  cardSet?: string,
  extraSearchTerms?: string
): Promise<PriceChartingScrapedResult> {
  const query = [cardName, cardSet, extraSearchTerms]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (USE_MOCK) {
    return {
      rawPriceCents: 3900,
      gradedPriceCents: 8500,
      productName: query || cardName,
      productUrl: "https://www.pricecharting.com/game/mock",
    };
  }

  // If API key is available, prefer it over scraping
  const apiKey = process.env.PRICECHARTING_API_KEY;
  if (apiKey) {
    return fetchFromApi(cardName, cardSet, apiKey, extraSearchTerms);
  }

  return scrapeFromWeb(cardName, cardSet, extraSearchTerms);
}

async function fetchFromApi(
  cardName: string,
  cardSet: string | undefined,
  apiKey: string,
  extraSearchTerms?: string
): Promise<PriceChartingScrapedResult> {
  const query = [cardName, cardSet, extraSearchTerms]
    .filter(Boolean)
    .join(" ")
    .trim();
  const url = new URL("https://www.pricecharting.com/api/product");
  url.searchParams.set("t", apiKey);
  url.searchParams.set("q", query);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`PriceCharting API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    rawPriceCents: data["loose-price"] != null ? Math.round(data["loose-price"]) : null,
    gradedPriceCents: data["graded-price"] != null ? Math.round(data["graded-price"]) : null,
    productName: data["product-name"] ?? query,
    productUrl: `https://www.pricecharting.com/game/pokemon/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, "-"))}`,
  };
}

async function scrapeFromWeb(
  cardName: string,
  cardSet: string | undefined,
  extraSearchTerms?: string
): Promise<PriceChartingScrapedResult> {
  const query = [cardName, cardSet, extraSearchTerms]
    .filter(Boolean)
    .join(" ")
    .trim();

  // Search for the product
  const searchUrl = `https://www.pricecharting.com/search-products?q=${encodeURIComponent(query)}&type=prices`;
  const searchRes = await fetch(searchUrl, {
    headers: SCRAPE_HEADERS,
    redirect: "follow",
  });

  if (!searchRes.ok) {
    throw new Error(`PriceCharting search failed: ${searchRes.status}`);
  }

  const finalUrl = searchRes.url;
  const html = await searchRes.text();
  const $ = cheerio.load(html);

  // If we were redirected directly to a product page
  const isProductPage =
    finalUrl.includes("/game/") || $(".product_name").length > 0;

  let productUrl = finalUrl;
  let productHtml = html;

  if (!isProductPage) {
    // Pick the first search result link
    const firstResult =
      $('a[href*="/game/pokemon"]').first().attr("href") ??
      $(".offer a, .search-results a").first().attr("href");

    if (!firstResult) {
      return {
        rawPriceCents: null,
        gradedPriceCents: null,
        productName: query,
        productUrl: searchUrl,
      };
    }

    productUrl = firstResult.startsWith("http")
      ? firstResult
      : `https://www.pricecharting.com${firstResult}`;

    const productRes = await fetch(productUrl, { headers: SCRAPE_HEADERS });
    if (!productRes.ok) {
      throw new Error(`PriceCharting product page failed: ${productRes.status}`);
    }
    productHtml = await productRes.text();
  }

  const $p = cheerio.load(productHtml);

  const productName = $p(".product_name, h1").first().text().trim() || query;

  // PriceCharting shows prices in a table with ids like #used_price, #complete_price, #graded_price
  const rawPriceCents =
    parseDollarsToCents($p("#used_price .price, #complete_price .price").first().text()) ??
    parseDollarsToCents($p("td:contains('Ungraded')").next("td").text());

  const gradedPriceCents =
    parseDollarsToCents($p("#graded_price .price").first().text()) ??
    parseDollarsToCents($p("td:contains('Grade')").next("td").text());

  return {
    rawPriceCents,
    gradedPriceCents,
    productName,
    productUrl,
  };
}
