import { demoEvolutionState } from "@/data/demo/evolution-data";
import { EvolutionState } from "@/domain/types";
import { EvolutionRepository } from "../interfaces/evolution-repository";

const STORAGE_KEY = "cotton-evolution-v2-state";

export class DemoEvolutionRepository implements EvolutionRepository {
  async load(): Promise<EvolutionState> {
    if (typeof window === "undefined") return structuredClone(demoEvolutionState);
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(demoEvolutionState);
    try {
      return JSON.parse(saved) as EvolutionState;
    } catch {
      return structuredClone(demoEvolutionState);
    }
  }

  async save(state: EvolutionState): Promise<void> {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }

  async reset(): Promise<EvolutionState> {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    return structuredClone(demoEvolutionState);
  }
}
