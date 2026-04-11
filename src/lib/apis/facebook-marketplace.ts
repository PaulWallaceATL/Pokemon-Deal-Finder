const USE_MOCK = process.env.USE_MOCK_DATA === "true";
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_FB_ACTOR_ID = process.env.APIFY_FB_ACTOR_ID;

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
 * Search Facebook Marketplace for Pokemon card listings via Apify.
 *
 * Uses the Apify actor API to run a Facebook Marketplace scraper.
 * Falls back to empty results if Apify credentials are not configured.
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

  if (!APIFY_API_TOKEN || !APIFY_FB_ACTOR_ID) {
    console.warn(
      "Apify credentials not configured, skipping Facebook Marketplace"
    );
    return [];
  }

  return fetchFromApify(cardName, cardSet);
}

async function fetchFromApify(
  cardName: string,
  cardSet: string | undefined
): Promise<FbMarketplaceListing[]> {
  const query = cardSet ? `${cardName} ${cardSet}` : cardName;

  try {
    // Run the actor synchronously and get dataset items directly
    const url = `https://api.apify.com/v2/acts/${APIFY_FB_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchQuery: query,
        maxItems: 10,
        location: "United States",
        category: "search",
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      console.warn(
        `Apify FB actor returned ${response.status}: ${await response.text()}`
      );
      return [];
    }

    const items: ApifyFbItem[] = await response.json();
    return items
      .filter((item) => item.price != null)
      .slice(0, 10)
      .map(apifyItemToListing);
  } catch (error) {
    console.warn("Facebook Marketplace Apify fetch failed:", error);
    return [];
  }
}

interface ApifyFbItem {
  id?: string;
  title?: string;
  price?: number | string;
  url?: string;
  imageUrl?: string;
  image?: string;
  sellerName?: string;
  seller?: { name?: string };
  location?: string | { city?: string; state?: string };
  address?: string;
}

function apifyItemToListing(item: ApifyFbItem): FbMarketplaceListing {
  const priceNum =
    typeof item.price === "string"
      ? parseFloat(item.price.replace(/[^0-9.]/g, ""))
      : (item.price ?? 0);

  const location =
    typeof item.location === "string"
      ? item.location
      : item.location
        ? `${item.location.city ?? ""}, ${item.location.state ?? ""}`.trim()
        : item.address ?? "Unknown";

  return {
    listingId: item.id ?? `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: item.title ?? "Facebook Listing",
    priceCents: Math.round(priceNum * 100),
    url: item.url ?? `https://www.facebook.com/marketplace/item/${item.id ?? ""}`,
    imageUrl: item.imageUrl ?? item.image ?? "",
    sellerName: item.sellerName ?? item.seller?.name ?? "Facebook Seller",
    location,
  };
}
