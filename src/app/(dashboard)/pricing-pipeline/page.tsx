import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileCode2 } from "lucide-react";
import { PricingPipelineMermaid } from "@/components/pricing-pipeline-mermaid";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  PRICING_CAVEATS,
  PRICING_PIPELINE_DOC_VERSION,
  PRICING_PIPELINE_INTRO,
  PRICING_PIPELINE_MERMAID,
  PRICING_PIPELINE_PHASES,
  PRICING_PIPELINE_TITLE,
  PRICING_SOURCES_TABLE,
} from "@/lib/finder/pricing-pipeline-doc";

export const metadata: Metadata = {
  title: "Pricing pipeline | PokeDeal",
  description:
    "How the instant finder builds reference prices from eBay sold, Collectr, and catalog data.",
};

export default function PricingPipelinePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-16">
      <div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to deals
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{PRICING_PIPELINE_TITLE}</h1>
          <Badge variant="secondary" className="font-mono text-xs">
            Doc v{PRICING_PIPELINE_DOC_VERSION}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is generated from{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            src/lib/finder/pricing-pipeline-doc.ts
          </code>
          . Update that file whenever pricing logic changes so this doc stays accurate.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Overview</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          {PRICING_PIPELINE_INTRO.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Flow diagram</h2>
        <PricingPipelineMermaid chart={PRICING_PIPELINE_MERMAID} />
        <details className="rounded-md border bg-muted/20 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">
            Mermaid source (copy to mermaid.live)
          </summary>
          <pre className="mt-3 max-h-48 overflow-auto rounded bg-muted p-3 font-mono text-xs leading-relaxed">
            {PRICING_PIPELINE_MERMAID.trim()}
          </pre>
        </details>
      </section>

      <Separator />

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Pipeline phases</h2>
        <ol className="space-y-6">
          {PRICING_PIPELINE_PHASES.map((phase) => (
            <li key={phase.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="font-semibold text-foreground">{phase.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{phase.summary}</p>
              <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
                {phase.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {phase.codeRefs.map((ref) => (
                  <span
                    key={ref.path + ref.label}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-mono">{ref.path}</span>
                    <span className="text-foreground/70">· {ref.label}</span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Data sources (legs of the blend)</h2>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {PRICING_SOURCES_TABLE.map((row) => (
                <tr key={row.source} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.source}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.role}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Caveats</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          {PRICING_CAVEATS.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
