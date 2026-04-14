/**
 * Parse eBay search-result seller line for feedback count (Browse API uses
 * seller.feedbackScore; HTML uses human-readable text).
 */

export function parseScrapedSellerFeedbackCount(sellerLine: string): number | null {
  const s = sellerLine.replace(/\s+/g, " ").trim();
  if (!s) return null;

  if (/\b0\s+feedback\b/i.test(s)) return 0;

  const paren = s.match(/\(\s*([0-9][0-9.,]*[KkMm]?)\s*\)/g);
  if (paren) {
    for (const chunk of [...paren].reverse()) {
      const inner = chunk.replace(/[()]/g, "").trim();
      const n = parseAbbreviatedNumber(inner);
      if (n != null && n > 0) return Math.floor(n);
    }
  }

  const afterPositive = s.match(
    /positive[^0-9]*([0-9][0-9.,]*[KkMm]?)\b/i
  );
  if (afterPositive) {
    const n = parseAbbreviatedNumber(afterPositive[1]);
    if (n != null && n > 0) return Math.floor(n);
  }

  return null;
}

function parseAbbreviatedNumber(raw: string): number | null {
  const t = raw.replace(/,/g, "").trim();
  if (!t) return null;
  const m = t.match(/^([0-9.]+)([KkMm])?$/);
  if (!m) return null;
  const base = parseFloat(m[1]);
  if (Number.isNaN(base)) return null;
  const suf = m[2]?.toUpperCase();
  if (suf === "K") return base * 1000;
  if (suf === "M") return base * 1_000_000;
  return base;
}
