const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export interface FbMarketplaceListing {
  listingId: string;
  title: string;
  priceCents: number;
  url: string;
  imageUrl: string;
  sellerName: string;
  location: string;
}

const mockListings: FbMarketplaceListing[] = [
  {
    listingId: "fb-mock-001",
    title: "Pokemon Card Ultra Rare - Great Deal!",
    priceCents: 2200,
    url: "https://www.facebook.com/marketplace/item/mock-001",
    imageUrl: "https://via.placeholder.com/200x280?text=FB+Card",
    sellerName: "John D.",
    location: "Atlanta, GA",
  },
  {
    listingId: "fb-mock-002",
    title: "Pokemon Card NM Selling Cheap",
    priceCents: 1899,
    url: "https://www.facebook.com/marketplace/item/mock-002",
    imageUrl: "https://via.placeholder.com/200x280?text=FB+Card",
    sellerName: "Sarah M.",
    location: "Chicago, IL",
  },
  {
    listingId: "fb-mock-003",
    title: "Pokemon Card Collection - Individual Cards Available",
    priceCents: 3100,
    url: "https://www.facebook.com/marketplace/item/mock-003",
    imageUrl: "https://via.placeholder.com/200x280?text=FB+Card",
    sellerName: "Mike T.",
    location: "Los Angeles, CA",
  },
];

/**
 * Search Facebook Marketplace for Pokemon card listings.
 *
 * IMPORTANT: Facebook Marketplace has no public API. In production this
 * requires a headless browser (Puppeteer/Playwright) running on a server
 * with a logged-in Facebook session. The implementation below uses their
 * public search URL which returns limited results without authentication.
 *
 * For a production deployment you would:
 * 1. Run a Playwright instance with a persistent browser context
 * 2. Authenticate with a Facebook account
 * 3. Navigate to marketplace search and parse the results
 * 4. Handle CAPTCHAs and rate limiting
 *
 * The scraping approach below works for public/unauthenticated results
 * but yields fewer listings than an authenticated session.
 */
export async function searchFacebookMarketplace(
  cardName: string,
  cardSet?: string
): Promise<FbMarketplaceListing[]> {
  if (USE_MOCK) {
    return mockListings.map((l) => ({
      ...l,
      title: `${cardName} ${cardSet ?? ""} - ${l.title}`.trim(),
    }));
  }

  // Facebook Marketplace search via their public GraphQL-backed search page.
  // This fetches the HTML and attempts to parse listing data from the
  // embedded JSON data blobs that FB inlines into the page.
  const query = cardSet ? `${cardName} ${cardSet}` : cardName;
  const searchUrl = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}&category=pokemon-cards`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.warn(`Facebook Marketplace returned ${response.status}, using empty results`);
      return [];
    }

    const html = await response.text();
    return parseFacebookListings(html, query);
  } catch (error) {
    console.warn("Facebook Marketplace scrape failed:", error);
    return [];
  }
}

/**
 * Parse Facebook Marketplace listings from page HTML.
 * FB embeds listing data as JSON in script tags and data attributes.
 */
function parseFacebookListings(
  html: string,
  query: string
): FbMarketplaceListing[] {
  const listings: FbMarketplaceListing[] = [];

  // FB often embeds structured data in the page as JSON blobs
  // Look for marketplace listing data patterns
  const pricePattern =
    /\{"__typename":"MarketplaceListing".*?"listing_price":\{"amount":"(\d+(?:\.\d+)?)"/g;
  const matches = html.matchAll(pricePattern);

  for (const match of matches) {
    if (listings.length >= 10) break;

    const priceDollars = parseFloat(match[1]);
    const priceCents = Math.round(priceDollars * 100);

    // Extract listing ID from surrounding context
    const contextStart = Math.max(0, match.index! - 200);
    const context = html.slice(contextStart, match.index! + match[0].length + 500);

    const idMatch = context.match(/"listing_id":"(\d+)"/);
    const titleMatch = context.match(/"marketplace_listing_title":"([^"]+)"/);
    const imageMatch = context.match(/"uri":"(https:\/\/[^"]*(?:jpg|jpeg|png|webp)[^"]*)"/);
    const locationMatch = context.match(/"location_text":"([^"]+)"/);

    const listingId = idMatch?.[1] ?? `fb-${Date.now()}-${listings.length}`;

    listings.push({
      listingId,
      title: titleMatch?.[1] ?? `${query} - Facebook Listing`,
      priceCents,
      url: `https://www.facebook.com/marketplace/item/${listingId}`,
      imageUrl: imageMatch?.[1] ?? "",
      sellerName: "Facebook Seller",
      location: locationMatch?.[1] ?? "Unknown",
    });
  }

  return listings;
}
