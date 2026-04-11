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

const mockSoldItems: EbaySoldItem[] = [
  { title: "Card Sold NM", priceCents: 3800, soldDate: "2026-04-08" },
  { title: "Card Sold LP", priceCents: 3600, soldDate: "2026-04-06" },
  { title: "Card Sold NM/M", priceCents: 4000, soldDate: "2026-04-04" },
  { title: "Card Sold NM", priceCents: 3900, soldDate: "2026-04-02" },
  { title: "Card Sold LP", priceCents: 3700, soldDate: "2026-03-30" },
];

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

  // eBay Finding API (findCompletedItems) via REST
  const appId = process.env.EBAY_APP_ID;
  if (!appId) throw new Error("EBAY_APP_ID must be set");

  const keywords = cardSet ? `${cardName} ${cardSet}` : cardName;

  const url = new URL(
    "https://svcs.ebay.com/services/search/FindingService/v1"
  );
  url.searchParams.set("OPERATION-NAME", "findCompletedItems");
  url.searchParams.set("SERVICE-VERSION", "1.13.0");
  url.searchParams.set("SECURITY-APPNAME", appId);
  url.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
  url.searchParams.set("REST-PAYLOAD", "");
  url.searchParams.set("keywords", keywords);
  url.searchParams.set("categoryId", "183454");
  url.searchParams.set(
    "itemFilter(0).name",
    "SoldItemsOnly"
  );
  url.searchParams.set("itemFilter(0).value", "true");
  url.searchParams.set("sortOrder", "EndTimeSoonest");
  url.searchParams.set("paginationInput.entriesPerPage", "5");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`eBay Finding API error: ${response.status}`);
  }

  const data = await response.json();
  const searchResult =
    data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];

  const items: EbaySoldItem[] = searchResult.map(
    (item: {
      title: string[];
      sellingStatus: { currentPrice: { __value__: string }[] }[];
      listingInfo: { endTime: string[] }[];
    }) => ({
      title: item.title[0],
      priceCents: Math.round(
        parseFloat(item.sellingStatus[0].currentPrice[0].__value__) * 100
      ),
      soldDate: item.listingInfo[0].endTime[0],
    })
  );

  const averagePriceCents =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.priceCents, 0) / items.length)
      : 0;

  return { items, averagePriceCents };
}
