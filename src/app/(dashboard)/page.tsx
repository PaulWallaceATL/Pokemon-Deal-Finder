import { DealSearch } from "@/components/deal-search";

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PokeDeal</h1>
        <p className="text-muted-foreground">
          Find underpriced Pok&eacute;mon cards on eBay, compared against
          market averages.
        </p>
      </div>

      <DealSearch />
    </div>
  );
}
