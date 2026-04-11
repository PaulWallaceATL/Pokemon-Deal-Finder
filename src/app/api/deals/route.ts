import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const productType = searchParams.get("productType") ?? "all";
  const cardSet = searchParams.get("set") ?? "all";
  const minDiscount = searchParams.get("minDiscount") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "discount_pct";
  const sortDir = searchParams.get("sortDir") ?? "desc";
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  let query = supabase.from("deals").select("*");

  // Scope to user's deals if authenticated, otherwise show all active
  if (user) {
    query = query.eq("user_id", user.id);
  }

  query = query.eq("is_active", true);

  if (search) {
    query = query.or(
      `card_name.ilike.%${search}%,card_set.ilike.%${search}%,ebay_title.ilike.%${search}%`
    );
  }

  if (productType !== "all") {
    if (productType === "sealed") {
      query = query.in("product_type", [
        "etb",
        "tin",
        "blister",
        "upc",
        "booster-bundle",
        "booster-box",
        "booster-pack",
        "case",
      ]);
    } else {
      query = query.eq("product_type", productType);
    }
  }

  if (cardSet !== "all") {
    query = query.ilike("card_set", `%${cardSet}%`);
  }

  if (minDiscount) {
    const val = parseFloat(minDiscount);
    if (!isNaN(val)) query = query.gte("discount_pct", val);
  }

  if (minPrice) {
    const val = parseFloat(minPrice) * 100;
    if (!isNaN(val)) query = query.gte("ebay_price_cents", val);
  }

  if (maxPrice) {
    const val = parseFloat(maxPrice) * 100;
    if (!isNaN(val)) query = query.lte("ebay_price_cents", val);
  }

  const validSorts = [
    "discount_pct",
    "ebay_price_cents",
    "found_at",
    "card_name",
  ];
  const col = validSorts.includes(sortBy) ? sortBy : "discount_pct";
  query = query.order(col, { ascending: sortDir === "asc" }).limit(limit);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deals: data ?? [] });
}
