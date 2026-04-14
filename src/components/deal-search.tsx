"use client";

import { useState } from "react";
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

interface MarketPrices {
  tcgplayer: number | null;
  pricecharting_raw: number | null;
  pricecharting_graded: number | null;
  ebay_sold_avg: number | null;
  collectr: number | null;
  alt_app: number | null;
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
  disclaimer?: string;
  sealedKind?: string;
  grader?: string;
  grade?: string;
  ebaySoldSampleSize?: number;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function DealSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"raw" | "graded" | "sealed">("raw");
  const [setId, setSetId] = useState<string>("all");
  const [grader, setGrader] = useState<string>("PSA");
  const [grade, setGrade] = useState<string>("10");
  const [sealedKind, setSealedKind] = useState<string>("any");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Find Deals Instantly</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Type a card or product name. We scan eBay and Facebook, blend TCGPlayer,
          PriceCharting, eBay last-five sold averages, and optional Collectr /
          Alt bridges (configure in env) to estimate market value and surface
          listings.
        </p>
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Listing type
            </label>
            <Select
              value={category}
              onValueChange={(v) =>
                setCategory((v as "raw" | "graded" | "sealed") ?? "raw")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw">Raw cards (ungraded)</SelectItem>
                <SelectItem value="graded">Graded slabs</SelectItem>
                <SelectItem value="sealed">Sealed (tins, ETBs, boxes…)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              Set (optional)
            </label>
            <Select value={setId} onValueChange={(v) => setSetId(v ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any set" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
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
          {category === "graded" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Grading company
                </label>
                <Select value={grader} onValueChange={(v) => setGrader(v ?? "PSA")}>
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Grade
                </label>
                <Select value={grade} onValueChange={(v) => setGrade(v ?? "10")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["10", "9.5", "9", "8.5", "8", "7", "6"].map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          {category === "sealed" ? (
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Sealed product shape
              </label>
              <Select
                value={sealedKind}
                onValueChange={(v) => setSealedKind(v ?? "any")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any sealed product</SelectItem>
                  <SelectItem value="tin">Tin</SelectItem>
                  <SelectItem value="etb">Elite Trainer Box</SelectItem>
                  <SelectItem value="booster_box">Booster box</SelectItem>
                  <SelectItem value="booster_bundle">Booster bundle</SelectItem>
                  <SelectItem value="booster_pack">Booster pack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
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
            Scanning eBay &amp; checking market prices...
          </p>
        </div>
      )}

      {!isSearching && hasSearched && results && (
        <div className="space-y-4">
          {/* Market price summary */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Market Value
                </p>
                <p className="text-2xl font-bold">
                  {results.blendedPriceCents > 0
                    ? formatCents(results.blendedPriceCents)
                    : "N/A"}
                </p>
                {results.marketPrices.pricecharting_graded != null &&
                (results.category === "raw" || results.category === "graded") ? (
                  <p className="mt-1 max-w-md text-[11px] text-muted-foreground">
                    PSA-style graded guide (PriceCharting graded index):{" "}
                    <span className="font-semibold text-foreground">
                      {formatCents(results.marketPrices.pricecharting_graded)}
                    </span>
                    . Use with set filters—same card name can differ sharply by
                    printing.
                  </p>
                ) : null}
              </div>
              <div className="h-10 w-px bg-border" />
              <PricePill
                label="TCGPlayer"
                value={results.marketPrices.tcgplayer}
              />
              <PricePill
                label="PriceCharting raw"
                value={results.marketPrices.pricecharting_raw}
              />
              <PricePill
                label="eBay last 5 avg (sold)"
                value={results.marketPrices.ebay_sold_avg}
              />
              <PricePill
                label="PriceCharting graded"
                value={results.marketPrices.pricecharting_graded}
              />
              <PricePill
                label="Collectr"
                value={results.marketPrices.collectr}
              />
              <PricePill label="Alt" value={results.marketPrices.alt_app} />
              <div className="ml-auto flex flex-col items-end gap-1 text-sm text-muted-foreground">
                <span>{results.totalListings} listings found</span>
                {results.ebaySoldSampleSize != null ? (
                  <span className="text-[11px]">
                    Sold comps in blend: {results.ebaySoldSampleSize} listing
                    {results.ebaySoldSampleSize !== 1 ? "s" : ""} (capped at 5)
                  </span>
                ) : null}
                {dealsAboveThreshold && dealsAboveThreshold.length > 0 && (
                  <Badge className="bg-green-600 text-white">
                    <TrendingDown className="mr-1 h-3 w-3" />
                    {dealsAboveThreshold.length} deal
                    {dealsAboveThreshold.length !== 1 && "s"} found
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

          {/* Deal cards */}
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
