import { demoProductWorkbenchState } from "../data/demo/product-workbench-data";
import { ProductWorkbenchState } from "../domain/product-workbench-types";

export const PUBLIC_FIXTURE_STORAGE_KEY = "cotton-product-workbench-demo:v1";

export function loadPublicFixtureState(storage?: Pick<Storage, "getItem">): ProductWorkbenchState {
  const fallback = structuredClone(demoProductWorkbenchState);
  if (!storage) return fallback;
  const raw = storage.getItem(PUBLIC_FIXTURE_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<ProductWorkbenchState>) };
  } catch {
    return fallback;
  }
}

export function savePublicFixtureState(storage: Pick<Storage, "setItem">, state: ProductWorkbenchState) {
  storage.setItem(PUBLIC_FIXTURE_STORAGE_KEY, JSON.stringify(state));
}
