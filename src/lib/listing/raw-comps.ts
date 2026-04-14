/**
 * Detects graded / slab language in marketplace titles so raw comps can
 * exclude PSA/BGS/etc. sold listings.
 */
export function titleLooksLikeGradedOrSlab(title: string): boolean {
  const t = title.normalize("NFKC");
  // Slab grades only (avoid "PSA" next to collector numbers like 284/217).
  const slabGradeAfter = String.raw`(?:10|9\.5|9|8\.5|8|7|6|5|4|3|2|1)`;
  if (
    new RegExp(
      String.raw`\b(PSA|BGS|BG|CGC|SGC|TAG)\s*(?:#|Grade\s*)?\s*${slabGradeAfter}\b`,
      "i"
    ).test(t)
  ) {
    return true;
  }
  // "PSA GEM MINT 10" — words between company and the grade digit
  if (/\b(PSA|BGS|CGC|SGC|TAG)\b/i.test(t)) {
    const idx = t.search(/\b(PSA|BGS|CGC|SGC|TAG)\b/i);
    if (idx >= 0) {
      const tail = t.slice(idx, idx + 90);
      if (/\b(10|9\.5|9|8|7|6|5)\b/.test(tail)) {
        if (
          /\b(gem\s*mint|gem\s*mt|gemmint|slab|grade|black\s*label|pristine)\b/i.test(
            tail
          )
        ) {
          return true;
        }
      }
    }
  }
  if (
    /\b(slabs?|slabbed|encapsulated|gem\s*mint|gem\s*mt|gemmint|black\s*label|bgs\s*10|pristine)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (/\bgraded\s+card\b/i.test(t)) return true;
  if (/\b(pre[- ]?graded|already\s+graded|from\s+psa)\b/i.test(t)) return true;
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
