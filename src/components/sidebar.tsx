"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const POKEMON_SETS = [
  { value: "all", label: "All Sets" },
  { value: "sv8", label: "Surging Sparks" },
  { value: "sv7", label: "Stellar Crown" },
  { value: "sv6", label: "Twilight Masquerade" },
  { value: "sv5", label: "Temporal Forces" },
  { value: "sv4", label: "Paradox Rift" },
  { value: "sv3", label: "Obsidian Flames" },
  { value: "swsh12pt5", label: "Crown Zenith" },
  { value: "cel25", label: "Celebrations" },
];

interface SidebarFilters {
  set: string;
  minDiscount: string;
  maxPrice: string;
  minPrice: string;
}

interface SidebarProps {
  filters: SidebarFilters;
  onFilterChange: (filters: SidebarFilters) => void;
}

export function Sidebar({ filters, onFilterChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof SidebarFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <SlidersHorizontal className="mr-1.5 h-4 w-4" />
        Filters
      </Button>

      <aside
        className={`${
          isOpen ? "block" : "hidden"
        } w-full shrink-0 space-y-6 lg:block lg:w-60`}
      >
        <div>
          <h3 className="mb-2 text-sm font-semibold">Card Set</h3>
          <Select
            value={filters.set}
            onValueChange={(v) => updateFilter("set", v ?? "all")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select set" />
            </SelectTrigger>
            <SelectContent>
              {POKEMON_SETS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-semibold">Min Discount %</h3>
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="e.g. 15"
            value={filters.minDiscount}
            onChange={(e) => updateFilter("minDiscount", e.target.value)}
          />
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-semibold">Price Range</h3>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Min $"
              value={filters.minPrice}
              onChange={(e) => updateFilter("minPrice", e.target.value)}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              min={0}
              placeholder="Max $"
              value={filters.maxPrice}
              onChange={(e) => updateFilter("maxPrice", e.target.value)}
            />
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() =>
            onFilterChange({
              set: "all",
              minDiscount: "",
              maxPrice: "",
              minPrice: "",
            })
          }
        >
          Reset Filters
        </Button>
      </aside>
    </>
  );
}
