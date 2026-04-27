"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DealCard } from "@/components/deal-card";
import type { Deal } from "@/lib/deals/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POKEMON_SETS, POKEMON_SET_ERAS } from "@/lib/pokemon-sets";
import { cn } from "@/lib/utils";
import type { CardFinishFilter } from "@/lib/pokemon/card-finish";
import type { SealedProductKind } from "@/lib/pokemon/finder-query";

interface MarketPrices {
  collectr: number | null;
  ebay_sold_avg: number | null;
  tcg_collector?: number | null;
}

interface SearchResponse {
  deals: Deal[];
  marketPrices: MarketPrices;
  blendedPriceCents: number;
  totalListings: number;
  cardInfo: {
    name: string;
    set: string;
    number: string;
    rarity: string;
    image: string;
  } | null;
  message?: string;
  category?: string;
  listingQualifier?: string;
  finish?: string;
  disclaimer?: string;
  sealedKind?: string;
  grader?: string;
  grade?: string;
  ebaySoldSampleSize?: number;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const GRADE_OPTIONS = [
  "10",
  "9.5",
  "9",
  "8.5",
  "8",
  "7.5",
  "7",
  "6.5",
  "6",
  "5.5",
  "5",
  "4",
  "3",
  "2",
  "1",
] as const;

const SEALED_OPTIONS: { value: SealedProductKind; label: string }[] = [
  { value: "any", label: "Any sealed" },
  { value: "etb", label: "ETB" },
  { value: "booster_box", label: "Booster box" },
  { value: "booster_bundle", label: "Bundle" },
  { value: "booster_pack", label: "Booster pack" },
  { value: "blister", label: "Blister" },
  { value: "tin", label: "Tin" },
  { value: "upc", label: "UPC / premium box" },
  { value: "case", label: "Case" },
  { value: "other", label: "Other sealed" },
];

const FINISH_OPTIONS: { value: CardFinishFilter; label: string }[] = [
  { value: "any", label: "Any printing" },
  { value: "non_holo", label: "Non-holo" },
  { value: "holo", label: "Holo (not reverse)" },
  { value: "reverse_holo", label: "Reverse holo" },
  { value: "full_art", label: "Full art" },
  { value: "alt_art", label: "Alt art" },
  { value: "trainer_gallery", label: "Trainer Gallery" },
  { value: "illustration_rare", label: "Illustration rare" },
];

export function DealSearch() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"singles" | "sealed">("singles");
  /** Default: graded slabs (underpriced slab hunt). */
  const [singlesType, setSinglesType] = useState<"raw" | "graded">("graded");
  const [setId, setSetId] = useState<string>("all");
  const [grader, setGrader] = useState<string>("PSA");
  const [grade, setGrade] = useState<string>("10");
  const [sealedKind, setSealedKind] = useState<SealedProductKind>("any");
  const [finish, setFinish] = useState<CardFinishFilter>("any");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const category =
    mode === "sealed" ? "sealed" : singlesType === "graded" ? "graded" : "raw";

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults(null);

    try {
      const params = new URLSearchParams({ q });
      params.set("category", category);
      if (setId && setId !== "all") params.set("setId", setId);
      if (category === "graded") {
        params.set("grader", grader);
        params.set("grade", grade);
      }
      if (category === "sealed") {
        params.set("sealedKind", sealedKind);
      }
      if (category === "raw" && finish !== "any") {
        params.set("finish", finish);
      }
      const res = await fetch(`/api/deals/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResponse = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Deal search failed:", err);
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const dealsAboveThreshold = results?.deals.filter(
    (d) => d.discountPct >= 10
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 space-y-5 rounded-xl border bg-card p-4 shadow-sm lg:sticky lg:top-4 lg:w-72">
        <h3 className="text-sm font-semibold">Filters</h3>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Browse</p>
          <div className="flex rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setMode("singles")}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                mode === "singles"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Singles
            </button>
            <button
              type="button"
              onClick={() => setMode("sealed")}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                mode === "sealed"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sealed
            </button>
          </div>
        </div>

        {mode === "singles" ? (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Card type
              </label>
              <Select
                value={singlesType}
                onValueChange={(v) =>
                  setSinglesType((v as "raw" | "graded") ?? "raw")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="graded">Graded slab (default)</SelectItem>
                  <SelectItem value="raw">Raw (ungraded)</SelectItem>
                </SelectContent>
              </Select>
              {singlesType === "graded" ? (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Each result shows a print badge (common / holofoil / reverse
                  holofoil). We read the PSA-style label on the listing photo when
                  possible so comps match the slab, not only the title.
                </p>
              ) : null}
            </div>

            {singlesType === "graded" ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Grade filter (comps)
                  </label>
                  <Select value={grade} onValueChange={(v) => setGrade(v ?? "10")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {GRADE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Grading company
                  </label>
                  <Select
                    value={grader}
                    onValueChange={(v) => setGrader(v ?? "PSA")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PSA">PSA</SelectItem>
                      <SelectItem value="BGS">BGS (Beckett)</SelectItem>
                      <SelectItem value="CGC">CGC</SelectItem>
                      <SelectItem value="SGC">SGC</SelectItem>
                      <SelectItem value="TAG">TAG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Printing / finish
                </label>
                <Select
                  value={finish}
                  onValueChange={(v) =>
                    setFinish((v as CardFinishFilter) ?? "any")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINISH_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Narrows eBay search and hides listings that don&apos;t match
                  the printing (best-effort from titles). For AI &quot;pre-grade&quot;
                  on raw PSA 10 candidates, use the separate{" "}
                  <strong className="text-foreground">Pre-pregrade raw</strong>{" "}
                  section below.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Sealed product
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SEALED_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={sealedKind === opt.value ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setSealedKind(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Pokémon set
          </label>
          <Select value={setId} onValueChange={(v) => setSetId(v ?? "all")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any set" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">Any set</SelectItem>
              {POKEMON_SET_ERAS.map((era) => {
                const setsInEra = POKEMON_SETS.filter((s) => s.era === era);
                if (setsInEra.length === 0) return null;
                return (
                  <SelectGroup key={era}>
                    <SelectLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {era}
                    </SelectLabel>
                    {setsInEra.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">
            Find underpriced slabs (and sealed)
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Defaults to <strong className="text-foreground">graded slabs</strong>
            : we compare each listing to market guides for that slab grade. Switch
            to raw for ungraded deal hunting without AI grading. Sealed uses
            factory-sealed product filters.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="e.g. Charizard ex or Surging Sparks booster box"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              size="lg"
            >
              {isSearching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Find Deals
            </Button>
          </div>
        </div>

        {isSearching && (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Scanning eBay and checking market prices…
            </p>
          </div>
        )}

        {!isSearching && hasSearched && results && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Blended market (median of listings)
                  </p>
                  <p className="text-2xl font-bold">
                    {results.blendedPriceCents > 0
                      ? formatCents(results.blendedPriceCents)
                      : "N/A"}
                  </p>
                  <p className="mt-1 max-w-md text-[11px] text-muted-foreground">
                    Median of each listing&apos;s reference (Collectr-style guide
                    when bridge or Apify actor is set—otherwise mean of eBay
                    last-five sold + catalog).
                    eBay sold is not mixed into Collectr (sold averages skew high).
                    Each row uses its own comps; this headline is a rough center of
                    the result set.{" "}
                    <Link
                      href="/pricing-pipeline"
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      Pricing pipeline (diagram)
                    </Link>
                    .
                  </p>
                </div>
                <div className="h-10 w-px bg-border" />
                <PricePill
                  label="Collectr median (collectr.com)"
                  value={results.marketPrices.collectr}
                />
                <PricePill
                  label="eBay last-5 median"
                  value={results.marketPrices.ebay_sold_avg}
                />
                {results.marketPrices.tcg_collector != null ? (
                  <PricePill
                    label="TCG Collector median"
                    value={results.marketPrices.tcg_collector}
                  />
                ) : null}
                <div className="ml-auto flex flex-col items-end gap-1 text-sm text-muted-foreground">
                  <span>{results.totalListings} listings found</span>
                  {results.ebaySoldSampleSize != null ? (
                    <span className="text-[11px]">
                      eBay sold sample: {results.ebaySoldSampleSize} listing
                      {results.ebaySoldSampleSize !== 1 ? "s" : ""} (capped at 5;
                      used in reference only if Collectr-style guide is not set)
                    </span>
                  ) : null}
                  {dealsAboveThreshold && dealsAboveThreshold.length > 0 && (
                    <Badge className="bg-green-600 text-white">
                      <TrendingDown className="mr-1 h-3 w-3" />
                      {dealsAboveThreshold.length} deal
                      {dealsAboveThreshold.length !== 1 ? "s" : ""} found
                    </Badge>
                  )}
                </div>
              </div>
              {results.disclaimer ? (
                <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                  {results.disclaimer}
                </p>
              ) : null}
            </div>

            {results.deals.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  {results.message ?? "No listings found for this card."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {results.deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </div>
        )}

        {!isSearching && hasSearched && !results && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              Search failed. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PricePill({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">
        {value ? formatCents(value) : "N/A"}
      </span>
    </div>
  );
}
