export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tracked_cards: {
        Row: {
          id: string;
          user_id: string;
          card_name: string;
          card_set: string | null;
          pokemon_tcg_id: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_name: string;
          card_set?: string | null;
          pokemon_tcg_id?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_name?: string;
          card_set?: string | null;
          pokemon_tcg_id?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
      };
      market_prices: {
        Row: {
          id: string;
          tracked_card_id: string;
          source: "tcgplayer" | "pricecharting_raw" | "pricecharting_graded" | "ebay_sold_avg";
          price_cents: number;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          tracked_card_id: string;
          source: "tcgplayer" | "pricecharting_raw" | "pricecharting_graded" | "ebay_sold_avg";
          price_cents: number;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          tracked_card_id?: string;
          source?: "tcgplayer" | "pricecharting_raw" | "pricecharting_graded" | "ebay_sold_avg";
          price_cents?: number;
          fetched_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          tracked_card_id: string;
          user_id: string;
          ebay_item_id: string;
          ebay_title: string | null;
          ebay_price_cents: number;
          ebay_url: string;
          ebay_image_url: string | null;
          seller_name: string | null;
          condition: string | null;
          blended_market_price_cents: number;
          discount_pct: number;
          found_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          tracked_card_id: string;
          user_id: string;
          ebay_item_id: string;
          ebay_title?: string | null;
          ebay_price_cents: number;
          ebay_url: string;
          ebay_image_url?: string | null;
          seller_name?: string | null;
          condition?: string | null;
          blended_market_price_cents: number;
          discount_pct: number;
          found_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          tracked_card_id?: string;
          user_id?: string;
          ebay_item_id?: string;
          ebay_title?: string | null;
          ebay_price_cents?: number;
          ebay_url?: string;
          ebay_image_url?: string | null;
          seller_name?: string | null;
          condition?: string | null;
          blended_market_price_cents?: number;
          discount_pct?: number;
          found_at?: string;
          is_active?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
