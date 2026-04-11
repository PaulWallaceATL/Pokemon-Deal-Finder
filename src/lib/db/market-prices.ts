import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type MarketPriceInsert = Database["public"]["Tables"]["market_prices"]["Insert"];
type MarketPriceRow = Database["public"]["Tables"]["market_prices"]["Row"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

export async function insertPriceSnapshot(
  supabase: SupabaseClient<Database>,
  snapshot: MarketPriceInsert
): Promise<MarketPriceRow> {
  const client = supabase as AnySupabase;
  const { data, error } = await client
    .from("market_prices")
    .insert(snapshot)
    .select()
    .single();

  if (error) throw error;
  return data as MarketPriceRow;
}

export async function insertPriceSnapshots(
  supabase: SupabaseClient<Database>,
  snapshots: MarketPriceInsert[]
): Promise<void> {
  if (snapshots.length === 0) return;
  const client = supabase as AnySupabase;
  const { error } = await client.from("market_prices").insert(snapshots);
  if (error) throw error;
}

export async function getLatestPrices(
  supabase: SupabaseClient<Database>,
  trackedCardId: string
): Promise<MarketPriceRow[]> {
  const { data, error } = await supabase
    .from("market_prices")
    .select("*")
    .eq("tracked_card_id", trackedCardId)
    .order("fetched_at", { ascending: false })
    .limit(4);

  if (error) throw error;
  return data;
}

export async function getPriceHistory(
  supabase: SupabaseClient<Database>,
  trackedCardId: string,
  days: number = 30
): Promise<MarketPriceRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("market_prices")
    .select("*")
    .eq("tracked_card_id", trackedCardId)
    .gte("fetched_at", since.toISOString())
    .order("fetched_at", { ascending: true });

  if (error) throw error;
  return data;
}
