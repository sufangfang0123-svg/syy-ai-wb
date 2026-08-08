"use client";

import { useEvolution } from "./evolution-provider";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X, Play, Sparkles } from "lucide-react";

const steps = [
  { title: "832条消费信号进入演示漏斗", body: "漏斗规模为D级演示计数；证据库中的真人研究、公开证据与合成资料分别标级，不相互混合。", route: "/" },
  { title: "聚类成14个需求机会", body: "AI负责整理相似任务与痛点，机会仍需人工确认。", route: "/opportunities" },
  { title: "打开年轻女性随行护理", body: "三栏工作台同时展示信号、机会与决策详情。", route: "/opportunities" },
  { title: "查看证据与反向证据", body: "任何重要分数都能回到证据链，反例不会被隐藏。", route: "/opportunities" },
  { title: "生成3个产品物种", body: "机会转化为多个竞争概念，而不是一次生成唯一答案。", route: "/evolution" },
  { title: "展示8类棉基因", body: "人群、场景、任务、材料、体验、情绪、传播和商业共同定义产品。", route: "/evolution" },
  { title: "运行一次基因变异", body: "选择或锁定基因后创建新版本，状态和审计日志同步更新。", route: "/evolution" },
  { title: "查看Fitness变化", body: "八维原始分经过证据系数和风险扣分形成适应度。", route: "/evolution" },
  { title: "五道Gate淘汰弱概念", body: "Hard Gate一旦失败立即终止，不能被高分抵消。", route: "/evolution" },
  { title: "合成消费者压力测试", body: "模拟仅寻找反例、淘汰明显弱方案并压缩真人测试范围。", route: "/launch" },
  { title: "进入真人Reality Check", body: "对照AI模拟与真人结果，记录偏差并调整权重。", route: "/launch" },
  { title: "最终幸存：棉感随行胶囊 V3.2", body: "经历实验、淘汰和校准后，幸存者进入下一阶段验证。", route: "/" },
  { title: "生成Claim Spine", body: "所有渠道表达共享同一产品事实母体和证据边界。", route: "/content" },
  { title: "全渠道内容实验", body: "渠道改变结构和节奏，不改变事实；结果继续回流产品。", route: "/content" },
];

export function GuidedDemoButton() {
  const { setDemoStep } = useEvolution();
  return <button onClick={() => setDemoStep(0)} className="demo-button" aria-label="开始3分钟进化演示"><Play className="h-4 w-4 fill-current" />3分钟看懂棉生万物</button>;
}

export function GuidedDemo() {
  const { state, setDemoStep } = useEvolution();
  const router = useRouter();
  if (state.demoStep === null) return null;
  const index = state.demoStep;
  const step = steps[index];

  const go = (next: number | null) => {
    if (next === null) return setDemoStep(null);
    const bounded = Math.max(0, Math.min(steps.length - 1, next));
    setDemoStep(bounded);
    router.push(steps[bounded].route);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#17231F]/55" role="dialog" aria-modal="true" aria-label="3分钟进化演示">
      <div className="absolute bottom-6 left-1/2 w-[min(92vw,680px)] -translate-x-1/2 rounded-[28px] border border-white/20 bg-[#FAF8F5] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#315C46] text-white"><Sparkles className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5B8C5A]">Step {index + 1} / {steps.length}</p><h2 className="mt-1 text-xl font-semibold text-[#26312D]">{step.title}</h2><p className="mt-2 text-sm leading-6 text-[#636E72]">{step.body}</p></div></div>
          <button onClick={() => setDemoStep(null)} className="rounded-full p-2 hover:bg-white" aria-label="退出演示"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-5 flex gap-1">{steps.map((_, itemIndex) => <span key={itemIndex} className={`h-1.5 flex-1 rounded-full ${itemIndex <= index ? "bg-[#5B8C5A]" : "bg-[#DFE6E9]"}`} />)}</div>
        {index === steps.length - 1 ? <blockquote className="mb-5 rounded-xl bg-[#315C46] p-4 text-sm leading-6 text-white">AI不是替企业预测爆款，而是帮助企业更早发现错误，把有限的真人验证和试产资源集中到最值得验证的产品。</blockquote> : null}
        <div className="flex items-center justify-between"><button disabled={index === 0} onClick={() => go(index - 1)} className="secondary-action disabled:opacity-40"><ArrowLeft className="h-4 w-4" />上一步</button>{index === steps.length - 1 ? <button onClick={() => go(null)} className="primary-action">完成演示</button> : <button onClick={() => go(index + 1)} className="primary-action">下一步<ArrowRight className="h-4 w-4" /></button>}</div>
      </div>
    </div>
  );
}
