import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type DealInsert = Database["public"]["Tables"]["deals"]["Insert"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

export interface DealsQueryOptions {
  activeOnly?: boolean;
  sortBy?: "discount_pct" | "ebay_price_cents" | "found_at";
  sortDir?: "asc" | "desc";
  limit?: number;
}

export async function getDeals(
  supabase: SupabaseClient<Database>,
  options: DealsQueryOptions = {}
): Promise<DealRow[]> {
  const {
    activeOnly = true,
    sortBy = "discount_pct",
    sortDir = "desc",
    limit = 50,
  } = options;

  let query = supabase.from("deals").select("*");

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  query = query.order(sortBy, { ascending: sortDir === "asc" }).limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function upsertDeal(
  supabase: SupabaseClient<Database>,
  deal: DealInsert
): Promise<DealRow> {
  const client = supabase as AnySupabase;
  const { data, error } = await client
    .from("deals")
    .upsert([deal], { onConflict: "ebay_item_id" })
    .select()
    .single();

  if (error) throw error;
  return data as DealRow;
}

export async function deactivateStaleDeals(
  supabase: SupabaseClient<Database>,
  trackedCardId: string,
  activeEbayItemIds: string[]
): Promise<void> {
  const client = supabase as AnySupabase;
  const { error } = await client
    .from("deals")
    .update({ is_active: false })
    .eq("tracked_card_id", trackedCardId)
    .eq("is_active", true)
    .not("ebay_item_id", "in", `(${activeEbayItemIds.join(",")})`);

  if (error) throw error;
}
