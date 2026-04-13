"use client";

import Image from "next/image";
import { ExternalLink, TrendingDown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PRODUCT_TYPE_LABELS, type PredictedGradeData } from "@/lib/mock-data";
import type { Deal } from "@/lib/deals/types";
import { PSA_GRADE_LABELS } from "@/lib/grading/psa-standards";

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
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  // Live search results have eBay-style IDs (not DB UUIDs), link to eBay directly
  const isLiveResult = deal.id.startsWith("v1|") || deal.id.startsWith("fb-") || deal.id.startsWith("eb-");
  const detailHref = isLiveResult ? deal.ebayUrl : `/card/${deal.id}`;
  const linkTarget = isLiveResult ? "_blank" : undefined;
  const linkRel = isLiveResult ? "noopener noreferrer" : undefined;

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="flex gap-4 p-4">
        {/* Card image */}
        <a
          href={detailHref}
          target={linkTarget}
          rel={linkRel}
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
        </a>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Header: name, set info, discount badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <a
                href={detailHref}
                target={linkTarget}
                rel={linkRel}
                className="block truncate text-base font-semibold hover:underline"
              >
                {deal.cardName}
              </a>
              <p className="text-sm text-muted-foreground">
                {deal.cardSet} &middot; {deal.cardNumber}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${
                    deal.productType === "graded"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      : deal.productType !== "raw"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                        : ""
                  }`}
                >
                  {PRODUCT_TYPE_LABELS[deal.productType]}
                </Badge>
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
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              <PriceItem label="TCGPlayer" value={deal.prices.tcgplayer} />
              <PriceItem label="PC Raw" value={deal.prices.pricechartingRaw} />
              <PriceItem label="eBay Sold Avg" value={deal.prices.ebaySoldAvg} />
              <PriceItem label="PC Graded" value={deal.prices.pricechartingGraded} />
            </div>
          </div>

          {/* PSA graded prices + predicted grade */}
          {deal.psaPrices && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-muted-foreground">PSA Graded:</span>
                {deal.psaPrices.psa10 && (
                  <span className={getGradeHighlight(10, deal.predictedGrade)}>
                    <span className="font-medium text-amber-600 dark:text-amber-400">10</span>{" "}
                    {formatCents(deal.psaPrices.psa10)}
                  </span>
                )}
                {deal.psaPrices.psa9 && (
                  <span className={getGradeHighlight(9, deal.predictedGrade)}>
                    <span className="font-medium text-blue-600 dark:text-blue-400">9</span>{" "}
                    {formatCents(deal.psaPrices.psa9)}
                  </span>
                )}
                {deal.psaPrices.psa8 && (
                  <span className={getGradeHighlight(8, deal.predictedGrade)}>
                    <span className="font-medium text-muted-foreground">8</span>{" "}
                    {formatCents(deal.psaPrices.psa8)}
                  </span>
                )}
              </div>

              {deal.productType === "raw" && deal.predictedGrade && (
                <PredictedGradeBadge prediction={deal.predictedGrade} />
              )}
            </div>
          )}

          <Separator />

          {/* Footer: source badge, meta + buy button */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 ${
                  deal.listingSource === "facebook"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : ""
                }`}
              >
                {deal.listingSource === "facebook" ? "FB Marketplace" : "eBay"}
              </Badge>
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
              {deal.listingSource === "facebook" ? "View" : "Buy"}
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

function gradeColor(grade: number): string {
  if (grade >= 9) return "bg-green-600 text-white";
  if (grade >= 8) return "bg-amber-500 text-white";
  return "bg-zinc-500 text-white";
}

function confidenceLabel(confidence: "high" | "medium" | "low"): string {
  if (confidence === "high") return "High confidence";
  if (confidence === "medium") return "Medium confidence";
  return "Low confidence";
}

/**
 * Determine if a PSA price tier should be highlighted based on the predicted grade.
 * Returns a ring class if the predicted grade maps to this tier.
 */
function getGradeHighlight(
  tier: number,
  prediction: PredictedGradeData | null
): string {
  if (!prediction) return "";
  const grade = prediction.grade;
  const matchesTier =
    (tier === 10 && grade >= 9.5) ||
    (tier === 9 && grade >= 8.5 && grade < 9.5) ||
    (tier === 8 && grade >= 7.5 && grade < 8.5);
  return matchesTier
    ? "rounded px-1.5 py-0.5 ring-1 ring-green-500/50 bg-green-500/10"
    : "";
}

function PredictedGradeBadge({ prediction }: { prediction: PredictedGradeData }) {
  const gradeLabel = PSA_GRADE_LABELS[prediction.grade] ?? `PSA ${prediction.grade}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="flex cursor-default items-center gap-2 text-xs"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-violet-500" />
            <span className="font-medium text-muted-foreground">Est. Grade:</span>
            <Badge
              variant="secondary"
              className={`px-2 py-0 text-[11px] font-bold ${gradeColor(prediction.grade)}`}
            >
              {prediction.grade}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {gradeLabel}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/60">
            Centering: {prediction.centering.frontLR} LR &middot; {prediction.centering.frontTB} TB
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p className="font-semibold">PSA Grade Prediction (2026 Standards)</p>
            <p>Centering L/R: {prediction.centering.frontLR}</p>
            <p>Centering T/B: {prediction.centering.frontTB}</p>
            <p>{confidenceLabel(prediction.confidence)} &middot; Source: {prediction.source === "ai" ? "AI Vision" : prediction.source === "canvas" ? "Image Analysis" : "Condition-based"}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
