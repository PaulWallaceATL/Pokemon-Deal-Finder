-- ============================================================
-- PokeDeal: Initial Schema
-- ============================================================

-- tracked_cards: cards the user wants to monitor for deals
create table tracked_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  card_name text not null,
  card_set text,
  pokemon_tcg_id text,
  image_url text,
  created_at timestamptz default now()
);

-- market_prices: point-in-time price snapshots from various sources
create table market_prices (
  id uuid default gen_random_uuid() primary key,
  tracked_card_id uuid references tracked_cards(id) on delete cascade not null,
  source text not null check (source in ('tcgplayer', 'pricecharting_raw', 'pricecharting_graded', 'ebay_sold_avg')),
  price_cents integer not null check (price_cents >= 0),
  fetched_at timestamptz default now()
);

-- deals: underpriced eBay listings detected by the scan engine
create table deals (
  id uuid default gen_random_uuid() primary key,
  tracked_card_id uuid references tracked_cards(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  ebay_item_id text not null unique,
  ebay_title text,
  ebay_price_cents integer not null check (ebay_price_cents >= 0),
  ebay_url text not null,
  ebay_image_url text,
  seller_name text,
  condition text,
  blended_market_price_cents integer not null check (blended_market_price_cents >= 0),
  discount_pct numeric(5,2) not null,
  found_at timestamptz default now(),
  is_active boolean default true
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table tracked_cards enable row level security;
alter table deals enable row level security;
alter table market_prices enable row level security;

-- Users can fully manage their own tracked cards
create policy "Users manage own tracked cards"
  on tracked_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can view their own deals
create policy "Users see own deals"
  on deals for select
  using (auth.uid() = user_id);

-- Service role (cron) can insert/update deals for any user
create policy "Service role manages deals"
  on deals for insert
  with check (true);

create policy "Service role updates deals"
  on deals for update
  using (true)
  with check (true);

-- Users can view prices for their own tracked cards
create policy "Users see prices for own tracked cards"
  on market_prices for select
  using (
    tracked_card_id in (
      select id from tracked_cards where user_id = auth.uid()
    )
  );

-- Service role can insert price snapshots
create policy "Service role inserts prices"
  on market_prices for insert
  with check (true);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

create index idx_tracked_cards_user on tracked_cards(user_id);
create index idx_deals_user_active on deals(user_id, is_active);
create index idx_deals_discount on deals(discount_pct desc);
create index idx_deals_ebay_item on deals(ebay_item_id);
create index idx_market_prices_card on market_prices(tracked_card_id, fetched_at desc);
