import { getEbayAccessToken } from "./ebay-auth";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export interface EbayListing {
  itemId: string;
  title: string;
  priceCents: number;
  url: string;
  imageUrl: string;
  sellerName: string;
  condition: string;
}

const mockListings: EbayListing[] = [
  {
    itemId: "mock-eb-001",
    title: "Pokemon Card Ultra Rare NM Pack Fresh",
    priceCents: 2499,
    url: "https://www.ebay.com/itm/mock-001",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    sellerName: "pokecards_seller",
    condition: "Near Mint",
  },
  {
    itemId: "mock-eb-002",
    title: "Pokemon Card Ultra Rare LP",
    priceCents: 2899,
    url: "https://www.ebay.com/itm/mock-002",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    sellerName: "card_central",
    condition: "Lightly Played",
  },
  {
    itemId: "mock-eb-003",
    title: "Pokemon Card Pack Fresh Mint!",
    priceCents: 3499,
    url: "https://www.ebay.com/itm/mock-003",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    sellerName: "mint_pokemon",
    condition: "Mint",
  },
  {
    itemId: "mock-eb-004",
    title: "Pokemon Card Played Condition",
    priceCents: 1999,
    url: "https://www.ebay.com/itm/mock-004",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    sellerName: "budget_tcg",
    condition: "Moderately Played",
  },
  {
    itemId: "mock-eb-005",
    title: "Pokemon Card NM/M",
    priceCents: 3700,
    url: "https://www.ebay.com/itm/mock-005",
    imageUrl: "https://via.placeholder.com/200x280?text=Card",
    sellerName: "top_tier_cards",
    condition: "Near Mint",
  },
];

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

  const token = await getEbayAccessToken();
  const query = cardSet ? `${cardName} ${cardSet}` : cardName;

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?` +
      new URLSearchParams({
        q: query,
        category_ids: "183454", // Pokemon TCG
        limit: "10",
        sort: "price",
        filter: "buyingOptions:{FIXED_PRICE}",
      }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`eBay Browse API error: ${response.status}`);
  }

  const data = await response.json();
  const items = data.itemSummaries ?? [];

  return items.map(
    (item: {
      itemId: string;
      title: string;
      price: { value: string };
      itemWebUrl: string;
      image?: { imageUrl: string };
      seller?: { username: string };
      condition: string;
    }) => ({
      itemId: item.itemId,
      title: item.title,
      priceCents: Math.round(parseFloat(item.price.value) * 100),
      url: item.itemWebUrl,
      imageUrl: item.image?.imageUrl ?? "",
      sellerName: item.seller?.username ?? "unknown",
      condition: item.condition ?? "Not Specified",
    })
  );
}
