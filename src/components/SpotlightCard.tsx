import { useRef } from "react";
import type { ReactNode, MouseEvent } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "figure" | "li";
}

/** Card wrapper that drives the `spotlight-card` cursor-reactive glow via CSS vars. */
export function SpotlightCard({ children, className = "", as: Tag = "div" }: SpotlightCardProps) {
  const ref = useRef<HTMLElement>(null);

  function handleMove(e: MouseEvent<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <Tag ref={ref as never} onMouseMove={handleMove} className={`spotlight-card corner-frame ${className}`}>
      {children}
    </Tag>
  );
}
