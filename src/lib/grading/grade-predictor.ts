import {
  getCenteringGrade,
  getConditionGradeRange,
  type CenteringMeasurement,
} from "./psa-standards";

export interface GradePredictionInput {
  centering?: CenteringMeasurement;
  centeringConfidence?: "high" | "medium" | "low";
  condition: string;
  aiGrade?: number;
  aiConfidence?: "high" | "medium" | "low";
}

export interface PredictedGrade {
  grade: number;
  centering: {
    frontLR: string;
    frontTB: string;
  };
  confidence: "high" | "medium" | "low";
  source: "ai" | "canvas" | "condition";
}

/**
 * Combine centering analysis, listing condition, and optional AI vision data
 * into a single predicted PSA grade.
 *
 * Priority:
 * 1. AI vision result (if available and confident)
 * 2. Canvas centering + condition blend
 * 3. Condition-only fallback
 */
export function predictGrade(input: GradePredictionInput): PredictedGrade {
  const conditionRange = getConditionGradeRange(input.condition);

  // AI vision result takes priority when available
  if (input.aiGrade != null && input.aiConfidence !== "low") {
    const clampedGrade = clampToHalf(
      Math.max(conditionRange.min, Math.min(conditionRange.max, input.aiGrade))
    );

    return {
      grade: clampedGrade,
      centering: {
        frontLR: input.centering
          ? formatWider(input.centering.frontLR)
          : "N/A",
        frontTB: input.centering
          ? formatWider(input.centering.frontTB)
          : "N/A",
      },
      confidence: input.aiConfidence ?? "medium",
      source: "ai",
    };
  }

  // Canvas centering result
  if (input.centering && input.centeringConfidence !== "low") {
    const centeringGrade = getCenteringGrade(input.centering);

    // The final grade is capped by both centering and condition.
    // Centering can only lower the grade, not raise it above what condition allows.
    const cappedByCondition = Math.min(centeringGrade, conditionRange.max);
    const floored = Math.max(cappedByCondition, conditionRange.min);

    // If centering is great but condition is just "NM", split the difference
    // toward the condition typical rather than always maxing out
    const blended =
      centeringGrade >= conditionRange.max
        ? conditionRange.max
        : centeringGrade >= conditionRange.typical
          ? (centeringGrade + conditionRange.typical) / 2
          : centeringGrade;

    const finalGrade = clampToHalf(
      Math.max(conditionRange.min, Math.min(floored, blended))
    );

    return {
      grade: finalGrade,
      centering: {
        frontLR: formatWider(input.centering.frontLR),
        frontTB: formatWider(input.centering.frontTB),
      },
      confidence: input.centeringConfidence ?? "medium",
      source: "canvas",
    };
  }

  // Condition-only fallback
  return {
    grade: conditionRange.typical,
    centering: { frontLR: "N/A", frontTB: "N/A" },
    confidence: "low",
    source: "condition",
  };
}

/**
 * Clamp a grade to the nearest PSA half-point increment (1, 1.5, 2, ... 9, 9.5, 10).
 */
function clampToHalf(grade: number): number {
  return Math.round(grade * 2) / 2;
}

function formatWider(widerPct: number): string {
  const rounded = Math.round(widerPct);
  return `${rounded}/${100 - rounded}`;
}
