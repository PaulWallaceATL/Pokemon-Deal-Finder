"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

type Props = {
  chart: string;
};

/**
 * Client-only Mermaid render for the pricing pipeline doc page.
 */
export function PricingPipelineMermaid({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    const run = async () => {
      setStatus("loading");
      setErrorMessage(null);
      el.innerHTML = "";

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: resolvedTheme === "dark" ? "dark" : "neutral",
        });
        const id = `pricing-pipeline-${Math.random().toString(36).slice(2, 11)}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled) return;
        el.innerHTML = svg;
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Could not render diagram");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme]);

  return (
    <div className="relative rounded-lg border bg-muted/30 p-4">
      <div
        ref={containerRef}
        className="flex min-h-[200px] justify-center overflow-x-auto [&_svg]:max-h-[480px] [&_svg]:max-w-full"
        aria-busy={status === "loading"}
      />
      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-muted/20">
          <span className="text-sm text-muted-foreground">Loading diagram…</span>
        </div>
      ) : null}
      {status === "error" && errorMessage ? (
        <p className="mt-2 text-center text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
