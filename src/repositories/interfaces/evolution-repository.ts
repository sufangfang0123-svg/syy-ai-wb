import { EvolutionState } from "@/domain/types";

export interface EvolutionRepository {
  load(): Promise<EvolutionState>;
  save(state: EvolutionState): Promise<void>;
}
