import { GateDecision, GateStatus } from "@/domain/types";

const sequence: GateStatus[] = ["PASS", "WARNING", "FAIL"];

export function nextGateStatus(status: GateStatus): GateStatus {
  return sequence[(sequence.indexOf(status) + 1) % sequence.length];
}

export function resolveProductStatus(gates: GateDecision[]): "survivor" | "testing" | "eliminated" {
  if (gates.some((gate) => gate.mode === "hard" && gate.status === "FAIL")) return "eliminated";
  if (gates.some((gate) => gate.status !== "PASS")) return "testing";
  return "survivor";
}
