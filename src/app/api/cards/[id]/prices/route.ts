import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCardById } from "@/lib/apis/pokemon-tcg";
import { getEbaySoldAverage } from "@/lib/apis/ebay-sold";
import { getPriceChartingPrices } from "@/lib/apis/pricecharting";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Look up card metadata to get name/set for price queries
    let cardName: string | null = null;
    let cardSet: string | undefined;
    let pokemonTcgId: string | null = null;

    type CardLookup = { card_name: string; card_set: string | null; pokemon_tcg_id: string | null } | null;

    const { data: tracked } = await supabase
      .from("tracked_cards")
      .select("card_name, card_set, pokemon_tcg_id")
      .eq("id", id)
      .single() as { data: CardLookup };

    if (tracked) {
      cardName = tracked.card_name;
      cardSet = tracked.card_set ?? undefined;
      pokemonTcgId = tracked.pokemon_tcg_id;
    } else {
      const { data: deal } = await supabase
        .from("deals")
        .select("card_name, card_set, pokemon_tcg_id")
        .eq("id", id)
        .single() as { data: CardLookup };

      if (deal) {
        cardName = deal.card_name;
        cardSet = deal.card_set ?? undefined;
        pokemonTcgId = deal.pokemon_tcg_id;
      }
    }

    // Fallback: treat id as a pokemon_tcg_id directly
    if (!cardName && id.includes("-")) {
      pokemonTcgId = id;
    }

    const [tcgResult, ebaySoldResult, pcResult] = await Promise.allSettled([
      pokemonTcgId ? getCardById(pokemonTcgId) : Promise.resolve(null),
      cardName
        ? getEbaySoldAverage(cardName, cardSet)
        : Promise.resolve({ items: [], averagePriceCents: 0 }),
      cardName
        ? getPriceChartingPrices(cardName, cardSet)
        : Promise.resolve({ rawPriceCents: null, gradedPriceCents: null }),
    ]);

    const tcgplayerPriceCents =
      tcgResult.status === "fulfilled"
        ? tcgResult.value?.tcgplayerPriceCents ?? null
        : null;

    const ebaySoldAvgCents =
      ebaySoldResult.status === "fulfilled"
        ? ebaySoldResult.value.averagePriceCents
        : null;

    const rawPriceCents =
      pcResult.status === "fulfilled"
        ? pcResult.value.rawPriceCents
        : null;

    const gradedPriceCents =
      pcResult.status === "fulfilled"
        ? pcResult.value.gradedPriceCents
        : null;

    return NextResponse.json({
      cardId: id,
      cardName,
      prices: {
        tcgplayer: tcgplayerPriceCents,
        pricechartingRaw: rawPriceCents,
        pricechartingGraded: gradedPriceCents,
        ebaySoldAvg: ebaySoldAvgCents,
      },
    });
  } catch (error) {
    console.error("Price fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
