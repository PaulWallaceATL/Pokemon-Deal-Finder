"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, TrendingDown, Sparkles } from "lucide-react";
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
  disclaimer?: string;
  finish?: string;
  ebaySoldSampleSize?: number;
  psa10Scan?: {
    mode: "psa10_strict";
    applicable: boolean;
    scanLimit: number;
    scanned: number;
    matched: number;
    centeringToolUrl: string;
    message?: string;
  };
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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

const SCAN_COUNTS = [4, 6, 8, 10, 12, 16, 20, 24] as const;

/**
 * Separate from slab deal hunt: raw eBay listings priced as deals, then strict
 * PSA-style vision to surface likely PSA 10 submission candidates.
 */
export function RawPregradeSearch() {
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState<string>("all");
  const [finish, setFinish] = useState<CardFinishFilter>("any");
  const [psa10ScanCount, setPsa10ScanCount] = useState(10);
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
      const params = new URLSearchParams({ q, category: "raw" });
      if (setId && setId !== "all") params.set("setId", setId);
      if (finish !== "any") params.set("finish", finish);
      const n = Math.min(24, Math.max(1, psa10ScanCount));
      params.set("psa10Scan", String(n));

      const res = await fetch(`/api/deals/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResponse = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Raw pre-grade search failed:", err);
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
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">Raw pre-grade</h3>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          This is not the slab deal finder. We pull{" "}
          <strong className="text-foreground">raw</strong> listings, keep
          deal-priced rows, then run harsh PSA vision and only show listings
          flagged as PSA 10 candidates. Paste photos into{" "}
          <a
            href="https://centering.mew.cards/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            mew centering
          </a>{" "}
          for a second read. Needs{" "}
          <code className="rounded bg-muted px-0.5">OPENAI_API_KEY</code>.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Printing / finish
          </label>
          <Select
            value={finish}
            onValueChange={(v) => setFinish((v as CardFinishFilter) ?? "any")}
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
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Listings to scan (after deals)
          </label>
          <Select
            value={String(psa10ScanCount)}
            onValueChange={(v) => setPsa10ScanCount(Number(v) || 10)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCAN_COUNTS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
            Pre-pregrade raw finds
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Cheap raw listings first, then AI pretends it is PSA (strict, not
            generous). You still need real photos and your own eyes before
            submitting anything.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="e.g. Pikachu Illustration Rare 151"
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
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Run pre-grade
            </Button>
          </div>
        </div>

        {isSearching && (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Pricing raw deals, then strict PSA vision…
            </p>
          </div>
        )}

        {!isSearching && hasSearched && results && (
          <div className="space-y-4">
            {results.psa10Scan ? (
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  results.psa10Scan.applicable
                    ? "border-violet-500/35 bg-violet-500/[0.06]"
                    : "border-amber-500/40 bg-amber-500/[0.06]"
                )}
              >
                <p className="font-medium text-foreground">PSA 10 candidate scan</p>
                {results.psa10Scan.applicable ? (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Scanned {results.psa10Scan.scanned} deal-priced listing
                      {results.psa10Scan.scanned !== 1 ? "s" : ""} (limit{" "}
                      {results.psa10Scan.scanLimit}). Kept{" "}
                      <span className="font-semibold text-foreground">
                        {results.psa10Scan.matched}
                      </span>{" "}
                      as strict PSA 10 candidates. Cross-check on{" "}
                      <a
                        href={results.psa10Scan.centeringToolUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        mew centering
                      </a>
                      .
                    </p>
                    {results.psa10Scan.message ? (
                      <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                        {results.psa10Scan.message}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {results.psa10Scan.message ??
                      "Set OPENAI_API_KEY on the server to enable vision."}
                  </p>
                )}
              </div>
            ) : null}

            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Blended market (median)
                  </p>
                  <p className="text-2xl font-bold">
                    {results.blendedPriceCents > 0
                      ? formatCents(results.blendedPriceCents)
                      : "N/A"}
                  </p>
                  <p className="mt-1 max-w-md text-[11px] text-muted-foreground">
                    Same pricing pipeline as the slab finder.{" "}
                    <Link
                      href="/pricing-pipeline"
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      How pricing works
                    </Link>
                    .
                  </p>
                </div>
                <div className="h-10 w-px bg-border" />
                <PricePill
                  label="Collectr median"
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
                  <span>{results.totalListings} raw listings matched</span>
                  {dealsAboveThreshold && dealsAboveThreshold.length > 0 ? (
                    <Badge className="bg-green-600 text-white">
                      <TrendingDown className="mr-1 h-3 w-3" />
                      {dealsAboveThreshold.length} at ≥10% off ref.
                    </Badge>
                  ) : null}
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
                  {results.message ?? "No PSA 10 candidates or no deals."}
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
