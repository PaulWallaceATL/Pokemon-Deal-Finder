/**
 * Derives tight eBay sold / Collectr search keys from a listing title so each
 * card (incl. GG63 vs 105/159, reverse vs non-reverse) is priced on its own comps.
 */

import type {
  FinderListingCategory,
  GradingCompany,
} from "@/lib/pokemon/finder-query";
import { extractSlabFromTitle } from "@/lib/listing/slab-reference-price";

const KNOWN_GRADERS = new Set(["PSA", "BGS", "CGC", "SGC", "TAG"]);

/**
 * Print line on PSA labels / eBay titles. Inferred from the **full** title
 * (variant text often appears after `PSA 10` on slabs).
 */
export type ListingPrintKind =
  | "reverse_holo"
  | "holo"
  | "non_holo"
  | "unknown";

/** “Reverse Holofoil” is one token on slabs — allow `holo` + optional `foil`. */
export const REVERSE_HOLO_TITLE_RE =
  /\breverse\s+holo(?:foil)?\b|\brev\.?\s+holo(?:foil)?\b|\br\/h\b|\brh\b/i;

export const NON_HOLO_TITLE_RE = /\bnon[-\s]?holo(?:foil)?\b/i;

export const REGULAR_HOLO_TITLE_RE =
  /\bregular\s+holo(?:foil)?\b|\bholofoil\b|\bholo\s+rare\b/i;

export function inferListingPrintKind(title: string): ListingPrintKind {
  const raw = title.normalize("NFKC");
  if (NON_HOLO_TITLE_RE.test(raw)) return "non_holo";
  if (REVERSE_HOLO_TITLE_RE.test(raw)) return "reverse_holo";
  if (REGULAR_HOLO_TITLE_RE.test(raw)) return "holo";
  if (/\bholo\b/i.test(raw) && !/\breverse\b/i.test(raw)) return "holo";
  return "unknown";
}

/**
 * eBay titles often mirror the slab: set + name before `PSA 10`, then
 * “Reverse Holofoil” after the grade. Used to widen TCG Collector search.
 */
export function slabTailAfterGrade(title: string): string {
  const t = title.normalize("NFKC").replace(/\s+/g, " ");
  const m = t.match(
    /\b(PSA|BGS|BG|CGC|SGC|TAG)\s*(?:#|Grade\s*)?\s*(\d+(?:\.\d+)?)\b/i
  );
  if (!m || m.index === undefined) return "";
  return t.slice(m.index + m[0].length).trim().slice(0, 160);
}

/**
 * For graded sold comps: when the listing print is explicit, drop sold rows
 * that clearly disagree (e.g. reverse slab priced vs regular-holo sales).
 */
export function soldTitleCompatibleWithListingPrintKind(
  listingPrintKind: ListingPrintKind,
  soldTitle: string
): boolean {
  if (listingPrintKind === "unknown") return true;
  const t = soldTitle.normalize("NFKC");
  const soldReverse = REVERSE_HOLO_TITLE_RE.test(t);
  if (listingPrintKind === "reverse_holo") {
    return soldReverse;
  }
  if (listingPrintKind === "holo") {
    return !soldReverse;
  }
  if (listingPrintKind === "non_holo") {
    return (
      !soldReverse &&
      !REGULAR_HOLO_TITLE_RE.test(t) &&
      !/\bholo(?:foil)?\b/i.test(t)
    );
  }
  return true;
}

export interface ParsedListingComp {
  /**
   * Card line for eBay sold search (name + collector #, no set — set is passed
   * separately to `getEbaySoldAverage`).
   */
  ebayCardQuery: string;
  /** Cleaner name line for Collectr / bridges (set omitted; number optional). */
  collectrCardName: string;
  /** Collector number if found: GG63, 105/159, etc. */
  catalogNumber?: string;
  isReverseHolo: boolean;
  isRadiant: boolean;
  printKind: ListingPrintKind;
}

function stripBoilerplate(s: string): string {
  return s
    .replace(/^\d{4}\s*/i, "")
    .replace(/\b(pokemon|tcg|trading\s*card|card\s*game)\b/gi, " ")
    .replace(/\b(swsh|sword\s*&?\s*shield)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a marketplace listing title into a card-specific comp search string.
 */
export function parseListingCompFromTitle(
  title: string,
  setName?: string
): ParsedListingComp {
  const raw = title.normalize("NFKC");
  const printKind = inferListingPrintKind(raw);
  const isReverseHolo = printKind === "reverse_holo";
  const isRadiant = /\bradiant\b/i.test(raw);

  const numMatch = raw.match(
    /\b(GG\d{1,3}|gg\d{1,3}|#\s*\d{1,3}\/\d{2,4}|\d{1,3}\/\d{2,4})\b/i
  );
  let catalogNumber: string | undefined;
  if (numMatch) {
    catalogNumber = numMatch[1].replace(/^#/i, "").trim();
  }

  const beforeSlab = raw.split(/\b(PSA|BGS|CGC|SGC|TAG)\b/i)[0] ?? raw;
  let cardBlob = stripBoilerplate(beforeSlab);

  if (setName) {
    const esc = setName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cardBlob = cardBlob.replace(new RegExp(esc, "gi"), " ");
  }

  cardBlob = cardBlob
    .replace(/#[^\s#]+/g, " ")
    .replace(/\b(english|eng|nm|mint|lp|nm\/m|pack\s*fresh)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const collectrCardName =
    cardBlob.length >= 3
      ? cardBlob
      : stripBoilerplate(beforeSlab).slice(0, 100).trim() || title.slice(0, 80);

  const ebayParts = [collectrCardName];
  if (catalogNumber) ebayParts.push(catalogNumber);

  let ebayCardQuery = ebayParts.join(" ").replace(/\s+/g, " ").trim();
  if (ebayCardQuery.length < 4) {
    ebayCardQuery =
      stripBoilerplate(beforeSlab).slice(0, 100).trim() || title.slice(0, 80);
  }

  return {
    ebayCardQuery,
    collectrCardName,
    catalogNumber,
    isReverseHolo,
    isRadiant,
    printKind,
  };
}

/**
 * Extra tokens so reverse and non-reverse do not share the same sold pool.
 */
export function variantSoldQualifier(parsed: ParsedListingComp): string {
  if (parsed.printKind === "reverse_holo") {
    return '"reverse holofoil"';
  }
  if (parsed.printKind === "holo") {
    return 'holo -reverse -rev -"reverse holo" -"reverse holofoil"';
  }
  if (parsed.printKind === "non_holo") {
    return '-holofoil -"reverse holo" -"reverse holofoil" -reverse -rev';
  }
  return '-reverse -rev -"reverse holo" -"reverse holofoil"';
}

/** Stable key for deduping network fetches. */
export function compKeyForListing(
  title: string,
  setName: string | undefined,
  category: FinderListingCategory,
  defaultGrader: GradingCompany,
  defaultGrade: string
): string {
  const p = parseListingCompFromTitle(title, setName);
  let grader = defaultGrader;
  let grade = defaultGrade;
  if (category === "graded") {
    const slab = extractSlabFromTitle(title);
    if (slab) {
      const c = slab.company.toUpperCase();
      if (KNOWN_GRADERS.has(c)) grader = c as GradingCompany;
      grade = String(slab.grade);
    }
  }
  return [
    p.ebayCardQuery.toLowerCase(),
    p.catalogNumber?.toLowerCase() ?? "",
    p.printKind,
    p.isRadiant ? "rad" : "",
    category,
    grader,
    grade,
  ].join("|");
}
