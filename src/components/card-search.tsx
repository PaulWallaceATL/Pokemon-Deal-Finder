"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockSearchResults, type MockSearchResult } from "@/lib/mock-data";

interface CardSearchProps {
  onTrack: (card: MockSearchResult) => void;
  trackedIds: Set<string>;
}

export function CardSearch({ onTrack, trackedIds }: CardSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 500));

    const filtered = mockSearchResults.filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.set.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
    setIsSearching(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for a card to track (e.g. Charizard, Pikachu VMAX)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-1.5 h-4 w-4" />
          )}
          Search
        </Button>
      </div>

      {isSearching && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            No cards found for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((card) => {
            const isTracked = trackedIds.has(card.pokemonTcgId);
            return (
              <Card key={card.pokemonTcgId} className="overflow-hidden">
                <CardContent className="flex gap-3 p-3">
                  <div className="relative h-[100px] w-[72px] shrink-0 overflow-hidden rounded">
                    <Image
                      src={card.imageUrl}
                      alt={card.name}
                      fill
                      className="object-contain"
                      sizes="72px"
                      unoptimized
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="truncate font-medium text-sm">
                        {card.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {card.set} · {card.number}
                      </p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {card.rarity}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant={isTracked ? "secondary" : "default"}
                      disabled={isTracked}
                      onClick={() => onTrack(card)}
                      className="mt-2 w-full"
                    >
                      {isTracked ? (
                        "Tracked"
                      ) : (
                        <>
                          <Plus className="mr-1 h-3 w-3" />
                          Track
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
