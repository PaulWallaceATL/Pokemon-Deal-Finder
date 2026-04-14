/**
 * Derives tight eBay sold / Collectr search keys from a listing title so each
 * card (incl. GG63 vs 105/159, reverse vs non-reverse) is priced on its own comps.
 */

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
  const isReverseHolo =
    /\breverse\s*holo|\brev\.?\s*holo|\br\/h\b/i.test(raw);
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
  };
}

/**
 * Extra tokens so reverse and non-reverse do not share the same sold pool.
 */
export function variantSoldQualifier(parsed: ParsedListingComp): string {
  if (parsed.isReverseHolo) {
    return '"reverse holo"';
  }
  return '-reverse -rev -"reverse holo"';
}

/** Stable key for deduping network fetches. */
export function compKeyForListing(
  title: string,
  setName: string | undefined,
  category: string,
  grader: string,
  grade: string
): string {
  const p = parseListingCompFromTitle(title, setName);
  return [
    p.ebayCardQuery.toLowerCase(),
    p.catalogNumber?.toLowerCase() ?? "",
    p.isReverseHolo ? "rh" : "nrh",
    p.isRadiant ? "rad" : "",
    category,
    grader,
    grade,
  ].join("|");
}
