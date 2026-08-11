import { DecisionEngineState, NextBestTest } from "@/domain/decision-types";

export interface StatusCounts {
  proposed: number;
  running: number;
  completed: number;
}

const countTests = (tests: NextBestTest[]): StatusCounts => ({
  proposed: tests.filter((test) => test.status === "proposed").length,
  running: tests.filter((test) => test.status === "running").length,
  completed: tests.filter((test) => test.status === "completed").length,
});

export function getValidationLedger(state: DecisionEngineState) {
  return {
    digital: countTests(state.tests.filter((test) => test.isDigital)),
    human: countTests(state.tests.filter((test) => !test.isDigital)),
    sampleCompleted: state.results.filter((result) => result.type === "sample").length,
    salesCompleted: state.results.filter((result) => result.type === "sales").length,
    humanFeedbackCompleted: state.results.filter((result) => result.type === "human").length,
  };
}

export function formatStatusCounts(counts: StatusCounts) {
  return `待执行 ${counts.proposed}｜进行中 ${counts.running}｜已完成 ${counts.completed}`;
}
