import { EVIDENCE_LEVELS } from "@/domain/constants";
import {
  Evidence,
  FitnessDimensions,
  FitnessDimensionKey,
  FitnessScore,
  GateDecision,
} from "@/domain/types";

const weights: Record<FitnessDimensionKey, number> = {
  demand: 0.2,
  pain: 0.15,
  brand: 0.15,
  differentiation: 0.1,
  communication: 0.1,
  supply: 0.1,
  commercial: 0.1,
  compliance: 0.1,
};

export function calculateRawFitness(dimensions: FitnessDimensions): number {
  return Math.round(
    (Object.keys(weights) as FitnessDimensionKey[]).reduce(
      (sum, key) => sum + dimensions[key] * weights[key],
      0
    )
  );
}

export function calculateEvidenceFactor(evidence: Evidence[], coverage: number): number {
  if (evidence.length === 0) return 0.25;
  const average = evidence.reduce(
    (sum, item) => sum + EVIDENCE_LEVELS[item.level].coefficient,
    0
  ) / evidence.length;
  const freshness = evidence.some((item) => item.date >= "2026-08-01") ? 1 : 0.9;
  return Math.min(1, Number((average * 0.7 + (coverage / 100) * 0.3 * freshness).toFixed(2)));
}

export function calculateFitness(
  dimensions: FitnessDimensions,
  evidence: Evidence[],
  coverage: number,
  riskPenalty: number,
  gates: GateDecision[]
): FitnessScore {
  const rawFitness = calculateRawFitness(dimensions);
  const evidenceFactor = calculateEvidenceFactor(evidence, coverage);
  const hardFail = gates.some((gate) => gate.mode === "hard" && gate.status === "FAIL");
  const finalFitness = hardFail
    ? 0
    : Math.max(0, Math.round(rawFitness * evidenceFactor - riskPenalty));
  return {
    dimensions,
    rawFitness,
    evidenceFactor,
    riskPenalty,
    finalFitness,
    evidenceCoverage: coverage,
    freshness: evidence.some((item) => item.date >= "2026-08-01") ? "high" : "medium",
    evidenceIds: evidence.map((item) => item.id),
  };
}

export function applyDimensionImpacts(
  dimensions: FitnessDimensions,
  impacts: Partial<Record<FitnessDimensionKey, number>>
): FitnessDimensions {
  const next = { ...dimensions };
  (Object.keys(impacts) as FitnessDimensionKey[]).forEach((key) => {
    next[key] = Math.max(0, Math.min(100, next[key] + (impacts[key] ?? 0)));
  });
  return next;
}
