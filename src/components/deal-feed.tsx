"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sidebar, SEALED_TYPES, type SidebarFilters } from "@/components/sidebar";
import { DealCard } from "@/components/deal-card";
import { mockDeals, type MockDeal } from "@/lib/mock-data";

type SortOption = "discount-desc" | "price-asc" | "price-desc" | "recent";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "discount-desc", label: "Biggest Discount" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "recent", label: "Most Recent" },
];

function sortDeals(deals: MockDeal[], sort: SortOption): MockDeal[] {
  const sorted = [...deals];
  switch (sort) {
    case "discount-desc":
      return sorted.sort((a, b) => b.discountPct - a.discountPct);
    case "price-asc":
      return sorted.sort((a, b) => a.ebayPriceCents - b.ebayPriceCents);
    case "price-desc":
      return sorted.sort((a, b) => b.ebayPriceCents - a.ebayPriceCents);
    case "recent":
      return sorted.sort(
        (a, b) => new Date(b.foundAt).getTime() - new Date(a.foundAt).getTime()
      );
  }
}

export function DealFeed() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("discount-desc");
  const [filters, setFilters] = useState<SidebarFilters>({
    set: "all",
    productType: "all",
    minDiscount: "",
    maxPrice: "",
    minPrice: "",
  });

  const filteredDeals = useMemo(() => {
    let deals = mockDeals.filter((d) => d.isActive);

    if (search) {
      const q = search.toLowerCase();
      deals = deals.filter(
        (d) =>
          d.cardName.toLowerCase().includes(q) ||
          d.cardSet.toLowerCase().includes(q)
      );
    }

    if (filters.productType !== "all") {
      if (filters.productType === "sealed") {
        deals = deals.filter((d) => SEALED_TYPES.has(d.productType));
      } else {
        deals = deals.filter((d) => d.productType === filters.productType);
      }
    }

    if (filters.set !== "all") {
      deals = deals.filter(
        (d) =>
          d.pokemonTcgId.startsWith(filters.set) ||
          d.cardSet.toLowerCase().includes(filters.set.toLowerCase())
      );
    }

    if (filters.minDiscount) {
      const min = parseFloat(filters.minDiscount);
      if (!isNaN(min)) deals = deals.filter((d) => d.discountPct >= min);
    }

    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice) * 100;
      if (!isNaN(min)) deals = deals.filter((d) => d.ebayPriceCents >= min);
    }

    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice) * 100;
      if (!isNaN(max)) deals = deals.filter((d) => d.ebayPriceCents <= max);
    }

    return sortDeals(deals, sort);
  }, [search, sort, filters]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Sidebar filters={filters} onFilterChange={setFilters} />

      <div className="flex-1 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {filteredDeals.length} deal{filteredDeals.length !== 1 && "s"}
            </span>
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as SortOption)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredDeals.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              No deals match your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
