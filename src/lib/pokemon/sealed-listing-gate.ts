import type { SealedProductKind } from "@/lib/pokemon/finder-query";

/**
 * Heuristic filter so sealed-product searches (e.g. ETBs) do not fill up with
 * loose promos, slabs, or singles that only mention the set name.
 */
export function listingTitleMatchesSealedIntent(
  title: string,
  sealedKind: SealedProductKind
): boolean {
  const t = title.toLowerCase();

  if (/\bpsa\s*\d|\bbgs\s*[\d.]+|\bcgc\s*[\d.]+|\bsgc\s*\d|\btag\s*\d/i.test(title)) {
    return false;
  }

  if (
    /\b(just the card|card only|single card|\bsingles\b|no box|empty box|paper only)\b/i.test(
      t
    )
  ) {
    return false;
  }

  // Collector numbering (e.g. 131/195) almost always means a single; allow
  // only when the title clearly names a sealed SKU (box / ETB / tin / etc.).
  if (/\b\d{1,3}\s*\/\s*\d{2,4}\b/.test(title)) {
    const namesSealedSku =
      /\b(etb|elite\s+trainer|booster\s*box|booster\s*bundle|factory\s*sealed|tin\b|blister|ultra\s*premium|premium\s+collection|collection\s*box|display\s*box|case\s+of|build\s*&\s*battle)\b/i.test(
        t
      );
    if (!namesSealedSku) return false;
  }

  if (
    /\bpromo\b/i.test(t) &&
    !/\b(etb|elite\s+trainer|booster\s*box|booster\s*bundle|tin\b|blister|factory\s*sealed|premium\s+collection|collection\s*box|ultra\s*premium)\b/i.test(
      t
    )
  ) {
    return false;
  }

  switch (sealedKind) {
    case "etb":
      return /\betb\b|elite\s+trainer|elite\s+trainer\s+box/i.test(t);
    case "booster_box":
      return /\bbooster\s*box\b/i.test(t) && !/\belite\s+trainer\b|\betb\b/i.test(t);
    case "booster_bundle":
      return /\bbooster\s*bundle|build\s*&\s*battle|build\s+and\s+battle/i.test(t);
    case "booster_pack": {
      if (/\belite\s+trainer\b|\betb\b/i.test(t)) return false;
      return (
        /\bbooster\s*packs?\b/i.test(t) &&
        /\b(sealed|blister|factory|lot|display|set\s*of|\d+x)\b/i.test(t)
      );
    }
    case "blister":
      return /\bblister\b/i.test(t);
    case "tin":
      return /\btin\b/i.test(t);
    case "upc":
      return /\b(ultra\s*premium|upc|premium\s+collection)\b/i.test(t);
    case "case":
      return /\bcase\s+(of|factory)|factory\s*case|display\s*case\b/i.test(t);
    case "other":
      return /\b(factory\s*)?sealed|new\s*sealed|misb|nib\b/i.test(t);
    case "any":
    default:
      return /\b(etb|elite\s+trainer|booster\s*box|booster\s*bundle|factory\s*sealed|\bsealed\b|blister|\btin\b|ultra\s*premium|premium\s+collection|collection\s*box|display\s*box|build\s*&\s*battle|bbx)\b/i.test(
        t
      );
  }
}
