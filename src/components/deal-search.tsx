"use client";

import { useState } from "react";
import { Search, Loader2, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DealCard } from "@/components/deal-card";
import type { Deal } from "@/lib/deals/types";

interface MarketPrices {
  tcgplayer: number | null;
  pricecharting_raw: number | null;
  pricecharting_graded: number | null;
  ebay_sold_avg: number | null;
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
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function DealSearch() {
  const [query, setQuery] = useState("");
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
      const res = await fetch(
        `/api/deals/search?q=${encodeURIComponent(q)}`
      );
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
          Type a card name and we&apos;ll scan eBay, compare against TCGPlayer,
          PriceCharting, and recent sold prices to find the best deals.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="e.g. Charizard ex Obsidian Flames"
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
              </div>
              <div className="h-10 w-px bg-border" />
              <PricePill
                label="TCGPlayer"
                value={results.marketPrices.tcgplayer}
              />
              <PricePill
                label="PC Raw"
                value={results.marketPrices.pricecharting_raw}
              />
              <PricePill
                label="eBay Sold"
                value={results.marketPrices.ebay_sold_avg}
              />
              <PricePill
                label="PC Graded"
                value={results.marketPrices.pricecharting_graded}
              />
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <span>{results.totalListings} listings found</span>
                {dealsAboveThreshold && dealsAboveThreshold.length > 0 && (
                  <Badge className="bg-green-600 text-white">
                    <TrendingDown className="mr-1 h-3 w-3" />
                    {dealsAboveThreshold.length} deal
                    {dealsAboveThreshold.length !== 1 && "s"} found
                  </Badge>
                )}
              </div>
            </div>
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
