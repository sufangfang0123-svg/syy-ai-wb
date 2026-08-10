import React from "react";
import { cn } from "@/lib/utils";

export interface OrbitingCirclesProps extends React.HTMLAttributes<HTMLDivElement> {
  reverse?: boolean;
  duration?: number;
  radius?: number;
  path?: boolean;
  iconSize?: number;
}

// Adapted from Magic UI; animation is disabled by the global reduced-motion rule.
export function OrbitingCircles({
  className,
  children,
  reverse,
  duration = 24,
  radius = 150,
  path = true,
  iconSize = 34,
  ...props
}: OrbitingCirclesProps) {
  return <>
    {path ? <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full"><circle className="orbit-path" cx="50%" cy="50%" r={radius} fill="none" /></svg> : null}
    {React.Children.map(children, (child, index) => {
      const angle = (360 / React.Children.count(children)) * index;
      return <div
        style={{ "--orbit-duration": `${duration}s`, "--orbit-radius": `${radius}px`, "--orbit-angle": `${angle}deg`, "--orbit-icon-size": `${iconSize}px`, animationDirection: reverse ? "reverse" : "normal" } as React.CSSProperties}
        className={cn("orbit-item", className)}
        {...props}
      >{child}</div>;
    })}
  </>;
}
