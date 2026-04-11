"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CardSearch, type SearchResultCard } from "@/components/card-search";

interface TrackedCard {
  id: string;
  card_name: string;
  card_set: string | null;
  pokemon_tcg_id: string | null;
  image_url: string | null;
  created_at: string;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function TrackedCardsPage() {
  const [tracked, setTracked] = useState<TrackedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTracked = useCallback(async () => {
    try {
      const res = await fetch("/api/tracked-cards");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTracked(data.cards ?? []);
    } catch (err) {
      console.error("Failed to load tracked cards:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTracked();
  }, [fetchTracked]);

  const trackedIds = new Set(
    tracked.map((c) => c.pokemon_tcg_id).filter(Boolean) as string[]
  );

  const handleTrack = async (card: SearchResultCard) => {
    try {
      const res = await fetch("/api/tracked-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName: card.name,
          cardSet: card.set,
          pokemonTcgId: card.pokemonTcgId,
          imageUrl: card.imageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to track card");

      const data = await res.json();
      setTracked((prev) => [data.card, ...prev]);
      toast.success(`Now tracking ${card.name}`);
    } catch (err) {
      console.error("Failed to track card:", err);
      toast.error("Failed to track card");
    }
  };

  const handleRemove = async (id: string) => {
    const card = tracked.find((c) => c.id === id);
    try {
      const res = await fetch(`/api/tracked-cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");

      setTracked((prev) => prev.filter((c) => c.id !== id));
      if (card) toast.info(`Stopped tracking ${card.card_name}`);
    } catch (err) {
      console.error("Failed to remove tracked card:", err);
      toast.error("Failed to remove card");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tracked Cards</h1>
        <p className="text-muted-foreground">
          Add cards to track and we&apos;ll scan eBay &amp; Facebook Marketplace
          for deals automatically.
        </p>
      </div>

      <CardSearch onTrack={handleTrack} trackedIds={trackedIds} />

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Your Tracked Cards ({tracked.length})
        </h2>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tracked.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              No cards tracked yet. Search above to add cards.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tracked.map((card) => (
              <Card key={card.id} className="overflow-hidden">
                <CardContent className="flex gap-3 p-3">
                  <div className="relative h-[100px] w-[72px] shrink-0 overflow-hidden rounded">
                    {card.image_url ? (
                      <Image
                        src={card.image_url}
                        alt={card.card_name}
                        fill
                        className="object-contain"
                        sizes="72px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="truncate font-medium text-sm">
                        {card.card_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {card.card_set ?? "Unknown Set"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full text-destructive hover:text-destructive"
                      onClick={() => handleRemove(card.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
