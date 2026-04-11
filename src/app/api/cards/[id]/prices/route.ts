import { NextResponse } from "next/server";
import { getCardById } from "@/lib/apis/pokemon-tcg";
import { getEbaySoldAverage } from "@/lib/apis/ebay-sold";
import { getPriceChartingPrices } from "@/lib/apis/pricecharting";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [card, ebaySold, priceCharting] = await Promise.allSettled([
      getCardById(id),
      getEbaySoldAverage(id),
      getPriceChartingPrices(id),
    ]);

    const tcgplayerPriceCents =
      card.status === "fulfilled" ? card.value?.tcgplayerPriceCents ?? null : null;

    const ebaySoldAvgCents =
      ebaySold.status === "fulfilled" ? ebaySold.value.averagePriceCents : null;

    const rawPriceCents =
      priceCharting.status === "fulfilled"
        ? priceCharting.value.rawPriceCents
        : null;

    const gradedPriceCents =
      priceCharting.status === "fulfilled"
        ? priceCharting.value.gradedPriceCents
        : null;

    return NextResponse.json({
      cardId: id,
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
