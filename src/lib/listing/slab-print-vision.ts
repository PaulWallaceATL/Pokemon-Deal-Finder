/**
 * Reads Pokémon slab label copy from a listing photo (PSA/CGC/etc.) so print
 * type (common vs holo vs reverse) can override noisy or missing titles.
 */

import { titleLooksLikeGradedOrSlab } from "@/lib/listing/raw-comps";
import type { ListingPrintKind } from "@/lib/listing/listing-comp-query";
import type { FinderListingCategory } from "@/lib/pokemon/finder-query";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();

const SYSTEM = `You classify Pokémon TCG cards shown in marketplace listing photos.

Focus on the **graded slab label** (PSA, CGC, BGS, SGC, TAG) if visible—not the card art alone.
Use the exact wording on the label when possible:
- "Reverse Holofoil", "Reverse Holo", "Rev Holo", "R/H" → reverse_holo
- "Holofoil", "Regular Holofoil", "Holo Rare", "Holo" (rare holo, not reverse) → holo
- Label shows only set name + Pokémon name + collector number, with **no** holo/reverse line (typical common/uncommon) → non_holo
- Slab not visible, unreadable, or not Pokémon → unknown

Reply with ONLY valid JSON:
{"printKind":"reverse_holo"|"holo"|"non_holo"|"unknown","confidence":"high"|"medium"|"low"}`;

const PRINT_KINDS = new Set([
  "reverse_holo",
  "holo",
  "non_holo",
  "unknown",
]);

function isAllowedListingImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return (
      h.includes("ebayimg.com") ||
      h.includes("i.ebayimg.com") ||
      h.endsWith(".ebay.com") ||
      h.includes("facebook.com") ||
      h.includes("fbcdn.net")
    );
  } catch {
    return false;
  }
}

function normalizeVisionKind(v: unknown): ListingPrintKind | null {
  if (typeof v !== "string") return null;
  const k = v.trim().toLowerCase().replace(/-/g, "_") as ListingPrintKind;
  return PRINT_KINDS.has(k) ? k : null;
}

/**
 * When the model is confident, returns a print kind to **override** title parsing.
 * Returns null when the key is missing, the URL is not allowed, the call fails,
 * or the model returns unknown / invalid JSON.
 */
export async function inferPrintKindFromSlabImage(
  imageUrl: string
): Promise<ListingPrintKind | null> {
  if (!OPENAI_API_KEY) return null;
  const trimmed = imageUrl?.trim();
  if (!trimmed || !isAllowedListingImageUrl(trimmed)) return null;

  const model =
    process.env.SLAB_PRINT_VISION_MODEL?.trim() || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What print type does the slab label indicate? JSON only.",
              },
              {
                type: "image_url",
                image_url: { url: trimmed, detail: "high" },
              },
            ],
          },
        ],
        max_tokens: 120,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(22_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const jsonStr = content
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr) as { printKind?: unknown };
    const kind = normalizeVisionKind(parsed.printKind);
    if (!kind || kind === "unknown") return null;
    return kind;
  } catch {
    return null;
  }
}

export function slabPrintVisionEnabled(): boolean {
  if (process.env.SLAB_PRINT_VISION === "false") return false;
  return Boolean(OPENAI_API_KEY);
}

export function maxSlabPrintVisionCalls(): number {
  const raw = process.env.SLAB_PRINT_VISION_MAX?.trim();
  const n = raw ? parseInt(raw, 10) : 18;
  if (!Number.isFinite(n) || n < 0) return 18;
  return Math.min(40, n);
}

/**
 * Vision classify slab photos for the first N eligible listings (graded mode
 * or title looks slabbed). Results keyed by listing `id` for comp routing.
 */
export async function attachSlabPrintKindByListingId(args: {
  listings: { id: string; title: string; imageUrl: string }[];
  category: FinderListingCategory;
}): Promise<Map<string, ListingPrintKind>> {
  const out = new Map<string, ListingPrintKind>();
  if (!slabPrintVisionEnabled() || args.category === "sealed") return out;

  const max = maxSlabPrintVisionCalls();
  const urlCache = new Map<string, ListingPrintKind | null>();

  const eligible = args.listings
    .filter((l) => {
      if (!l.imageUrl?.trim()) return false;
      if (args.category === "graded") return true;
      return titleLooksLikeGradedOrSlab(l.title);
    })
    .slice(0, max);

  const runOne = async (l: (typeof eligible)[0]) => {
    const u = l.imageUrl.trim();
    let kind: ListingPrintKind | null;
    if (urlCache.has(u)) kind = urlCache.get(u)!;
    else {
      kind = await inferPrintKindFromSlabImage(u);
      urlCache.set(u, kind);
    }
    if (kind != null) out.set(l.id, kind);
  };

  const chunk = 4;
  for (let i = 0; i < eligible.length; i += chunk) {
    await Promise.all(eligible.slice(i, i + chunk).map(runOne));
  }
  return out;
}
