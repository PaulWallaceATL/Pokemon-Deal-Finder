/**
 * Builds listing-search qualifiers for the instant Pokémon finder so eBay /
 * sold comps line up with raw vs graded vs sealed intent.
 */

import type { ProductType } from "@/lib/mock-data";

export type FinderListingCategory = "raw" | "graded" | "sealed";

export type SealedProductKind =
  | "any"
  | "tin"
  | "etb"
  | "booster_box"
  | "booster_bundle"
  | "booster_pack";

export type GradingCompany = "PSA" | "BGS" | "CGC" | "SGC" | "TAG";

export function buildListingQualifier(params: {
  category: FinderListingCategory;
  sealedKind?: SealedProductKind;
  grader?: GradingCompany;
  grade?: string;
}): string {
  if (params.category === "raw") {
    return "-PSA -BGS -CGC -SGC -TAG -slab -graded -repack -custom";
  }
  if (params.category === "graded") {
    const company = params.grader ?? "PSA";
    const grade = (params.grade ?? "10").trim();
    return `${company} ${grade}`.trim();
  }
  const kind = params.sealedKind ?? "any";
  const byKind: Record<SealedProductKind, string> = {
    any: "factory sealed",
    tin: "tin factory sealed",
    etb: "elite trainer box factory sealed",
    booster_box: "booster box factory sealed",
    booster_bundle: "booster bundle factory sealed",
    booster_pack: "booster pack factory sealed",
  };
  return byKind[kind];
}

export function finderCategoryToProductType(
  category: FinderListingCategory,
  sealedKind?: SealedProductKind
): ProductType {
  if (category === "raw") return "raw";
  if (category === "graded") return "graded";
  switch (sealedKind) {
    case "tin":
      return "tin";
    case "etb":
      return "etb";
    case "booster_box":
      return "booster-box";
    case "booster_bundle":
      return "booster-bundle";
    case "booster_pack":
      return "booster-pack";
    default:
      return "booster-box";
  }
}
