"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleHelp, RotateCcw, Trash2, X } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";

const steps = [
  { title: "创建新品决策项目", body: "先写清楚准备做什么、面向谁、处于哪个阶段，以及下一笔钱准备花在哪里。", route: "/workspace", target: "project" },
  { title: "导入现有证据", body: "记录来源、时间、样本、证据等级、适用范围和限制；公开讨论不能冒充购买行为。", route: "/evidence", target: "evidence" },
  { title: "识别关键风险", body: "系统按错误代价和证据缺口排序，明确哪些结论目前不足以判断。", route: "/assumptions", target: "assumption" },
  { title: "生成下一项验证", body: "只推荐一个成本最低、最可能改变决策的测试，并预设通过、补证和停止阈值。", route: "/tests", target: "test" },
  { title: "查看投前决策单", body: "查看继续投入、先补证或停止的建议、依据、限制和人工确认入口。", route: "/decision", target: "decision" },
] as const;

export function NewcomerGuideButton() {
  const { resetOnboarding } = useDecision();
  const router = useRouter();
  const restart = () => {
    resetOnboarding();
    router.push(steps[0].route);
  };
  return <button onClick={restart} className="guide-button"><CircleHelp className="h-4 w-4" />新手指引</button>;
}

export function NewcomerGuide() {
  const { state, isHydrated, setOnboardingStep, completeOnboarding, clearDemoData } = useDecision();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && pathname !== "/" && !state.onboardingCompleted && state.onboardingStep === null) setOnboardingStep(0);
  }, [isHydrated, pathname, state.onboardingCompleted, state.onboardingStep, setOnboardingStep]);

  useEffect(() => {
    if (!isHydrated || state.onboardingStep === null) return;
    const expectedRoute = steps[state.onboardingStep].route;
    if (pathname !== expectedRoute) router.replace(expectedRoute);
  }, [isHydrated, pathname, router, state.onboardingStep]);

  useEffect(() => {
    document.querySelectorAll(".guide-target-active").forEach((node) => node.classList.remove("guide-target-active"));
    if (!isHydrated || state.onboardingStep === null) return;
    const current = steps[state.onboardingStep];
    const target = document.querySelector(`[data-guide="${current.target}"]`);
    target?.classList.add("guide-target-active");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => target?.classList.remove("guide-target-active");
  }, [isHydrated, pathname, state.onboardingStep]);

  if (!isHydrated || state.onboardingStep === null) return null;
  const index = state.onboardingStep;
  const step = steps[index];
  const go = (next: number) => { const bounded = Math.max(0, Math.min(steps.length - 1, next)); setOnboardingStep(bounded); router.push(steps[bounded].route); };
  const clear = () => { if (window.confirm("确认清空并恢复演示项目？真实项目空间不会受到影响。")) clearDemoData(); };

  return <div className="guide-overlay" role="dialog" aria-modal="true" aria-labelledby="guide-title">
    <section className="guide-panel">
      <div className="flex items-start justify-between gap-4"><div><p className="section-kicker">真实任务指引 · {state.mode === "demo" ? "模拟数据空间" : "真实项目草稿空间"}</p><h2 id="guide-title" className="mt-2 text-xl font-semibold">{step.title}</h2><p className="mt-2 text-sm leading-6 text-[#65726B]">{step.body}</p></div><button onClick={completeOnboarding} className="icon-button" aria-label="关闭新手指引"><X className="h-4 w-4" /></button></div>
      <div className="mt-5 flex gap-1" aria-label={`第${index + 1}步，共${steps.length}步`}>{steps.map((_, i) => <span key={i} className={`guide-progress ${i <= index ? "active" : ""}`} />)}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{state.mode === "demo" ? <button onClick={clear} className="secondary-action"><Trash2 className="h-4 w-4" />清空演示数据</button> : null}<button onClick={completeOnboarding} className="secondary-action">跳过</button></div><div className="flex gap-2"><button disabled={index === 0} onClick={() => go(index - 1)} className="secondary-action"><ArrowLeft className="h-4 w-4" />上一步</button>{index === steps.length - 1 ? <button onClick={completeOnboarding} className="primary-action">完成指引</button> : <button onClick={() => go(index + 1)} className="primary-action">下一步<ArrowRight className="h-4 w-4" /></button>}</div></div>
      <button onClick={() => { setOnboardingStep(0); router.push("/workspace"); }} className="mt-4 inline-flex items-center gap-1 text-xs text-[#6C8378]"><RotateCcw className="h-3.5 w-3.5" />重新从第一步开始</button>
    </section>
  </div>;
}
