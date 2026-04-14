/**
 * Keep US/English marketplace comps separate from Japanese imports so
 * PSA English guides are not averaged with JP listings.
 */

const ENGLISH_MARKERS =
  /\b(english\s+version|english\s+edition|english\s+card|us\s+version|north\s+american|na\s+version|english\s+only)\b/i;

const JAPANESE_MARKERS =
  /\b(japanese|japan\s+import|japan\s+version|jpn\b|jp\s+import|asian\s+import|korean\s+version|chinese\s+version)\b/i;

/** Hiragana, Katakana, CJK — common on JP listing titles. */
const CJK_RE = /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/;

/**
 * True when the listing title suggests a Japanese (or non-English-primary)
 * product we should not mix with English PSA comps.
 */
export function titleLooksJapaneseImport(title: string): boolean {
  if (ENGLISH_MARKERS.test(title)) return false;
  if (JAPANESE_MARKERS.test(title)) return true;
  if (CJK_RE.test(title)) return true;
  return false;
}
