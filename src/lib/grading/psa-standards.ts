/**
 * PSA 2026 Grading Standards
 * Source: https://www.psacard.com/gradingstandards
 *
 * Centering is expressed as the ratio of the narrower border to the wider border.
 * e.g. 55/45 means the narrower side is 45% of the total, wider is 55%.
 * The "ratio" value here is the max allowed deviation from center (wider side %).
 */

export interface CenteringThreshold {
  grade: number;
  label: string;
  frontMax: number; // max wider-side % allowed on front (e.g. 55 for PSA 10)
  backMax: number;  // max wider-side % allowed on back
}

export const PSA_CENTERING_THRESHOLDS: CenteringThreshold[] = [
  { grade: 10, label: "GEM-MT",  frontMax: 55, backMax: 75 },
  { grade: 9,  label: "MINT",    frontMax: 60, backMax: 90 },
  { grade: 8,  label: "NM-MT",   frontMax: 65, backMax: 90 },
  { grade: 7,  label: "NM",      frontMax: 70, backMax: 90 },
  { grade: 6,  label: "EX-MT",   frontMax: 80, backMax: 90 },
  { grade: 5,  label: "EX",      frontMax: 85, backMax: 90 },
  { grade: 4,  label: "VG-EX",   frontMax: 85, backMax: 90 },
  { grade: 3,  label: "VG",      frontMax: 90, backMax: 90 },
  { grade: 2,  label: "GOOD",    frontMax: 90, backMax: 90 },
];

// PSA allows a 5% leeway on front centering for grades 7+ based on eye appeal
const FRONT_LEEWAY_GRADES = new Set([7, 8, 9, 10]);
const FRONT_LEEWAY_PCT = 5;

export interface CenteringMeasurement {
  frontLR: number; // wider-side % for left-right on front (50 = perfect)
  frontTB: number; // wider-side % for top-bottom on front
  backLR?: number;
  backTB?: number;
}

/**
 * Given centering measurements, return the highest PSA grade
 * that the centering alone would allow.
 */
export function getCenteringGrade(centering: CenteringMeasurement): number {
  const frontWorst = Math.max(centering.frontLR, centering.frontTB);
  const backWorst = centering.backLR != null && centering.backTB != null
    ? Math.max(centering.backLR, centering.backTB)
    : undefined;

  for (const threshold of PSA_CENTERING_THRESHOLDS) {
    let frontLimit = threshold.frontMax;
    if (FRONT_LEEWAY_GRADES.has(threshold.grade)) {
      frontLimit += FRONT_LEEWAY_PCT;
    }

    const frontPasses = frontWorst <= frontLimit;
    const backPasses = backWorst == null || backWorst <= threshold.backMax;

    if (frontPasses && backPasses) {
      return threshold.grade;
    }
  }

  return 1;
}

/**
 * Format a wider-side percentage as the standard "X/Y" centering string.
 * e.g. 55 -> "55/45", 60 -> "60/40"
 */
export function formatCenteringRatio(widerSidePct: number): string {
  const rounded = Math.round(widerSidePct);
  return `${rounded}/${100 - rounded}`;
}

export interface ConditionGradeRange {
  min: number;
  max: number;
  typical: number;
}

export const CONDITION_GRADE_MAP: Record<string, ConditionGradeRange> = {
  "Mint":              { min: 9,   max: 10,  typical: 9.5 },
  "Pack Fresh":        { min: 9,   max: 10,  typical: 9.5 },
  "Near Mint":         { min: 7,   max: 9,   typical: 8 },
  "NM":                { min: 7,   max: 9,   typical: 8 },
  "NM/M":              { min: 8,   max: 10,  typical: 9 },
  "Near Mint/Mint":    { min: 8,   max: 10,  typical: 9 },
  "Lightly Played":    { min: 5,   max: 7,   typical: 6 },
  "LP":                { min: 5,   max: 7,   typical: 6 },
  "Moderately Played": { min: 3,   max: 5,   typical: 4 },
  "MP":                { min: 3,   max: 5,   typical: 4 },
  "Heavily Played":    { min: 1,   max: 3,   typical: 2 },
  "HP":                { min: 1,   max: 3,   typical: 2 },
  "Damaged":           { min: 1,   max: 2,   typical: 1 },
  "Not Specified":     { min: 5,   max: 9,   typical: 7 },
};

export function getConditionGradeRange(condition: string): ConditionGradeRange {
  return CONDITION_GRADE_MAP[condition] ?? { min: 5, max: 9, typical: 7 };
}

export const PSA_GRADE_LABELS: Record<number, string> = {
  10: "GEM-MT",
  9.5: "MINT+",
  9: "MINT",
  8.5: "NM-MT+",
  8: "NM-MT",
  7.5: "NM+",
  7: "NM",
  6.5: "EX-MT+",
  6: "EX-MT",
  5.5: "EX+",
  5: "EX",
  4: "VG-EX",
  3: "VG",
  2: "GOOD",
  1: "PR",
};
