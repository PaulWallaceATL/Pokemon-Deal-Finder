import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAllTrackedCards } from "@/lib/db/tracked-cards";
import { scanAllCards } from "@/lib/engine/deal-detector";

export const maxDuration = 300; // 5 minutes for Vercel Pro plans

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const supabase = createServiceClient();
    const cards = await getAllTrackedCards(supabase);

    if (cards.length === 0) {
      return NextResponse.json({
        message: "No tracked cards to scan",
        duration_ms: Date.now() - startTime,
      });
    }

    const results = await scanAllCards(supabase, cards);

    const totalDeals = results.reduce((sum, r) => sum + r.dealsFound, 0);
    const totalPrices = results.reduce((sum, r) => sum + r.pricesUpdated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return NextResponse.json({
      message: "Scan complete",
      cardsScanned: cards.length,
      totalDealsFound: totalDeals,
      totalPricesUpdated: totalPrices,
      totalErrors,
      results,
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Cron scan error:", error);
    return NextResponse.json(
      {
        error: "Scan failed",
        details: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
