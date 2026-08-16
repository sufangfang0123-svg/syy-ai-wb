"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleHelp, RotateCcw, Trash2, X } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { computeGuidePlacement, GuidePlacement, GuideRect } from "@/lib/guide-position";

const steps = [
  { title: "创建新品决策项目", body: "先写清楚准备做什么、面向谁、处于哪个阶段，以及下一笔钱准备花在哪里。", route: "/workspace", targets: ["project-brief"] },
  { title: "核对现有证据", body: "从第一张证据卡开始核对来源、适用范围和限制；公开讨论不能冒充购买行为。", route: "/evidence", targets: ["css:.evidence-record:first-child h2"] },
  { title: "识别关键风险", body: "模拟案例并列展示错误代价与证据缺口，帮助负责人说明为什么先核对这一项。", route: "/assumptions", targets: ["assumption-primary", "assumption-explain"] },
  { title: "记录验证方案", body: "由负责人选定一个主变量，记录预算、样本以及通过、补证和停止阈值；演示不自动生成实验。", route: "/tests", targets: ["test-hypothesis", "test-thresholds"] },
  { title: "确认投前决策", body: "系统建议与人工决定分开记录。负责人必须明确确认继续投入、先补证或停止。", route: "/decision", targets: ["decision-verdict", "decision-confirm"] },
] as const;

const rectFromElement = (element: Element): GuideRect => {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
};

const unionRect = (rects: GuideRect[]): GuideRect | null => {
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
};

const targetSelector = (target: string) => target.startsWith("css:") ? target.slice(4) : `[data-guide="${target}"]`;

export function NewcomerGuideButton() {
  const { resetOnboarding } = useDecision();
  const router = useRouter();
  const restart = () => {
    resetOnboarding();
    router.push(steps[0].route);
  };
  return <button id="newcomer-guide-trigger" onClick={restart} className="guide-button" aria-label="新手指引"><CircleHelp className="h-4 w-4" /><span className="hidden sm:inline">新手指引</span></button>;
}

export function NewcomerGuide() {
  const { state, isHydrated, setOnboardingStep, completeOnboarding, clearDemoData } = useDecision();
  const pathname = usePathname();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [targetRects, setTargetRects] = useState<GuideRect[]>([]);
  const [placement, setPlacement] = useState<GuidePlacement>({ left: 12, top: 12, side: "center" });
  const normalizedPathname = pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
  const isGuideRoute = steps.some((step) => normalizedPathname === step.route);

  useEffect(() => {
    if (isHydrated && isGuideRoute && !state.onboardingCompleted && state.onboardingStep === null) setOnboardingStep(0);
  }, [isGuideRoute, isHydrated, state.onboardingCompleted, state.onboardingStep, setOnboardingStep]);

  useEffect(() => {
    if (!isHydrated || !isGuideRoute || state.onboardingStep === null) return;
    const expectedRoute = steps[state.onboardingStep].route;
    if (normalizedPathname !== expectedRoute) router.replace(expectedRoute);
  }, [isGuideRoute, isHydrated, normalizedPathname, router, state.onboardingStep]);

  const updateGeometry = useCallback(() => {
    if (state.onboardingStep === null) return;
    const step = steps[state.onboardingStep];
    const elements = step.targets.map((target) => document.querySelector(targetSelector(target))).filter((element): element is Element => Boolean(element));
    const rects = elements.map(rectFromElement).filter((rect) => rect.width > 0 && rect.height > 0);
    setTargetRects(rects);
    const targetArea = unionRect(rects);
    const panel = panelRef.current?.getBoundingClientRect();
    const panelSize = { width: Math.min(panel?.width ?? 420, Math.max(280, window.innerWidth - 24)), height: Math.min(panel?.height ?? 320, Math.max(280, window.innerHeight - 24)) };
    setPlacement(computeGuidePlacement(targetArea, panelSize, { width: window.innerWidth, height: window.innerHeight }));
  }, [state.onboardingStep]);

  useLayoutEffect(() => {
    if (!isHydrated || !isGuideRoute || state.onboardingStep === null) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector(targetSelector(steps[state.onboardingStep!].targets[0]));
      target?.scrollIntoView({ behavior: "auto", block: "end", inline: "nearest" });
      window.requestAnimationFrame(updateGeometry);
    });
    const observer = new ResizeObserver(updateGeometry);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener("resize", updateGeometry);
    window.addEventListener("scroll", updateGeometry, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateGeometry);
      window.removeEventListener("scroll", updateGeometry, true);
    };
  }, [isGuideRoute, isHydrated, pathname, state.onboardingStep, updateGeometry]);

  useEffect(() => {
    if (!isHydrated || !isGuideRoute || state.onboardingStep === null) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panelRef.current.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trapFocus, true);
    return () => document.removeEventListener("keydown", trapFocus, true);
  }, [isGuideRoute, isHydrated, state.onboardingStep]);

  if (!isHydrated || !isGuideRoute || state.onboardingStep === null) return null;
  const index = state.onboardingStep;
  const step = steps[index];
  const go = (next: number) => {
    const bounded = Math.max(0, Math.min(steps.length - 1, next));
    setOnboardingStep(bounded);
    router.push(steps[bounded].route);
  };
  const clear = () => {
    if (window.confirm("确认清空并恢复模拟研究实验室？此操作只影响浏览器中的演示数据。")) clearDemoData();
  };
  const close = () => completeOnboarding();
  const panelStyle = { "--guide-left": `${placement.left}px`, "--guide-top": `${placement.top}px` } as CSSProperties;

  return <Dialog.Root open modal={false} onOpenChange={(open) => { if (!open) close(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="guide-overlay" />
      <svg className="guide-mask" aria-hidden="true" width="100%" height="100%">
        <defs><mask id="guide-cutouts"><rect width="100%" height="100%" fill="white" />{targetRects.map((rect, i) => <rect key={i} x={rect.left - 7} y={rect.top - 7} width={rect.width + 14} height={rect.height + 14} rx="18" fill="black" />)}</mask></defs>
        <rect width="100%" height="100%" fill="rgba(22,36,30,.58)" mask="url(#guide-cutouts)" />
        {targetRects.map((rect, i) => <rect key={i} x={rect.left - 7} y={rect.top - 7} width={rect.width + 14} height={rect.height + 14} rx="18" className="guide-focus-ring" />)}
      </svg>
      <Dialog.Content
        ref={panelRef}
        data-guide-panel
        data-placement={placement.side}
        className="guide-panel"
        style={panelStyle}
        aria-modal="true"
        aria-describedby="guide-description"
        onOpenAutoFocus={(event) => { event.preventDefault(); closeRef.current?.focus(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById("newcomer-guide-trigger")?.focus(); }}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="guide-panel-body">
          <div className="flex items-start justify-between gap-4"><div><p className="section-kicker">模拟任务指引 · 独立研究实验室</p><Dialog.Title id="guide-title" className="mt-2 text-xl font-semibold">{step.title}</Dialog.Title><Dialog.Description id="guide-description" className="mt-2 text-sm leading-6 text-[#65726B]">{step.body}</Dialog.Description></div><Dialog.Close asChild><button ref={closeRef} className="icon-button shrink-0" aria-label="关闭新手指引"><X className="h-4 w-4" /></button></Dialog.Close></div>
          <div className="mt-5 flex gap-1" aria-label={`第${index + 1}步，共${steps.length}步`}>{steps.map((_, i) => <span key={i} className={`guide-progress ${i <= index ? "active" : ""}`} />)}</div>
          <div className="guide-meta-row">{index > 0 ? <button onClick={() => go(0)} className="guide-restart"><RotateCcw className="h-3.5 w-3.5" />重新开始</button> : <span />}<p className="guide-step-label">第 {index + 1} / {steps.length} 步</p></div>
        </div>
        <div className="guide-actions"><div className="flex flex-wrap gap-2">{index === 0 ? <button onClick={clear} className="secondary-action"><Trash2 className="h-4 w-4" />清空演示数据</button> : null}<Dialog.Close asChild><button className="secondary-action">跳过</button></Dialog.Close></div><div className="flex gap-2"><button disabled={index === 0} onClick={() => go(index - 1)} className="secondary-action"><ArrowLeft className="h-4 w-4" />上一步</button>{index === steps.length - 1 ? <Dialog.Close asChild><button className="primary-action">完成指引</button></Dialog.Close> : <button onClick={() => go(index + 1)} className="primary-action">下一步<ArrowRight className="h-4 w-4" /></button>}</div></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
