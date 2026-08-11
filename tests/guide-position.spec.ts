import { expect, test } from "@playwright/test";
import { computeGuidePlacement } from "../src/lib/guide-position";

test("guide placement stays inside the viewport", () => {
  const placement = computeGuidePlacement(
    { left: 40, top: 100, right: 600, bottom: 520, width: 560, height: 420 },
    { width: 420, height: 300 },
    { width: 1366, height: 768 },
  );
  expect(placement.left).toBeGreaterThanOrEqual(12);
  expect(placement.top).toBeGreaterThanOrEqual(12);
  expect(placement.left + 420).toBeLessThanOrEqual(1354);
  expect(placement.top + 300).toBeLessThanOrEqual(756);
});

test("guide placement falls back safely on a phone", () => {
  const placement = computeGuidePlacement(
    { left: 12, top: 80, right: 363, bottom: 500, width: 351, height: 420 },
    { width: 351, height: 380 },
    { width: 375, height: 667 },
  );
  expect(placement).toEqual({ left: 12, top: 143.5, side: "center" });
});
