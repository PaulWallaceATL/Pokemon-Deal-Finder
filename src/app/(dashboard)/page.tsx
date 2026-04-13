import { DealSearch } from "@/components/deal-search";
import { DealFeed } from "@/components/deal-feed";
import { Separator } from "@/components/ui/separator";

export default function DealsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PokeDeal</h1>
        <p className="text-muted-foreground">
          Find underpriced Pok&eacute;mon cards on eBay, compared against
          market averages.
        </p>
      </div>

      <DealSearch />

      <Separator />

      <div>
        <h2 className="mb-2 text-lg font-semibold">Recent Deals</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Deals found from your tracked cards.
        </p>
        <DealFeed />
      </div>
    </div>
  );
}
