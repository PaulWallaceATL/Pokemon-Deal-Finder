import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchEbayListings } from "@/lib/apis/ebay-browse";
import { searchFacebookMarketplace } from "@/lib/apis/facebook-marketplace";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Look up the tracked card to get name/set for searching
    const { data: card } = await supabase
      .from("tracked_cards")
      .select("card_name, card_set")
      .eq("id", id)
      .single() as { data: { card_name: string; card_set: string | null } | null };

    let cardName: string;
    let cardSet: string | undefined;

    if (card) {
      cardName = card.card_name;
      cardSet = card.card_set ?? undefined;
    } else {
      const { data: deal } = await supabase
        .from("deals")
        .select("card_name, card_set")
        .eq("id", id)
        .single() as { data: { card_name: string | null; card_set: string | null } | null };

      if (!deal?.card_name) {
        return NextResponse.json(
          { error: "Card not found" },
          { status: 404 }
        );
      }
      cardName = deal.card_name;
      cardSet = deal.card_set ?? undefined;
    }

    const [ebayResult, fbResult] = await Promise.allSettled([
      searchEbayListings(cardName, cardSet),
      searchFacebookMarketplace(cardName, cardSet),
    ]);

    const listings = [];

    if (ebayResult.status === "fulfilled") {
      for (const l of ebayResult.value) {
        listings.push({
          id: l.itemId,
          title: l.title,
          priceCents: l.priceCents,
          url: l.url,
          imageUrl: l.imageUrl,
          sellerName: l.sellerName,
          condition: l.condition,
          source: "ebay" as const,
        });
      }
    }

    if (fbResult.status === "fulfilled") {
      for (const l of fbResult.value) {
        listings.push({
          id: `fb-${l.listingId}`,
          title: l.title,
          priceCents: l.priceCents,
          url: l.url,
          imageUrl: l.imageUrl,
          sellerName: `${l.sellerName} (${l.location})`,
          condition: "Not Specified",
          source: "facebook" as const,
        });
      }
    }

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("Listings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
