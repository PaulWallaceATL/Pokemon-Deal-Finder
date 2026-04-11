"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface DealCardProps {
  deal: MockDeal;
}

export function DealCard({ deal }: DealCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="flex gap-4 p-4">
        <Link
          href={`/card/${deal.id}`}
          className="relative h-[140px] w-[100px] shrink-0 overflow-hidden rounded-md"
        >
          <Image
            src={deal.imageUrl}
            alt={deal.cardName}
            fill
            className="object-contain transition-transform group-hover:scale-105"
            sizes="100px"
            unoptimized
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/card/${deal.id}`}
                  className="block truncate font-semibold hover:underline"
                >
                  {deal.cardName}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {deal.cardSet}
                </p>
              </div>
              <Badge
                variant="default"
                className="shrink-0 bg-green-600 text-white hover:bg-green-700"
              >
                <TrendingDown className="mr-1 h-3 w-3" />
                {deal.discountPct.toFixed(0)}% off
              </Badge>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-lg font-bold">
                {formatCents(deal.ebayPriceCents)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {formatCents(deal.blendedMarketPriceCents)}
              </span>
              <span className="text-xs text-green-600">
                Save {formatCents(deal.blendedMarketPriceCents - deal.ebayPriceCents)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{deal.condition}</span>
              <span>·</span>
              <span>{deal.sellerName}</span>
              <span>·</span>
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
