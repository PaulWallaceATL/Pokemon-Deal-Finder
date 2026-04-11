"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sidebar, type SidebarFilters } from "@/components/sidebar";
import { DealCard } from "@/components/deal-card";
import type { Deal } from "@/lib/deals/types";
import { dealRowToUI } from "@/lib/deals/types";

type SortOption = "discount-desc" | "price-asc" | "price-desc" | "recent";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "discount-desc", label: "Biggest Discount" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "recent", label: "Most Recent" },
];

function sortToParams(sort: SortOption): { sortBy: string; sortDir: string } {
  switch (sort) {
    case "discount-desc":
      return { sortBy: "discount_pct", sortDir: "desc" };
    case "price-asc":
      return { sortBy: "ebay_price_cents", sortDir: "asc" };
    case "price-desc":
      return { sortBy: "ebay_price_cents", sortDir: "desc" };
    case "recent":
      return { sortBy: "found_at", sortDir: "desc" };
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
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const { sortBy, sortDir } = sortToParams(sort);
      const params = new URLSearchParams({
        sortBy,
        sortDir,
        limit: "50",
      });

      if (search) params.set("search", search);
      if (filters.productType !== "all")
        params.set("productType", filters.productType);
      if (filters.set !== "all") params.set("set", filters.set);
      if (filters.minDiscount) params.set("minDiscount", filters.minDiscount);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);

      const res = await fetch(`/api/deals?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch deals");

      const data = await res.json();
      setDeals((data.deals ?? []).map(dealRowToUI));
    } catch (err) {
      console.error("Failed to load deals:", err);
      setDeals([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, sort, filters]);

  useEffect(() => {
    const timer = setTimeout(fetchDeals, 300);
    return () => clearTimeout(timer);
  }, [fetchDeals]);

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
              {deals.length} deal{deals.length !== 1 && "s"}
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

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : deals.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              No deals match your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
