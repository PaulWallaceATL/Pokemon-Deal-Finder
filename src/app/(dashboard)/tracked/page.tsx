"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CardSearch } from "@/components/card-search";
import {
  mockTrackedCards,
  type MockTrackedCard,
  type MockSearchResult,
} from "@/lib/mock-data";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function TrackedCardsPage() {
  const [tracked, setTracked] = useState<MockTrackedCard[]>(mockTrackedCards);

  const trackedIds = new Set(tracked.map((c) => c.pokemonTcgId));

  const handleTrack = (card: MockSearchResult) => {
    const newCard: MockTrackedCard = {
      id: `tc-${Date.now()}`,
      cardName: card.name,
      cardSet: card.set,
      pokemonTcgId: card.pokemonTcgId,
      imageUrl: card.imageUrl,
      createdAt: new Date().toISOString(),
      latestPrice: null,
    };
    setTracked((prev) => [...prev, newCard]);
    toast.success(`Now tracking ${card.name}`);
  };

  const handleRemove = (id: string) => {
    const card = tracked.find((c) => c.id === id);
    setTracked((prev) => prev.filter((c) => c.id !== id));
    if (card) toast.info(`Stopped tracking ${card.cardName}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tracked Cards</h1>
        <p className="text-muted-foreground">
          Add cards to track and we&apos;ll scan eBay for deals automatically.
        </p>
      </div>

      <CardSearch onTrack={handleTrack} trackedIds={trackedIds} />

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Your Tracked Cards ({tracked.length})
        </h2>
        {tracked.length === 0 ? (
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
                    <Image
                      src={card.imageUrl}
                      alt={card.cardName}
                      fill
                      className="object-contain"
                      sizes="72px"
                      unoptimized
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="truncate font-medium text-sm">
                        {card.cardName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {card.cardSet}
                      </p>
                      {card.latestPrice && (
                        <p className="mt-1 text-sm font-semibold">
                          {formatCents(card.latestPrice)}
                        </p>
                      )}
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
