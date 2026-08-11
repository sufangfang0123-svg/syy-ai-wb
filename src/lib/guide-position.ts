export interface GuideRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface GuideSize {
  width: number;
  height: number;
}

export interface GuidePlacement {
  left: number;
  top: number;
  side: "top" | "right" | "bottom" | "left" | "center";
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

export function computeGuidePlacement(
  target: GuideRect | null,
  panel: GuideSize,
  viewport: GuideSize,
  gap = 16,
  safe = 12,
): GuidePlacement {
  const maxLeft = viewport.width - panel.width - safe;
  const maxTop = viewport.height - panel.height - safe;
  if (!target) {
    return {
      left: clamp((viewport.width - panel.width) / 2, safe, maxLeft),
      top: clamp((viewport.height - panel.height) / 2, safe, maxTop),
      side: "center",
    };
  }

  const candidates = [
    { side: "right" as const, room: viewport.width - target.right - gap, fits: viewport.width - target.right - gap >= panel.width },
    { side: "left" as const, room: target.left - gap, fits: target.left - gap >= panel.width },
    { side: "bottom" as const, room: viewport.height - target.bottom - gap, fits: viewport.height - target.bottom - gap >= panel.height },
    { side: "top" as const, room: target.top - gap, fits: target.top - gap >= panel.height },
  ].sort((a, b) => Number(b.fits) - Number(a.fits) || b.room - a.room);
  const side = candidates[0]?.fits ? candidates[0].side : "center";

  if (side === "right") {
    return { left: clamp(target.right + gap, safe, maxLeft), top: clamp(target.top, safe, maxTop), side };
  }
  if (side === "left") {
    return { left: clamp(target.left - panel.width - gap, safe, maxLeft), top: clamp(target.top, safe, maxTop), side };
  }
  if (side === "bottom") {
    return { left: clamp(target.left + (target.width - panel.width) / 2, safe, maxLeft), top: clamp(target.bottom + gap, safe, maxTop), side };
  }
  if (side === "top") {
    return { left: clamp(target.left + (target.width - panel.width) / 2, safe, maxLeft), top: clamp(target.top - panel.height - gap, safe, maxTop), side };
  }
  return {
    left: clamp((viewport.width - panel.width) / 2, safe, maxLeft),
    top: clamp((viewport.height - panel.height) / 2, safe, maxTop),
    side,
  };
}
