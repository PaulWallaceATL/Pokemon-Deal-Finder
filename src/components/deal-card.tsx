"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import type { MockDeal } from "@/lib/mock-data";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function computeLast5Avg(sold: MockDeal["last5Sold"]): number {
  if (sold.length === 0) return 0;
  return Math.round(sold.reduce((s, i) => s + i.priceCents, 0) / sold.length);
}

interface DealCardProps {
  deal: MockDeal;
}

export function DealCard({ deal }: DealCardProps) {
  const last5Avg = computeLast5Avg(deal.last5Sold);

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="flex gap-4 p-4">
        {/* Card image */}
        <Link
          href={`/card/${deal.id}`}
          className="relative h-[180px] w-[130px] shrink-0 overflow-hidden rounded-md"
        >
          <Image
            src={deal.imageUrl}
            alt={deal.cardName}
            fill
            className="object-contain transition-transform group-hover:scale-105"
            sizes="130px"
            unoptimized
          />
        </Link>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Header: name, set info, discount badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/card/${deal.id}`}
                className="block truncate text-base font-semibold hover:underline"
              >
                {deal.cardName}
              </Link>
              <p className="text-sm text-muted-foreground">
                {deal.cardSet} &middot; {deal.cardNumber}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {deal.cardSeries}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {deal.rarity}
                </Badge>
              </div>
            </div>
            <Badge
              variant="default"
              className="shrink-0 bg-green-600 text-white hover:bg-green-700"
            >
              <TrendingDown className="mr-1 h-3 w-3" />
              {deal.discountPct.toFixed(0)}% off
            </Badge>
          </div>

          {/* Pricing row */}
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold">
              {formatCents(deal.ebayPriceCents)}
            </span>
            <span className="text-sm text-muted-foreground line-through">
              {formatCents(deal.blendedMarketPriceCents)}
            </span>
            <span className="text-xs font-medium text-green-600">
              Save {formatCents(deal.blendedMarketPriceCents - deal.ebayPriceCents)}
            </span>
          </div>

          {/* Price comparison grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border bg-muted/40 px-3 py-2 text-xs sm:grid-cols-4">
            <PriceItem label="TCGPlayer" value={deal.prices.tcgplayer} />
            <PriceItem label="PC Raw" value={deal.prices.pricechartingRaw} />
            <PriceItem label="eBay Sold Avg" value={deal.prices.ebaySoldAvg} />
            <PriceItem label="Last 5 Avg" value={last5Avg || null} />
          </div>

          {/* PSA graded prices (if available) */}
          {deal.psaPrices && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-muted-foreground">PSA Graded:</span>
              {deal.psaPrices.psa10 && (
                <span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">10</span>{" "}
                  {formatCents(deal.psaPrices.psa10)}
                </span>
              )}
              {deal.psaPrices.psa9 && (
                <span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">9</span>{" "}
                  {formatCents(deal.psaPrices.psa9)}
                </span>
              )}
              {deal.psaPrices.psa8 && (
                <span>
                  <span className="font-medium text-muted-foreground">8</span>{" "}
                  {formatCents(deal.psaPrices.psa8)}
                </span>
              )}
            </div>
          )}

          <Separator />

          {/* Footer: meta + buy button */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>{deal.condition}</span>
              <span>&middot;</span>
              <span>{deal.sellerName}</span>
              <span>&middot;</span>
              <span>{timeAgo(deal.foundAt)}</span>
            </div>
            <a
              href={deal.ebayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm" })}
            >
              Buy
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PriceItem({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {value ? formatCents(value) : "N/A"}
      </span>
    </div>
  );
}
