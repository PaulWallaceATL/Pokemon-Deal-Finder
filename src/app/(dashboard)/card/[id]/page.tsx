"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, TrendingDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PriceChart } from "@/components/price-chart";
import {
  mockDeals,
  mockListings,
  mockPriceHistory,
} from "@/lib/mock-data";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const deal = mockDeals.find((d) => d.id === id) ?? mockDeals[0];

  const priceBreakdown = [
    { source: "TCGPlayer Market", price: deal.prices.tcgplayer },
    { source: "PriceCharting (Raw)", price: deal.prices.pricechartingRaw },
    { source: "PriceCharting (Graded)", price: deal.prices.pricechartingGraded },
    { source: "eBay Last 5 Sold Avg", price: deal.prices.ebaySoldAvg },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Deals
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Card Image */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative aspect-[2.5/3.5] w-full max-w-[280px] overflow-hidden rounded-xl border shadow-md">
            <Image
              src={deal.imageUrl}
              alt={deal.cardName}
              fill
              className="object-contain"
              sizes="280px"
              priority
              unoptimized
            />
          </div>
          <Badge
            variant="default"
            className="bg-green-600 text-white hover:bg-green-700"
          >
            <TrendingDown className="mr-1 h-3 w-3" />
            {deal.discountPct.toFixed(0)}% below market
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{deal.cardName}</h1>
            <p className="text-muted-foreground">{deal.cardSet}</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-bold">
                {formatCents(deal.ebayPriceCents)}
              </span>
              <span className="text-lg text-muted-foreground line-through">
                {formatCents(deal.blendedMarketPriceCents)}
              </span>
            </div>
          </div>

          <Separator />

          <Tabs defaultValue="prices">
            <TabsList>
              <TabsTrigger value="prices">Price Breakdown</TabsTrigger>
              <TabsTrigger value="listings">eBay Listings</TabsTrigger>
              <TabsTrigger value="history">Price History</TabsTrigger>
            </TabsList>

            <TabsContent value="prices" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Market Prices by Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {priceBreakdown.map((row) => (
                        <TableRow key={row.source}>
                          <TableCell>{row.source}</TableCell>
                          <TableCell className="text-right font-medium">
                            {row.price ? formatCents(row.price) : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell>Blended Average</TableCell>
                        <TableCell className="text-right">
                          {formatCents(deal.blendedMarketPriceCents)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="listings" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Active eBay Listings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockListings.map((listing) => (
                        <TableRow key={listing.ebayItemId}>
                          <TableCell className="max-w-[200px] truncate">
                            {listing.title}
                          </TableCell>
                          <TableCell>{listing.condition}</TableCell>
                          <TableCell>{listing.sellerName}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCents(listing.priceCents)}
                          </TableCell>
                          <TableCell>
                            <a
                              href={listing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonVariants({ variant: "ghost", size: "sm" })}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Price History (Last 6 Weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PriceChart data={mockPriceHistory} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
