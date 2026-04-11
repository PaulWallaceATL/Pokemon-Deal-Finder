export interface MockDeal {
  id: string;
  cardName: string;
  cardSet: string;
  pokemonTcgId: string;
  imageUrl: string;
  ebayItemId: string;
  ebayTitle: string;
  ebayPriceCents: number;
  ebayUrl: string;
  ebayImageUrl: string;
  sellerName: string;
  condition: string;
  blendedMarketPriceCents: number;
  discountPct: number;
  foundAt: string;
  isActive: boolean;
  prices: {
    tcgplayer: number | null;
    pricechartingRaw: number | null;
    pricechartingGraded: number | null;
    ebaySoldAvg: number | null;
  };
}

export interface MockListing {
  ebayItemId: string;
  title: string;
  priceCents: number;
  url: string;
  imageUrl: string;
  sellerName: string;
  condition: string;
}

export interface MockPriceHistory {
  date: string;
  tcgplayer: number | null;
  pricechartingRaw: number | null;
  ebaySoldAvg: number | null;
}

export const mockDeals: MockDeal[] = [
  {
    id: "deal-1",
    cardName: "Charizard ex",
    cardSet: "Obsidian Flames",
    pokemonTcgId: "sv3-125",
    imageUrl: "https://images.pokemontcg.io/sv3/125_hires.png",
    ebayItemId: "eb-001",
    ebayTitle: "Charizard ex 125/197 Obsidian Flames Ultra Rare NM",
    ebayPriceCents: 2499,
    ebayUrl: "https://www.ebay.com/itm/eb-001",
    ebayImageUrl: "https://images.pokemontcg.io/sv3/125_hires.png",
    sellerName: "pokecards_seller",
    condition: "Near Mint",
    blendedMarketPriceCents: 3850,
    discountPct: 35.1,
    foundAt: "2026-04-10T14:30:00Z",
    isActive: true,
    prices: {
      tcgplayer: 3799,
      pricechartingRaw: 3900,
      pricechartingGraded: 8500,
      ebaySoldAvg: 3850,
    },
  },
  {
    id: "deal-2",
    cardName: "Pikachu VMAX",
    cardSet: "Vivid Voltage",
    pokemonTcgId: "swsh4-44",
    imageUrl: "https://images.pokemontcg.io/swsh4/44_hires.png",
    ebayItemId: "eb-002",
    ebayTitle: "Pikachu VMAX 044/185 Vivid Voltage Rainbow Secret",
    ebayPriceCents: 4200,
    ebayUrl: "https://www.ebay.com/itm/eb-002",
    ebayImageUrl: "https://images.pokemontcg.io/swsh4/44_hires.png",
    sellerName: "tcg_masters",
    condition: "Lightly Played",
    blendedMarketPriceCents: 5800,
    discountPct: 27.6,
    foundAt: "2026-04-10T13:15:00Z",
    isActive: true,
    prices: {
      tcgplayer: 5700,
      pricechartingRaw: 5900,
      pricechartingGraded: 12000,
      ebaySoldAvg: 5800,
    },
  },
  {
    id: "deal-3",
    cardName: "Mewtwo V Alt Art",
    cardSet: "Pokémon GO",
    pokemonTcgId: "pgo-30",
    imageUrl: "https://images.pokemontcg.io/pgo/30_hires.png",
    ebayItemId: "eb-003",
    ebayTitle: "Mewtwo V Alt Art 030/078 Pokemon GO Pack Fresh",
    ebayPriceCents: 1800,
    ebayUrl: "https://www.ebay.com/itm/eb-003",
    ebayImageUrl: "https://images.pokemontcg.io/pgo/30_hires.png",
    sellerName: "card_vault",
    condition: "Near Mint",
    blendedMarketPriceCents: 2400,
    discountPct: 25.0,
    foundAt: "2026-04-10T12:00:00Z",
    isActive: true,
    prices: {
      tcgplayer: 2350,
      pricechartingRaw: 2450,
      pricechartingGraded: 5500,
      ebaySoldAvg: 2400,
    },
  },
  {
    id: "deal-4",
    cardName: "Umbreon VMAX Alt Art",
    cardSet: "Evolving Skies",
    pokemonTcgId: "swsh7-215",
    imageUrl: "https://images.pokemontcg.io/swsh7/215_hires.png",
    ebayItemId: "eb-004",
    ebayTitle: "Umbreon VMAX 215/203 Alt Art Evolving Skies NM/M",
    ebayPriceCents: 18500,
    ebayUrl: "https://www.ebay.com/itm/eb-004",
    ebayImageUrl: "https://images.pokemontcg.io/swsh7/215_hires.png",
    sellerName: "rare_finds",
    condition: "Near Mint",
    blendedMarketPriceCents: 24500,
    discountPct: 24.5,
    foundAt: "2026-04-10T11:45:00Z",
    isActive: true,
    prices: {
      tcgplayer: 24000,
      pricechartingRaw: 25000,
      pricechartingGraded: 65000,
      ebaySoldAvg: 24500,
    },
  },
  {
    id: "deal-5",
    cardName: "Giratina V Alt Art",
    cardSet: "Lost Origin",
    pokemonTcgId: "swsh11-186",
    imageUrl: "https://images.pokemontcg.io/swsh11/186_hires.png",
    ebayItemId: "eb-005",
    ebayTitle: "Giratina V Alt Art 186/196 Lost Origin MINT",
    ebayPriceCents: 3200,
    ebayUrl: "https://www.ebay.com/itm/eb-005",
    ebayImageUrl: "https://images.pokemontcg.io/swsh11/186_hires.png",
    sellerName: "pokemon_pro",
    condition: "Mint",
    blendedMarketPriceCents: 4100,
    discountPct: 22.0,
    foundAt: "2026-04-10T10:30:00Z",
    isActive: true,
    prices: {
      tcgplayer: 4000,
      pricechartingRaw: 4200,
      pricechartingGraded: 9800,
      ebaySoldAvg: 4100,
    },
  },
  {
    id: "deal-6",
    cardName: "Rayquaza VMAX Alt Art",
    cardSet: "Evolving Skies",
    pokemonTcgId: "swsh7-218",
    imageUrl: "https://images.pokemontcg.io/swsh7/218_hires.png",
    ebayItemId: "eb-006",
    ebayTitle: "Rayquaza VMAX Alt Art 218/203 LP",
    ebayPriceCents: 7500,
    ebayUrl: "https://www.ebay.com/itm/eb-006",
    ebayImageUrl: "https://images.pokemontcg.io/swsh7/218_hires.png",
    sellerName: "sky_cards",
    condition: "Lightly Played",
    blendedMarketPriceCents: 9200,
    discountPct: 18.5,
    foundAt: "2026-04-10T09:20:00Z",
    isActive: true,
    prices: {
      tcgplayer: 9000,
      pricechartingRaw: 9400,
      pricechartingGraded: 22000,
      ebaySoldAvg: 9200,
    },
  },
  {
    id: "deal-7",
    cardName: "Mew VMAX Alt Art",
    cardSet: "Fusion Strike",
    pokemonTcgId: "swsh8-268",
    imageUrl: "https://images.pokemontcg.io/swsh8/268_hires.png",
    ebayItemId: "eb-007",
    ebayTitle: "Mew VMAX 268/264 TG30 Alt Art Fusion Strike NM",
    ebayPriceCents: 5500,
    ebayUrl: "https://www.ebay.com/itm/eb-007",
    ebayImageUrl: "https://images.pokemontcg.io/swsh8/268_hires.png",
    sellerName: "mew_lover",
    condition: "Near Mint",
    blendedMarketPriceCents: 6700,
    discountPct: 17.9,
    foundAt: "2026-04-10T08:10:00Z",
    isActive: true,
    prices: {
      tcgplayer: 6500,
      pricechartingRaw: 6900,
      pricechartingGraded: 15000,
      ebaySoldAvg: 6700,
    },
  },
  {
    id: "deal-8",
    cardName: "Moonbreon",
    cardSet: "Surging Sparks",
    pokemonTcgId: "sv8-185",
    imageUrl: "https://images.pokemontcg.io/sv8/185_hires.png",
    ebayItemId: "eb-008",
    ebayTitle: "Umbreon ex SAR 185/191 Surging Sparks Moonbreon NM",
    ebayPriceCents: 14000,
    ebayUrl: "https://www.ebay.com/itm/eb-008",
    ebayImageUrl: "https://images.pokemontcg.io/sv8/185_hires.png",
    sellerName: "dark_collector",
    condition: "Near Mint",
    blendedMarketPriceCents: 17000,
    discountPct: 17.6,
    foundAt: "2026-04-10T07:00:00Z",
    isActive: true,
    prices: {
      tcgplayer: 16500,
      pricechartingRaw: 17500,
      pricechartingGraded: 40000,
      ebaySoldAvg: 17000,
    },
  },
  {
    id: "deal-9",
    cardName: "Lugia V Alt Art",
    cardSet: "Silver Tempest",
    pokemonTcgId: "swsh12-186",
    imageUrl: "https://images.pokemontcg.io/swsh12/186_hires.png",
    ebayItemId: "eb-009",
    ebayTitle: "Lugia V Alt Art Silver Tempest 186/195 LP",
    ebayPriceCents: 5000,
    ebayUrl: "https://www.ebay.com/itm/eb-009",
    ebayImageUrl: "https://images.pokemontcg.io/swsh12/186_hires.png",
    sellerName: "storm_cards",
    condition: "Lightly Played",
    blendedMarketPriceCents: 6000,
    discountPct: 16.7,
    foundAt: "2026-04-10T06:30:00Z",
    isActive: true,
    prices: {
      tcgplayer: 5800,
      pricechartingRaw: 6200,
      pricechartingGraded: 14000,
      ebaySoldAvg: 6000,
    },
  },
  {
    id: "deal-10",
    cardName: "Gengar VMAX Alt Art",
    cardSet: "Fusion Strike",
    pokemonTcgId: "swsh8-271",
    imageUrl: "https://images.pokemontcg.io/swsh8/271_hires.png",
    ebayItemId: "eb-010",
    ebayTitle: "Gengar VMAX Alt Art 271/264 Fusion Strike NM",
    ebayPriceCents: 8800,
    ebayUrl: "https://www.ebay.com/itm/eb-010",
    ebayImageUrl: "https://images.pokemontcg.io/swsh8/271_hires.png",
    sellerName: "ghost_deals",
    condition: "Near Mint",
    blendedMarketPriceCents: 10500,
    discountPct: 16.2,
    foundAt: "2026-04-10T05:15:00Z",
    isActive: true,
    prices: {
      tcgplayer: 10200,
      pricechartingRaw: 10800,
      pricechartingGraded: 25000,
      ebaySoldAvg: 10500,
    },
  },
];

export const mockListings: MockListing[] = [
  {
    ebayItemId: "eb-101",
    title: "Charizard ex 125/197 Obsidian Flames Ultra Rare NM",
    priceCents: 2499,
    url: "https://www.ebay.com/itm/eb-101",
    imageUrl: "https://images.pokemontcg.io/sv3/125_hires.png",
    sellerName: "pokecards_seller",
    condition: "Near Mint",
  },
  {
    ebayItemId: "eb-102",
    title: "Charizard ex 125/197 Obsidian Flames LP",
    priceCents: 2899,
    url: "https://www.ebay.com/itm/eb-102",
    imageUrl: "https://images.pokemontcg.io/sv3/125_hires.png",
    sellerName: "card_central",
    condition: "Lightly Played",
  },
  {
    ebayItemId: "eb-103",
    title: "Charizard ex Obsidian Flames 125/197 Pack Fresh!",
    priceCents: 3499,
    url: "https://www.ebay.com/itm/eb-103",
    imageUrl: "https://images.pokemontcg.io/sv3/125_hires.png",
    sellerName: "mint_pokemon",
    condition: "Mint",
  },
  {
    ebayItemId: "eb-104",
    title: "Charizard ex SV3 125/197 PLAYED",
    priceCents: 1999,
    url: "https://www.ebay.com/itm/eb-104",
    imageUrl: "https://images.pokemontcg.io/sv3/125_hires.png",
    sellerName: "budget_tcg",
    condition: "Moderately Played",
  },
  {
    ebayItemId: "eb-105",
    title: "Charizard ex 125/197 NM/M Obsidian Flames",
    priceCents: 3700,
    url: "https://www.ebay.com/itm/eb-105",
    imageUrl: "https://images.pokemontcg.io/sv3/125_hires.png",
    sellerName: "top_tier_cards",
    condition: "Near Mint",
  },
];

export const mockPriceHistory: MockPriceHistory[] = [
  { date: "2026-03-01", tcgplayer: 4200, pricechartingRaw: 4300, ebaySoldAvg: 4100 },
  { date: "2026-03-08", tcgplayer: 4100, pricechartingRaw: 4200, ebaySoldAvg: 4050 },
  { date: "2026-03-15", tcgplayer: 4000, pricechartingRaw: 4100, ebaySoldAvg: 3950 },
  { date: "2026-03-22", tcgplayer: 3900, pricechartingRaw: 4000, ebaySoldAvg: 3900 },
  { date: "2026-03-29", tcgplayer: 3850, pricechartingRaw: 3950, ebaySoldAvg: 3870 },
  { date: "2026-04-05", tcgplayer: 3800, pricechartingRaw: 3900, ebaySoldAvg: 3850 },
  { date: "2026-04-10", tcgplayer: 3799, pricechartingRaw: 3900, ebaySoldAvg: 3850 },
];

export interface MockTrackedCard {
  id: string;
  cardName: string;
  cardSet: string;
  pokemonTcgId: string;
  imageUrl: string;
  createdAt: string;
  latestPrice: number | null;
}

export const mockTrackedCards: MockTrackedCard[] = [
  {
    id: "tc-1",
    cardName: "Charizard ex",
    cardSet: "Obsidian Flames",
    pokemonTcgId: "sv3-125",
    imageUrl: "https://images.pokemontcg.io/sv3/125_hires.png",
    createdAt: "2026-03-01T00:00:00Z",
    latestPrice: 3850,
  },
  {
    id: "tc-2",
    cardName: "Umbreon VMAX Alt Art",
    cardSet: "Evolving Skies",
    pokemonTcgId: "swsh7-215",
    imageUrl: "https://images.pokemontcg.io/swsh7/215_hires.png",
    createdAt: "2026-03-05T00:00:00Z",
    latestPrice: 24500,
  },
  {
    id: "tc-3",
    cardName: "Pikachu VMAX",
    cardSet: "Vivid Voltage",
    pokemonTcgId: "swsh4-44",
    imageUrl: "https://images.pokemontcg.io/swsh4/44_hires.png",
    createdAt: "2026-03-10T00:00:00Z",
    latestPrice: 5800,
  },
  {
    id: "tc-4",
    cardName: "Moonbreon",
    cardSet: "Surging Sparks",
    pokemonTcgId: "sv8-185",
    imageUrl: "https://images.pokemontcg.io/sv8/185_hires.png",
    createdAt: "2026-03-15T00:00:00Z",
    latestPrice: 17000,
  },
];

export interface MockSearchResult {
  pokemonTcgId: string;
  name: string;
  set: string;
  imageUrl: string;
  number: string;
  rarity: string;
}

export const mockSearchResults: MockSearchResult[] = [
  {
    pokemonTcgId: "sv3-125",
    name: "Charizard ex",
    set: "Obsidian Flames",
    imageUrl: "https://images.pokemontcg.io/sv3/125_hires.png",
    number: "125/197",
    rarity: "Double Rare",
  },
  {
    pokemonTcgId: "sv3pt5-6",
    name: "Charizard ex",
    set: "151",
    imageUrl: "https://images.pokemontcg.io/sv3pt5/6_hires.png",
    number: "6/165",
    rarity: "Double Rare",
  },
  {
    pokemonTcgId: "swsh12pt5-20",
    name: "Charizard V",
    set: "Crown Zenith",
    imageUrl: "https://images.pokemontcg.io/swsh12pt5/20_hires.png",
    number: "20/159",
    rarity: "Ultra Rare",
  },
  {
    pokemonTcgId: "swsh3-20",
    name: "Charizard VMAX",
    set: "Darkness Ablaze",
    imageUrl: "https://images.pokemontcg.io/swsh3/20_hires.png",
    number: "20/189",
    rarity: "VMAX",
  },
  {
    pokemonTcgId: "base1-4",
    name: "Charizard",
    set: "Base Set",
    imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
    number: "4/102",
    rarity: "Rare Holo",
  },
];
