"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AIAnalysisStep } from "@/types";

interface AIAnalysisOverlayProps {
  open: boolean;
  steps: AIAnalysisStep[];
  onComplete: () => void;
}

export function AIAnalysisOverlay({ open, steps, onComplete }: AIAnalysisOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setDone(false);
      return;
    }

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setCurrentStep(stepIndex);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDone(true);
          setTimeout(() => {
            onComplete();
          }, 800);
        }, 600);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl border border-border">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">分析完成</h3>
            <p className="text-sm text-muted-foreground">
              已从 {steps.length} 个维度完成需求洞察提取
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Loader2 className="h-14 w-14 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {Math.round(((currentStep + 1) / steps.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <h3 className="text-center text-lg font-bold text-foreground mb-1">AI分析进行中</h3>
            <p className="text-center text-sm text-muted-foreground mb-8">
              正在对消费者反馈进行多维度深度分析
            </p>

            <div className="space-y-3">
              {steps.map((step, i) => {
                const status = i < currentStep ? "done" : i === currentStep ? "active" : "pending";
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {status === "done" ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      ) : status === "active" ? (
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border">
                          <span className="text-xs text-muted-foreground">{i + 1}</span>
                        </div>
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        status === "done"
                          ? "text-muted-foreground line-through"
                          : status === "active"
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
