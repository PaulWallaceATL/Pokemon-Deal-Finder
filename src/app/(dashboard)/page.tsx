import { DealFeed } from "@/components/deal-feed";

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deal Feed</h1>
        <p className="text-muted-foreground">
          Underpriced Pokémon cards found on eBay, compared against market
          averages.
        </p>
      </div>
      <DealFeed />
    </div>
  );
}
