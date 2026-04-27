import {
  buildPsaStrictVisionSystem,
  CENTERING_MEW_CARDS_URL,
  clampHalfGrade,
} from "./psa-strict-grader-prompt";
import type { PsaStrictScanReport } from "@/lib/mock-data";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export type PsaStrictVisionConfidence = "high" | "medium" | "low";

export interface PsaStrictVisionJson {
  targetGrade: number;
  centering: {
    frontLR: string;
    frontTB: string;
    backLR: string;
    backTB: string;
    centeringLimitsMaxGrade: number;
    centeringLimitsNotes: string;
  };
  cornersSummary: string;
  edgesSummary: string;
  surfaceSummary: string;
  eyeAppealSummary: string;
  estimatedGradeRange: string;
  mostLikelyGrade: number;
  ceilingGrade: number;
  floorGrade: number;
  worthSubmitting: "Yes" | "No";
  worthSubmittingReason: string;
  notPsa10Explanation: string;
  /** True if the card plausibly hits the requested PSA tier (see targetGrade). */
  isTargetGradeCandidate: boolean;
  confidence: PsaStrictVisionConfidence;
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function clampGrade(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 7;
  return Math.min(10, Math.max(1, Math.round(x * 2) / 2));
}

/**
 * Runs strict PSA-style vision on a listing image URL (OpenAI).
 * `targetGrade` sets candidacy rules (10 = GEM hunt, 9 = vintage mint hunt, etc.).
 * Returns null if unconfigured or the API fails.
 */
export async function analyzePsaStrictFromImageUrl(
  imageUrl: string,
  opts?: { condition?: string; model?: string; targetGrade?: number }
): Promise<PsaStrictVisionJson | null> {
  if (!OPENAI_API_KEY) return null;

  const targetGrade = clampHalfGrade(opts?.targetGrade ?? 10);
  const condition = opts?.condition?.trim();
  const userLines = [
    `Collector PSA target for candidacy: **${targetGrade}** (half-point scale allowed). Grade against that goal.`,
    condition
      ? `Seller condition note (may be unreliable): "${condition}". Still grade strictly from the image.`
      : "Grade strictly from the image only.",
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts?.model ?? "gpt-4o",
        messages: [
          { role: "system", content: buildPsaStrictVisionSystem(targetGrade) },
          {
            role: "user",
            content: [
              { type: "text", text: userLines.join("\n") },
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            ],
          },
        ],
        max_tokens: 1800,
        temperature: 0.15,
      }),
    });

    if (!response.ok) {
      console.error("PSA strict vision HTTP", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const parsed = JSON.parse(stripJsonFences(content)) as Partial<
      PsaStrictVisionJson & { isPsa10Candidate?: boolean }
    >;
    const c = parsed.centering;
    if (!c || typeof c.frontLR !== "string" || typeof c.frontTB !== "string") {
      return null;
    }

    const conf: PsaStrictVisionConfidence =
      parsed.confidence === "high" || parsed.confidence === "low"
        ? parsed.confidence
        : "medium";

    const isTargetGradeCandidate =
      typeof parsed.isTargetGradeCandidate === "boolean"
        ? parsed.isTargetGradeCandidate
        : targetGrade === 10 && Boolean(parsed.isPsa10Candidate);

    return {
      targetGrade,
      centering: {
        frontLR: c.frontLR,
        frontTB: c.frontTB,
        backLR: typeof c.backLR === "string" ? c.backLR : "unknown",
        backTB: typeof c.backTB === "string" ? c.backTB : "unknown",
        centeringLimitsMaxGrade: clampGrade(c.centeringLimitsMaxGrade),
        centeringLimitsNotes:
          typeof c.centeringLimitsNotes === "string"
            ? c.centeringLimitsNotes
            : "",
      },
      cornersSummary: String(parsed.cornersSummary ?? ""),
      edgesSummary: String(parsed.edgesSummary ?? ""),
      surfaceSummary: String(parsed.surfaceSummary ?? ""),
      eyeAppealSummary: String(parsed.eyeAppealSummary ?? ""),
      estimatedGradeRange: String(parsed.estimatedGradeRange ?? ""),
      mostLikelyGrade: clampGrade(parsed.mostLikelyGrade),
      ceilingGrade: clampGrade(parsed.ceilingGrade),
      floorGrade: clampGrade(parsed.floorGrade),
      worthSubmitting: parsed.worthSubmitting === "No" ? "No" : "Yes",
      worthSubmittingReason: String(parsed.worthSubmittingReason ?? ""),
      notPsa10Explanation: String(parsed.notPsa10Explanation ?? ""),
      isTargetGradeCandidate,
      confidence: conf,
    };
  } catch (e) {
    console.error("PSA strict vision parse error", e);
    return null;
  }
}

export function centeringCrossCheckUrl(): string {
  return CENTERING_MEW_CARDS_URL;
}

/**
 * Parse a centering ratio like "55/45" into the wider-side percentage (55).
 * Used to populate legacy numeric centering fields for `/api/grade-predict`.
 */
export function ratioStringToWiderSidePct(ratio: string): number {
  const t = ratio.trim().toLowerCase();
  if (!t || t === "unknown" || t.includes("n/a")) return 50;
  const m = t.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!m) return 50;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 50;
  return Math.round(Math.max(a, b) * 10) / 10;
}

export function visionToStrictScanReport(
  vision: PsaStrictVisionJson
): PsaStrictScanReport {
  return {
    targetGrade: vision.targetGrade,
    estimatedGradeRange: vision.estimatedGradeRange,
    ceilingGrade: vision.ceilingGrade,
    floorGrade: vision.floorGrade,
    worthSubmitting: vision.worthSubmitting,
    worthSubmittingReason: vision.worthSubmittingReason,
    notPsa10Explanation: vision.notPsa10Explanation,
    cornersSummary: vision.cornersSummary,
    edgesSummary: vision.edgesSummary,
    surfaceSummary: vision.surfaceSummary,
    eyeAppealSummary: vision.eyeAppealSummary,
    centeringLimitsMaxGrade: vision.centering.centeringLimitsMaxGrade,
    centeringLimitsNotes: vision.centering.centeringLimitsNotes,
    backLR: vision.centering.backLR,
    backTB: vision.centering.backTB,
    centeringToolUrl: CENTERING_MEW_CARDS_URL,
  };
}
