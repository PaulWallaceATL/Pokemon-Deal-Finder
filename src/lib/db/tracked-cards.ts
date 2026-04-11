import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type TrackedCardInsert = Database["public"]["Tables"]["tracked_cards"]["Insert"];
type TrackedCardRow = Database["public"]["Tables"]["tracked_cards"]["Row"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

export async function getTrackedCards(
  supabase: SupabaseClient<Database>
): Promise<TrackedCardRow[]> {
  const { data, error } = await supabase
    .from("tracked_cards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllTrackedCards(
  supabase: SupabaseClient<Database>
): Promise<TrackedCardRow[]> {
  const { data, error } = await supabase.from("tracked_cards").select("*");
  if (error) throw error;
  return data;
}

export async function addTrackedCard(
  supabase: SupabaseClient<Database>,
  card: TrackedCardInsert
): Promise<TrackedCardRow> {
  const client = supabase as AnySupabase;
  const { data, error } = await client
    .from("tracked_cards")
    .insert(card)
    .select()
    .single();

  if (error) throw error;
  return data as TrackedCardRow;
}

export async function removeTrackedCard(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const client = supabase as AnySupabase;
  const { error } = await client.from("tracked_cards").delete().eq("id", id);
  if (error) throw error;
}
