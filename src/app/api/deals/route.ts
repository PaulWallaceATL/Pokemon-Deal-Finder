import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDeals } from "@/lib/db/deals";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sort") as
      | "discount_pct"
      | "ebay_price_cents"
      | "found_at"
      | null;

    const deals = await getDeals(supabase, {
      activeOnly: true,
      sortBy: sortBy ?? "discount_pct",
      sortDir: "desc",
      limit: 50,
    });

    return NextResponse.json({ deals });
  } catch (error) {
    console.error("Deals fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}
