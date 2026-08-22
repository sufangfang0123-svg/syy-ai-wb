import { describe, expect, it } from "vitest";
import { adapterKind } from "../../src/lib/local-workbench-adapter";
import { PUBLIC_FIXTURE_STORAGE_KEY, loadPublicFixtureState, savePublicFixtureState } from "../../src/lib/public-workbench-adapter";
import { canReviewProposal, categoryPackSelection, feedbackChangeProposal, preflightContentClaims, preflightFeedbackCsv, scenarioPriorityLabel } from "../../src/lib/workbench-validation";

describe("persistent workbench boundaries", () => {
  it("routes public and local builds to different adapters", () => {
    expect(adapterKind("public_demo")).toBe("public_fixture");
    expect(adapterKind("local_integrated")).toBe("local_api");
  });

  it("uses the legacy browser key only for public fixtures", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const state = loadPublicFixtureState(storage);
    state.revision = 7;
    savePublicFixtureState(storage, state);
    expect(values.has(PUBLIC_FIXTURE_STORAGE_KEY)).toBe(true);
    expect(loadPublicFixtureState(storage).revision).toBe(7);
  });

  it("keeps category pack switching revision-aware", () => {
    expect(categoryPackSelection("woven_apparel_v1", "负责人（人工自述）", 4)).toEqual({ category_pack_id: "woven_apparel_v1", actor: "负责人（人工自述）", revision: 4 });
  });

  it("does not review stale or already reviewed AI proposals", () => {
    expect(canReviewProposal("proposed", false)).toBe(true);
    expect(canReviewProposal("accepted", false)).toBe(false);
    expect(canReviewProposal("proposed", true)).toBe(false);
  });

  it("does not invent a scenario score when inputs are missing", () => {
    expect(scenarioPriorityLabel(null, ["evidence_fit", "validation_cost"])).toBe("未评分 · 缺失 2 项输入");
    expect(scenarioPriorityLabel(68, [])).toBe("待验证优先级 68");
  });

  it("rejects malformed feedback CSV before the authoritative backend check", () => {
    const header = "channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature";
    const valid = `${header}\n小红书,ca_1,2026-08-20,2026-08-21,脱敏导入,100,20,15,8,5,2,公开指标口径,负责人,manual_import`;
    expect(preflightFeedbackCsv(valid)).toEqual({ ok: true, errors: [], rowCount: 1 });
    const invalid = `${header}\n小红书,ca_1,2026-08-20,2026-08-21,脱敏导入,10,20,15,8,5,12,公开指标口径,负责人,manual_import`;
    expect(preflightFeedbackCsv(invalid).ok).toBe(false);
    expect(preflightFeedbackCsv(invalid).errors.join(" ")).toContain("clicks 不能大于 impressions");
  });

  it("flags prohibited, absolute and unsupported content claims", () => {
    const findings = preflightContentClaims("100%全棉并永久改善体验", ["永久"], []);
    expect(findings).toContain("命中禁用表达：永久");
    expect(findings).toContain("命中绝对化表达");
    expect(findings).toContain("声明缺少Evidence引用");
  });

  it("turns feedback into a reviewable ChangeProposal payload, not a direct concept patch", () => {
    const payload = feedbackChangeProposal("concept_1", "feedback_1");
    expect(payload.target_entity_id).toBe("concept_1");
    expect(payload.feedback_ids).toEqual(["feedback_1"]);
    expect(payload.proposed_patch).toEqual({ need: "根据人工复核反馈，下一轮优先验证规格理解" });
  });
});
