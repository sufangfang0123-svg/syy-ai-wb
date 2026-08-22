export const FEEDBACK_HEADERS = [
  "channel", "content_asset_id", "window_start", "window_end", "source",
  "impressions", "clicks", "interactions", "saves", "add_to_cart", "conversions",
  "metric_definition", "owner", "data_nature",
] as const;

export type FeedbackPreflight = { ok: boolean; errors: string[]; rowCount: number };

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

export function preflightFeedbackCsv(text: string): FeedbackPreflight {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { ok: false, errors: ["CSV至少需要表头和一条数据"], rowCount: 0 };
  const headers = parseCsvLine(lines[0]);
  const errors = FEEDBACK_HEADERS.filter((header) => !headers.includes(header)).map((header) => `缺少字段：${header}`);
  const index = Object.fromEntries(headers.map((header, position) => [header, position])) as Record<string, number>;
  const numeric = ["impressions", "clicks", "interactions", "saves", "add_to_cart", "conversions"];
  lines.slice(1).forEach((line, rowIndex) => {
    const row = parseCsvLine(line);
    const lineNumber = rowIndex + 2;
    for (const field of numeric) {
      if (!(field in index)) continue;
      const value = Number(row[index[field]]);
      if (!Number.isFinite(value) || value < 0) errors.push(`第${lineNumber}行 ${field} 必须是非负数`);
    }
    if ("impressions" in index && "clicks" in index && Number(row[index.clicks]) > Number(row[index.impressions])) errors.push(`第${lineNumber}行 clicks 不能大于 impressions`);
    if ("conversions" in index && "clicks" in index && Number(row[index.conversions]) > Number(row[index.clicks])) errors.push(`第${lineNumber}行 conversions 不能大于 clicks`);
    for (const field of ["content_asset_id", "window_start", "window_end", "source", "metric_definition", "owner", "data_nature"]) {
      if (field in index && !row[index[field]]?.trim()) errors.push(`第${lineNumber}行 ${field} 不能为空`);
    }
  });
  return { ok: errors.length === 0, errors: [...new Set(errors)], rowCount: lines.length - 1 };
}

export function scenarioPriorityLabel(priority: number | null, missingInputs: string[]): string {
  return priority === null ? `未评分 · 缺失 ${missingInputs.length} 项输入` : `待验证优先级 ${priority}`;
}

export function preflightContentClaims(body: string, prohibitedTerms: string[], evidenceIds: string[]): string[] {
  const findings: string[] = [];
  for (const term of prohibitedTerms) if (body.includes(term)) findings.push(`命中禁用表达：${term}`);
  if (/(100%|绝对|永久|零风险|第一|最强)/i.test(body)) findings.push("命中绝对化表达");
  if (evidenceIds.length === 0 && /(全棉|功效|检测|提升|降低|改善)/.test(body)) findings.push("声明缺少Evidence引用");
  return findings;
}

export function canReviewProposal(status: string, isStale: boolean): boolean {
  return status === "proposed" && !isStale;
}

export function categoryPackSelection(categoryPackId: string, actor: string, revision: number) {
  return { category_pack_id: categoryPackId, actor, revision };
}

export function feedbackChangeProposal(targetEntityId: string, feedbackId: string) {
  return {
    target_entity_type: "product_concept",
    target_entity_id: targetEntityId,
    feedback_ids: [feedbackId],
    proposed_patch: { need: "根据人工复核反馈，下一轮优先验证规格理解" },
    rationale: "负责人基于已导入反馈提出；尚未接受",
    contrary_evidence: [],
    actor: "负责人（人工自述）",
    data_nature: "real_entry",
  };
}
