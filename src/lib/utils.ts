import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const platformMeta: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  xiaohongshu: { label: "小红书", color: "#e11d48", bg: "#fff1f2" },
  douyin: { label: "抖音", color: "#3e6e5b", bg: "#e8f0eb" },
  jd: { label: "京东", color: "#d93b2b", bg: "#fdf1f0" },
  taobao: { label: "淘宝", color: "#d47318", bg: "#fdf6ed" },
  weibo: { label: "微博", color: "#f07b25", bg: "#fdf2e8" },
  zhihu: { label: "知乎", color: "#4C83C3", bg: "#edf2fa" },
};

export const sentimentMeta: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  positive: { label: "正面", color: "#2E8B70", bg: "#E8F5F0", dot: "bg-[#2E8B70]" },
  neutral: { label: "中性", color: "#7A8A83", bg: "#F8FAF9", dot: "bg-[#7A8A83]" },
  negative: { label: "负面", color: "#D9635C", bg: "#FDF1F0", dot: "bg-[#D9635C]" },
};

export const dataTypeMeta: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  public: { label: "公开反馈", color: "#4C83C3", bg: "#EDF2FA" },
  interview: { label: "真人访谈", color: "#7768C5", bg: "#F0EDFA" },
  ai_simulated: { label: "AI模拟", color: "#7768C5", bg: "#F0EDFA" },
};
