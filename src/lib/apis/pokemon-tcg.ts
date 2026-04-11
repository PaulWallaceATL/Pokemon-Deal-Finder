const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export interface PokemonCard {
  id: string;
  name: string;
  set: string;
  number: string;
  rarity: string;
  imageSmall: string;
  imageLarge: string;
  tcgplayerPriceCents: number | null;
}

const mockCards: PokemonCard[] = [
  {
    id: "sv3-125",
    name: "Charizard ex",
    set: "Obsidian Flames",
    number: "125/197",
    rarity: "Double Rare",
    imageSmall: "https://images.pokemontcg.io/sv3/125.png",
    imageLarge: "https://images.pokemontcg.io/sv3/125_hires.png",
    tcgplayerPriceCents: 3799,
  },
  {
    id: "swsh4-44",
    name: "Pikachu VMAX",
    set: "Vivid Voltage",
    number: "44/185",
    rarity: "VMAX",
    imageSmall: "https://images.pokemontcg.io/swsh4/44.png",
    imageLarge: "https://images.pokemontcg.io/swsh4/44_hires.png",
    tcgplayerPriceCents: 5700,
  },
  {
    id: "swsh7-215",
    name: "Umbreon VMAX",
    set: "Evolving Skies",
    number: "215/203",
    rarity: "Alternate Art Secret",
    imageSmall: "https://images.pokemontcg.io/swsh7/215.png",
    imageLarge: "https://images.pokemontcg.io/swsh7/215_hires.png",
    tcgplayerPriceCents: 24000,
  },
  {
    id: "sv3pt5-6",
    name: "Charizard ex",
    set: "151",
    number: "6/165",
    rarity: "Double Rare",
    imageSmall: "https://images.pokemontcg.io/sv3pt5/6.png",
    imageLarge: "https://images.pokemontcg.io/sv3pt5/6_hires.png",
    tcgplayerPriceCents: 2200,
  },
  {
    id: "base1-4",
    name: "Charizard",
    set: "Base Set",
    number: "4/102",
    rarity: "Rare Holo",
    imageSmall: "https://images.pokemontcg.io/base1/4.png",
    imageLarge: "https://images.pokemontcg.io/base1/4_hires.png",
    tcgplayerPriceCents: 35000,
  },
];

export async function searchCards(query: string): Promise<PokemonCard[]> {
  if (USE_MOCK) {
    const q = query.toLowerCase();
    return mockCards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.set.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }

  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;

  const response = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(query)}"&pageSize=10&orderBy=-set.releaseDate`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.data ?? []).map(
    (card: {
      id: string;
      name: string;
      set: { name: string };
      number: string;
      rarity: string;
      images: { small: string; large: string };
      tcgplayer?: {
        prices?: Record<string, { market?: number }>;
      };
    }) => {
      let tcgplayerPriceCents: number | null = null;
      if (card.tcgplayer?.prices) {
        const priceTypes = Object.values(card.tcgplayer.prices);
        const marketPrice = priceTypes.find((p) => p.market != null)?.market;
        if (marketPrice != null) {
          tcgplayerPriceCents = Math.round(marketPrice * 100);
        }
      }

      return {
        id: card.id,
        name: card.name,
        set: card.set.name,
        number: card.number,
        rarity: card.rarity ?? "Unknown",
        imageSmall: card.images.small,
        imageLarge: card.images.large,
        tcgplayerPriceCents,
      };
    }
  );
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  if (USE_MOCK) {
    return mockCards.find((c) => c.id === id) ?? null;
  }

  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;

  const response = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`, {
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const { data: card } = await response.json();

  let tcgplayerPriceCents: number | null = null;
  if (card.tcgplayer?.prices) {
    const priceTypes = Object.values(card.tcgplayer.prices) as { market?: number }[];
    const marketPrice = priceTypes.find((p) => p.market != null)?.market;
    if (marketPrice != null) {
      tcgplayerPriceCents = Math.round(marketPrice * 100);
    }
  }

  return {
    id: card.id,
    name: card.name,
    set: card.set.name,
    number: card.number,
    rarity: card.rarity ?? "Unknown",
    imageSmall: card.images.small,
    imageLarge: card.images.large,
    tcgplayerPriceCents,
  };
}
