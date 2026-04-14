/**
 * Detects graded / slab language in marketplace titles so raw comps can
 * exclude PSA/BGS/etc. sold listings.
 */
export function titleLooksLikeGradedOrSlab(title: string): boolean {
  const t = title.normalize("NFKC");
  if (/\b(PSA|BGS|BG|CGC|SGC|TAG)\s*(?:#|Grade\s*)?\s*\d/i.test(t)) {
    return true;
  }
  if (
    /\b(slabs?|gem\s*mint|black\s*label|bgs\s*10|pristine)\b/i.test(t)
  ) {
    return true;
  }
  if (/\bgraded\s+card\b/i.test(t)) return true;
  return false;
}

/**
 * For graded sold comps: require the slab company + grade to appear in the
 * sold listing title so PSA 7 averages are not mixed with PSA 9/10 sales.
 */
export function soldTitleMatchesGradeRough(
  title: string,
  company: string,
  gradeStr: string
): boolean {
  const t = title.normalize("NFKC");
  const c = company.toUpperCase();
  const g = gradeStr.trim();
  if (!g) return true;
  const esc = g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (c === "PSA") {
    if (!/\bPSA\b/i.test(t)) return false;
    return new RegExp(`\\bPSA\\s*(?:#|Grade\\s*)?\\s*${esc}\\b`, "i").test(t);
  }
  if (c === "BGS" || c === "BG") {
    if (!/\b(BGS|BG|BECKETT)\b/i.test(t)) return false;
    return new RegExp(`\\b(?:BGS|BG)\\s*(?:#|Grade\\s*)?\\s*${esc}\\b`, "i").test(
      t
    );
  }
  if (!new RegExp(`\\b${c}\\b`, "i").test(t)) return false;
  return new RegExp(`\\b${c}\\s*(?:#|Grade\\s*)?\\s*${esc}\\b`, "i").test(t);
}
