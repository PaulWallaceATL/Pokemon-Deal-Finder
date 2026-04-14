import type {
  FinderListingCategory,
  GradingCompany,
} from "@/lib/pokemon/finder-query";

export interface SlabFromTitle {
  company: string;
  grade: number;
}

/**
 * Best-effort slab parse from listing titles (eBay / marketplace).
 */
export function extractSlabFromTitle(title: string): SlabFromTitle | null {
  const t = title.normalize("NFKC").replace(/\s+/g, " ");
  const m = t.match(
    /\b(PSA|BGS|BG|CGC|SGC|TAG)\s*(?:#|Grade\s*)?\s*(\d+(?:\.\d+)?)\b/i
  );
  if (!m) return null;
  let company = m[1].toUpperCase();
  if (company === "BG") company = "BGS";
  const grade = parseFloat(m[2]);
  if (Number.isNaN(grade)) return null;
  return { company, grade };
}

/** Map BGS-style labels to a single numeric curve shared with PSA anchors. */
function normalizedCurveGrade(company: string, grade: number): number {
  const c = company.toUpperCase();
  if (c === "BGS") {
    if (grade >= 10) return 10;
    if (grade >= 9.5) return 9.75;
    return grade;
  }
  return grade;
}

function psaAnchorsFromMarketAnchor(anchorCents: number): {
  p10: number;
  p9: number;
  p8: number;
  p7: number;
  p6: number;
  p5: number;
} {
  const p9 = anchorCents;
  const p10 = Math.round(anchorCents * 1.8);
  const p8 = Math.round(anchorCents * 0.6);
  const p7 = Math.round(p8 * 0.78);
  const p6 = Math.round(p8 * 0.62);
  const p5 = Math.round(p8 * 0.48);
  return { p10, p9, p8, p7, p6, p5 };
}

/**
 * Reference price for a graded single from a Collectr+eBay anchor and a
 * simple PSA-style ladder (extrapolated below 8).
 */
export function gradedReferencePriceCents(
  company: string,
  grade: number,
  gradedAnchorCents: number | null,
  blendedFallback: number
): number {
  if (gradedAnchorCents == null || gradedAnchorCents <= 0) {
    return blendedFallback;
  }
  const g = normalizedCurveGrade(company, grade);
  const { p10, p9, p8, p7, p6, p5 } = psaAnchorsFromMarketAnchor(gradedAnchorCents);

  const points: [number, number][] = [
    [10, p10],
    [9, p9],
    [8, p8],
    [7, p7],
    [6, p6],
    [5, p5],
  ];

  if (g >= 10) return p10;
  if (g <= 1) return Math.max(1, Math.round(p5 * 0.25));

  for (let i = 0; i < points.length - 1; i++) {
    const [gHi, pHi] = points[i];
    const [gLo, pLo] = points[i + 1];
    if (g <= gHi && g >= gLo) {
      if (gHi === gLo) return pHi;
      const t = (g - gLo) / (gHi - gLo);
      return Math.max(1, Math.round(pLo + t * (pHi - pLo)));
    }
  }

  return Math.max(1, p5);
}

export function listingMarketReferenceCents(params: {
  listingTitle: string;
  category: FinderListingCategory;
  blendedDefault: number;
  filterGrader: GradingCompany;
  filterGrade: string;
}): { referenceCents: number; note: string | null } {
  const {
    listingTitle,
    category,
    blendedDefault,
    filterGrader,
    filterGrade,
  } = params;

  if (category === "raw" || category === "sealed") {
    return { referenceCents: blendedDefault, note: null };
  }

  /**
   * Instant finder: sold + Collectr are already fetched for the listing’s
   * slab grade (or search filter grade). Use that blend directly — do not
   * interpolate from a different grade (e.g. PSA 7 vs PSA 9 ladder).
   */
  const slab = extractSlabFromTitle(listingTitle);
  const filterG = parseFloat(filterGrade);
  const filterGradeNum = Number.isFinite(filterG) ? filterG : 10;

  if (slab) {
    return {
      referenceCents: blendedDefault,
      note: `vs ${slab.company} ${slab.grade} (eBay sold + Collectr for that grade)`,
    };
  }

  if (Number.isFinite(filterGradeNum)) {
    return {
      referenceCents: blendedDefault,
      note: `vs ${filterGrader} ${filterGradeNum} (no slab in title; using filter grade)`,
    };
  }

  return { referenceCents: blendedDefault, note: null };
}
