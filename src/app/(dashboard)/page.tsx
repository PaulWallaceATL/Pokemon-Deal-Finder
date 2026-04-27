import { DealSearch } from "@/components/deal-search";
import { RawPregradeSearch } from "@/components/raw-pregrade-search";

export default function DealsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PokeDeal</h1>
        <p className="text-muted-foreground">
          Hunt underpriced graded slabs (and sealed) on eBay, or run a separate
          raw flow that pre-grades photos for likely PSA 10 candidates.
        </p>
      </div>

      <DealSearch />

      <div className="border-t pt-10">
        <RawPregradeSearch />
      </div>
    </div>
  );
}
