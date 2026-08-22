import { describe, expect, it } from "vitest";
import { buildExperimentScenarios, demoProductWorkbenchState } from "../../src/data/demo/product-workbench-data";

describe("product workbench fixtures", () => {
  it("builds exactly 100 deterministic, unique and deliberately unscored scenarios", () => {
    const first = buildExperimentScenarios("PC-01");
    const second = buildExperimentScenarios("PC-01");
    expect(first).toHaveLength(100);
    expect(new Set(first.map((item) => item.id)).size).toBe(100);
    expect(second).toEqual(first);
    expect(first.every((item) => item.priority === null)).toBe(true);
    expect(first.every((item) => item.rule.includes("数组位置不代表优先级"))).toBe(true);
    expect(first.every((item) => item.limitation.includes("不是消费者实验、AI排名、销量、ROI或爆款概率"))).toBe(true);
  });

  it("keeps every content and feedback record traceable to the selected concept", () => {
    const state = demoProductWorkbenchState;
    expect(state.concepts).toHaveLength(3);
    expect(state.contentAssets).toHaveLength(10);
    expect(state.contentAssets.every((item) => state.concepts.some((concept) => concept.id === item.conceptId))).toBe(true);
    expect(state.feedbackRecords.every((item) => state.contentAssets.some((asset) => asset.id === item.contentAssetId))).toBe(true);
  });
});
