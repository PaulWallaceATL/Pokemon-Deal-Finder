/**
 * Filters for Pokémon singles printings (holo / reverse / full art / etc.)
 * so marketplace queries and result filtering line up with the intended card.
 */

import { REVERSE_HOLO_TITLE_RE } from "@/lib/listing/listing-comp-query";

export type CardFinishFilter =
  | "any"
  | "non_holo"
  | "holo"
  | "reverse_holo"
  | "full_art"
  | "alt_art"
  | "trainer_gallery"
  | "illustration_rare";

const FINISH_VALUES: CardFinishFilter[] = [
  "any",
  "non_holo",
  "holo",
  "reverse_holo",
  "full_art",
  "alt_art",
  "trainer_gallery",
  "illustration_rare",
];

export function parseCardFinish(v: string | null): CardFinishFilter {
  const x = v?.trim().toLowerCase().replace(/-/g, "_") as CardFinishFilter;
  return FINISH_VALUES.includes(x) ? x : "any";
}

/** Tokens appended to eBay / sold search queries (raw singles). */
export function finishSearchSuffix(finish: CardFinishFilter): string {
  switch (finish) {
    case "reverse_holo":
      return '"reverse holo"';
    case "holo":
      return "holo -reverse -rev";
    case "non_holo":
      return '-reverse -rev -"reverse holo"';
    case "full_art":
      return '"full art"';
    case "alt_art":
      return '"alt art"';
    case "trainer_gallery":
      return '"trainer gallery" TG';
    case "illustration_rare":
      return '"illustration rare" IR';
    case "any":
    default:
      return "";
  }
}

export function titleMatchesFinishFilter(
  title: string,
  finish: CardFinishFilter
): boolean {
  if (finish === "any") return true;

  const isReverse =
    REVERSE_HOLO_TITLE_RE.test(title) || /\brev\s+holo/i.test(title);
  const isAlt = /\balt(?:ernate)?\s*art|\baa\b/i.test(title);
  const isFullArt = /\bfull\s*art|\bfa\b/i.test(title);
  const isTg = /\btrainer\s*gallery|\btg\s*0?\d|\bgallery\b/i.test(title);
  const isIr = /\billustration\s*rare|\bir\b/i.test(title);
  const hasHoloWord = /\bholo\b/i.test(title);

  switch (finish) {
    case "reverse_holo":
      return isReverse;
    case "holo":
      return hasHoloWord && !isReverse;
    case "non_holo":
      return !isReverse && !isAlt && !isFullArt && !isTg && !isIr;
    case "full_art":
      return isFullArt;
    case "alt_art":
      return isAlt;
    case "trainer_gallery":
      return isTg;
    case "illustration_rare":
      return isIr;
    default:
      return true;
  }
}
