-- ============================================================
-- PokeDeal: Extend deals table for production UI
-- ============================================================

-- Denormalized card metadata for single-query feed rendering
alter table deals add column if not exists listing_source text not null default 'ebay';
alter table deals add column if not exists product_type text not null default 'raw';
alter table deals add column if not exists card_name text;
alter table deals add column if not exists card_set text;
alter table deals add column if not exists card_series text;
alter table deals add column if not exists card_number text;
alter table deals add column if not exists rarity text;
alter table deals add column if not exists pokemon_tcg_id text;
alter table deals add column if not exists image_url text;

-- Individual price source snapshots at time of deal detection
alter table deals add column if not exists prices_tcgplayer integer;
alter table deals add column if not exists prices_pricecharting_raw integer;
alter table deals add column if not exists prices_pricecharting_graded integer;
alter table deals add column if not exists prices_ebay_sold_avg integer;

-- PSA graded price tiers
alter table deals add column if not exists psa_price_10 integer;
alter table deals add column if not exists psa_price_9 integer;
alter table deals add column if not exists psa_price_8 integer;

-- AI-predicted PSA grade
alter table deals add column if not exists predicted_grade numeric(3,1);
alter table deals add column if not exists predicted_grade_centering_lr text;
alter table deals add column if not exists predicted_grade_centering_tb text;
alter table deals add column if not exists predicted_grade_confidence text;
alter table deals add column if not exists predicted_grade_source text;

-- Index for product type filtering
create index if not exists idx_deals_product_type on deals(product_type);
create index if not exists idx_deals_listing_source on deals(listing_source);
create index if not exists idx_deals_card_name on deals(card_name);
