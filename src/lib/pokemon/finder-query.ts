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
  | "booster_pack"
  | "blister"
  | "upc"
  | "case"
  | "other";

export type GradingCompany = "PSA" | "BGS" | "CGC" | "SGC" | "TAG";

export function buildListingQualifier(params: {
  category: FinderListingCategory;
  sealedKind?: SealedProductKind;
  grader?: GradingCompany;
  grade?: string;
}): string {
  if (params.category === "raw") {
    return "-PSA -BGS -CGC -SGC -TAG -slab -graded -GEM -GEMMT -repack -custom -authentic -encapsulated";
  }
  if (params.category === "graded") {
    const company = params.grader ?? "PSA";
    const grade = (params.grade ?? "10").trim();
    return `${company} ${grade}`.trim();
  }
  const kind = params.sealedKind ?? "any";
  /** eBay tokens: steer toward product SKUs, away from singles/slabs. */
  const antiSingle =
    "-PSA -BGS -CGC -SGC -TAG -graded -slab -single -singles -card only -just the card";
  const byKind: Record<SealedProductKind, string> = {
    any: `factory sealed pokemon tcg ${antiSingle}`,
    tin: `tin factory sealed pokemon tcg ${antiSingle}`,
    etb: `elite trainer box ETB factory sealed pokemon tcg ${antiSingle}`,
    booster_box: `booster box factory sealed pokemon tcg ${antiSingle}`,
    booster_bundle: `booster bundle factory sealed pokemon tcg ${antiSingle}`,
    booster_pack: `booster pack factory sealed pokemon tcg ${antiSingle}`,
    blister: `blister pack factory sealed pokemon tcg ${antiSingle}`,
    upc: `ultra premium collection factory sealed pokemon tcg ${antiSingle}`,
    case: `case factory sealed pokemon tcg ${antiSingle}`,
    other: `sealed pokemon tcg box ${antiSingle}`,
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
    case "blister":
      return "blister";
    case "upc":
      return "upc";
    case "case":
      return "case";
    case "other":
      return "booster-box";
    default:
      return "booster-box";
  }
}
