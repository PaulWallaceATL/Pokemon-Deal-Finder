"use client";

import { useCallback, useEffect, useState } from "react";
import type { PredictedGradeData } from "@/lib/mock-data";

interface UseGradePredictionOptions {
  dealId: string;
  imageUrl: string;
  condition: string;
  productType: string;
  existingPrediction: PredictedGradeData | null;
  /** When true, POSTs `strict: true` to `/api/grade-predict` (harsh PSA resale-style vision + full report). */
  strictVision?: boolean;
}

interface UseGradePredictionResult {
  predictedGrade: PredictedGradeData | null;
  isLoading: boolean;
  error: string | null;
  analyze: () => void;
}

const CACHE_PREFIX = "psa-grade-";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedGrade {
  data: PredictedGradeData;
  timestamp: number;
}

function cacheKey(dealId: string, strictVision: boolean): string {
  return CACHE_PREFIX + (strictVision ? "strict-" : "") + dealId;
}

function getCached(
  dealId: string,
  strictVision: boolean
): PredictedGradeData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(dealId, strictVision));
    if (!raw) return null;
    const cached: CachedGrade = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(dealId, strictVision));
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCache(
  dealId: string,
  data: PredictedGradeData,
  strictVision: boolean
): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CachedGrade = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey(dealId, strictVision), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Hook that provides PSA grade prediction for a deal.
 *
 * If the deal already has a predicted grade (from mock data or prior scan),
 * it returns that immediately. Otherwise, it can trigger canvas-based
 * centering analysis followed by an AI vision API call.
 */
export function useGradePrediction({
  dealId,
  imageUrl,
  condition,
  productType,
  existingPrediction,
  strictVision = false,
}: UseGradePredictionOptions): UseGradePredictionResult {
  const [predictedGrade, setPredictedGrade] = useState<PredictedGradeData | null>(
    existingPrediction
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check cache on mount
  useEffect(() => {
    if (existingPrediction) return;
    if (productType !== "raw") return;

    const cached = getCached(dealId, strictVision);
    if (cached) {
      setPredictedGrade(cached);
    }
  }, [dealId, existingPrediction, productType, strictVision]);

  const analyze = useCallback(async () => {
    if (productType !== "raw") return;
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Try canvas-based centering analysis
      let canvasResult: PredictedGradeData | null = null;
      try {
        const { analyzeCentering } = await import("@/lib/grading/centering-analyzer");
        const centering = await analyzeCentering(imageUrl);

        if (centering.cardDetected && centering.confidence !== "low") {
          const { predictGrade } = await import("@/lib/grading/grade-predictor");
          const prediction = predictGrade({
            centering: {
              frontLR: centering.frontLR,
              frontTB: centering.frontTB,
            },
            centeringConfidence: centering.confidence,
            condition,
          });
          canvasResult = prediction;
        }
      } catch {
        // Canvas analysis failed, continue to AI
      }

      // Step 2: Try AI vision API for more accurate prediction
      try {
        const response = await fetch("/api/grade-predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl,
            condition,
            ...(strictVision ? { strict: true } : {}),
          }),
        });

        if (response.ok) {
          const aiResult = (await response.json()) as {
            predictedGrade: number;
            centering: { frontLR: number; frontTB: number };
            confidence: "high" | "medium" | "low";
            strict?: boolean;
            strictReport?: PredictedGradeData["strictReport"];
          };
          const aiGrade: PredictedGradeData = {
            grade: aiResult.predictedGrade,
            centering: {
              frontLR: `${Math.round(aiResult.centering.frontLR)}/${100 - Math.round(aiResult.centering.frontLR)}`,
              frontTB: `${Math.round(aiResult.centering.frontTB)}/${100 - Math.round(aiResult.centering.frontTB)}`,
            },
            confidence: aiResult.confidence,
            source: aiResult.strict ? "psa10_scan" : "ai",
            strictReport: aiResult.strictReport,
          };
          setPredictedGrade(aiGrade);
          setCache(dealId, aiGrade, strictVision);
          setIsLoading(false);
          return;
        }
      } catch {
        // AI API unavailable, fall back to canvas result
      }

      // Use canvas result if AI failed
      if (canvasResult) {
        setPredictedGrade(canvasResult);
        setCache(dealId, canvasResult, strictVision);
      } else {
        // Last resort: condition-only prediction
        const { predictGrade } = await import("@/lib/grading/grade-predictor");
        const fallback = predictGrade({ condition });
        setPredictedGrade(fallback);
        setCache(dealId, fallback, strictVision);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, [dealId, imageUrl, condition, productType, isLoading, strictVision]);

  return { predictedGrade, isLoading, error, analyze };
}
