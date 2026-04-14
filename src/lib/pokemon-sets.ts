export interface PokemonSetEntry {
  value: string;
  label: string;
  era: string;
}

export const POKEMON_SET_ERAS = [
  "Scarlet & Violet",
  "Sword & Shield",
  "Sun & Moon",
  "XY",
  "Black & White",
  "HeartGold & SoulSilver",
  "Platinum",
  "Diamond & Pearl",
  "EX",
  "e-Card",
  "Neo",
  "Gym",
  "Base Set",
  "Promos & special sets",
] as const;

export const POKEMON_SETS: PokemonSetEntry[] = [
  // ============================================================
  // Scarlet & Violet Era
  // ============================================================
  { value: "sv9", label: "Journey Together", era: "Scarlet & Violet" },
  { value: "sv8a", label: "Prismatic Evolutions", era: "Scarlet & Violet" },
  { value: "sv8", label: "Surging Sparks", era: "Scarlet & Violet" },
  { value: "sv7", label: "Stellar Crown", era: "Scarlet & Violet" },
  { value: "sv6pt5", label: "Shrouded Fable", era: "Scarlet & Violet" },
  { value: "sv6", label: "Twilight Masquerade", era: "Scarlet & Violet" },
  { value: "sv5", label: "Temporal Forces", era: "Scarlet & Violet" },
  { value: "sv4pt5", label: "Paldean Fates", era: "Scarlet & Violet" },
  { value: "sv4", label: "Paradox Rift", era: "Scarlet & Violet" },
  { value: "sv3pt5", label: "151", era: "Scarlet & Violet" },
  { value: "sv3", label: "Obsidian Flames", era: "Scarlet & Violet" },
  { value: "sv2", label: "Paldea Evolved", era: "Scarlet & Violet" },
  { value: "sv1", label: "Scarlet & Violet Base", era: "Scarlet & Violet" },

  // ============================================================
  // Sword & Shield Era
  // ============================================================
  { value: "swsh12pt5", label: "Crown Zenith", era: "Sword & Shield" },
  { value: "swsh12", label: "Silver Tempest", era: "Sword & Shield" },
  { value: "swsh11pt5", label: "Pokemon GO", era: "Sword & Shield" },
  { value: "swsh11", label: "Lost Origin", era: "Sword & Shield" },
  { value: "swsh10pt5", label: "Pokemon GO (Radiant)", era: "Sword & Shield" },
  { value: "swsh10", label: "Astral Radiance", era: "Sword & Shield" },
  { value: "swsh9pt5", label: "Brilliant Stars TG", era: "Sword & Shield" },
  { value: "swsh9", label: "Brilliant Stars", era: "Sword & Shield" },
  { value: "swsh8", label: "Fusion Strike", era: "Sword & Shield" },
  { value: "cel25", label: "Celebrations", era: "Sword & Shield" },
  { value: "swsh7", label: "Evolving Skies", era: "Sword & Shield" },
  { value: "swsh6", label: "Chilling Reign", era: "Sword & Shield" },
  { value: "swsh5", label: "Battle Styles", era: "Sword & Shield" },
  { value: "swsh45", label: "Shining Fates", era: "Sword & Shield" },
  { value: "swsh4", label: "Vivid Voltage", era: "Sword & Shield" },
  { value: "swsh35", label: "Champion's Path", era: "Sword & Shield" },
  { value: "swsh3", label: "Darkness Ablaze", era: "Sword & Shield" },
  { value: "swsh2", label: "Rebel Clash", era: "Sword & Shield" },
  { value: "swsh1", label: "Sword & Shield Base", era: "Sword & Shield" },

  // ============================================================
  // Sun & Moon Era
  // ============================================================
  { value: "sm12", label: "Cosmic Eclipse", era: "Sun & Moon" },
  { value: "sm115", label: "Hidden Fates", era: "Sun & Moon" },
  { value: "sm11", label: "Unified Minds", era: "Sun & Moon" },
  { value: "sm10", label: "Unbroken Bonds", era: "Sun & Moon" },
  { value: "det1", label: "Detective Pikachu", era: "Sun & Moon" },
  { value: "sm9", label: "Team Up", era: "Sun & Moon" },
  { value: "sm8", label: "Lost Thunder", era: "Sun & Moon" },
  { value: "sm75", label: "Dragon Majesty", era: "Sun & Moon" },
  { value: "sm7", label: "Celestial Storm", era: "Sun & Moon" },
  { value: "sm6", label: "Forbidden Light", era: "Sun & Moon" },
  { value: "sm5", label: "Ultra Prism", era: "Sun & Moon" },
  { value: "sm4", label: "Crimson Invasion", era: "Sun & Moon" },
  { value: "sm35", label: "Shining Legends", era: "Sun & Moon" },
  { value: "sm3", label: "Burning Shadows", era: "Sun & Moon" },
  { value: "sm2", label: "Guardians Rising", era: "Sun & Moon" },
  { value: "sm1", label: "Sun & Moon Base", era: "Sun & Moon" },

  // ============================================================
  // XY Era
  // ============================================================
  { value: "xy12", label: "Evolutions", era: "XY" },
  { value: "xy11", label: "Steam Siege", era: "XY" },
  { value: "xy10", label: "Fates Collide", era: "XY" },
  { value: "g1", label: "Generations", era: "XY" },
  { value: "xy9", label: "BREAKpoint", era: "XY" },
  { value: "xy8", label: "BREAKthrough", era: "XY" },
  { value: "xy7", label: "Ancient Origins", era: "XY" },
  { value: "xy6", label: "Roaring Skies", era: "XY" },
  { value: "dc1", label: "Double Crisis", era: "XY" },
  { value: "xy5", label: "Primal Clash", era: "XY" },
  { value: "xy4", label: "Phantom Forces", era: "XY" },
  { value: "xy3", label: "Furious Fists", era: "XY" },
  { value: "xy2", label: "Flashfire", era: "XY" },
  { value: "xy1", label: "XY Base", era: "XY" },

  // ============================================================
  // Black & White Era
  // ============================================================
  { value: "bw11", label: "Legendary Treasures", era: "Black & White" },
  { value: "bw10", label: "Plasma Blast", era: "Black & White" },
  { value: "bw9", label: "Plasma Freeze", era: "Black & White" },
  { value: "bw8", label: "Plasma Storm", era: "Black & White" },
  { value: "bw7", label: "Boundaries Crossed", era: "Black & White" },
  { value: "dv1", label: "Dragon Vault", era: "Black & White" },
  { value: "bw6", label: "Dragons Exalted", era: "Black & White" },
  { value: "bw5", label: "Dark Explorers", era: "Black & White" },
  { value: "bw4", label: "Next Destinies", era: "Black & White" },
  { value: "bw3", label: "Noble Victories", era: "Black & White" },
  { value: "bw2", label: "Emerging Powers", era: "Black & White" },
  { value: "bw1", label: "Black & White Base", era: "Black & White" },

  // ============================================================
  // HeartGold & SoulSilver Era
  // ============================================================
  { value: "col1", label: "Call of Legends", era: "HeartGold & SoulSilver" },
  { value: "hgss4", label: "Triumphant", era: "HeartGold & SoulSilver" },
  { value: "hgss3", label: "Undaunted", era: "HeartGold & SoulSilver" },
  { value: "hgss2", label: "Unleashed", era: "HeartGold & SoulSilver" },
  { value: "hgss1", label: "HeartGold & SoulSilver Base", era: "HeartGold & SoulSilver" },

  // ============================================================
  // Platinum Era
  // ============================================================
  { value: "pl4", label: "Arceus", era: "Platinum" },
  { value: "pl3", label: "Supreme Victors", era: "Platinum" },
  { value: "pl2", label: "Rising Rivals", era: "Platinum" },
  { value: "pl1", label: "Platinum Base", era: "Platinum" },

  // ============================================================
  // Diamond & Pearl Era
  // ============================================================
  { value: "dp7", label: "Stormfront", era: "Diamond & Pearl" },
  { value: "dp6", label: "Legends Awakened", era: "Diamond & Pearl" },
  { value: "dp5", label: "Majestic Dawn", era: "Diamond & Pearl" },
  { value: "dp4", label: "Great Encounters", era: "Diamond & Pearl" },
  { value: "dp3", label: "Secret Wonders", era: "Diamond & Pearl" },
  { value: "dp2", label: "Mysterious Treasures", era: "Diamond & Pearl" },
  { value: "dp1", label: "Diamond & Pearl Base", era: "Diamond & Pearl" },

  // ============================================================
  // EX Era (Ruby & Sapphire through Power Keepers)
  // ============================================================
  { value: "ex16", label: "Power Keepers", era: "EX" },
  { value: "ex15", label: "Dragon Frontiers", era: "EX" },
  { value: "ex14", label: "Crystal Guardians", era: "EX" },
  { value: "ex13", label: "Holon Phantoms", era: "EX" },
  { value: "ex12", label: "Legend Maker", era: "EX" },
  { value: "ex11", label: "Delta Species", era: "EX" },
  { value: "ex10", label: "Unseen Forces", era: "EX" },
  { value: "ex9", label: "Emerald", era: "EX" },
  { value: "ex8", label: "Deoxys", era: "EX" },
  { value: "ex7", label: "Team Rocket Returns", era: "EX" },
  { value: "ex6", label: "FireRed & LeafGreen", era: "EX" },
  { value: "ex5", label: "Hidden Legends", era: "EX" },
  { value: "ex4", label: "Team Magma vs Team Aqua", era: "EX" },
  { value: "ex3", label: "Dragon", era: "EX" },
  { value: "ex2", label: "Sandstorm", era: "EX" },
  { value: "ex1", label: "Ruby & Sapphire", era: "EX" },

  // ============================================================
  // e-Card Era
  // ============================================================
  { value: "ecard3", label: "Skyridge", era: "e-Card" },
  { value: "ecard2", label: "Aquapolis", era: "e-Card" },
  { value: "ecard1", label: "Expedition Base Set", era: "e-Card" },

  // ============================================================
  // Neo Era
  // ============================================================
  { value: "neo4", label: "Neo Destiny", era: "Neo" },
  { value: "neo3", label: "Neo Revelation", era: "Neo" },
  { value: "neo2", label: "Neo Discovery", era: "Neo" },
  { value: "neo1", label: "Neo Genesis", era: "Neo" },

  // ============================================================
  // Gym Era
  // ============================================================
  { value: "gym2", label: "Gym Challenge", era: "Gym" },
  { value: "gym1", label: "Gym Heroes", era: "Gym" },

  // ============================================================
  // Base Set Era
  // ============================================================
  { value: "base6", label: "Legendary Collection", era: "Base Set" },
  { value: "base5", label: "Team Rocket", era: "Base Set" },
  { value: "base4", label: "Base Set 2", era: "Base Set" },
  { value: "base3", label: "Fossil", era: "Base Set" },
  { value: "base2", label: "Jungle", era: "Base Set" },
  { value: "base1", label: "Base Set", era: "Base Set" },

  // ============================================================
  // Promos & special sets (black star lines, collabs, oddball releases)
  // ============================================================
  { value: "svp", label: "SV Black Star Promos", era: "Promos & special sets" },
  { value: "swshp", label: "SWSH Black Star Promos", era: "Promos & special sets" },
  { value: "smp", label: "SM Black Star Promos", era: "Promos & special sets" },
  { value: "xyp", label: "XY Black Star Promos", era: "Promos & special sets" },
  { value: "bwp", label: "BW Black Star Promos", era: "Promos & special sets" },
  { value: "hsp", label: "HGSS Black Star Promos", era: "Promos & special sets" },
  { value: "pop", label: "POP Series", era: "Promos & special sets" },
  { value: "np", label: "Nintendo Black Star Promos", era: "Promos & special sets" },
  { value: "basep", label: "WOTC Black Star Promos", era: "Promos & special sets" },
  { value: "mcd", label: "McDonald's Promos", era: "Promos & special sets" },
];
