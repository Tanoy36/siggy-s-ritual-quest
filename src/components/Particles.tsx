import { useEffect, useRef } from "react";

export function Particles({ count = 14 }: { count?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Skip heavy particle render on small / low-power screens.
    if (typeof window !== "undefined") {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const small = window.innerWidth < 640;
      if (reduce || small) return;
    }
    const el = ref.current; if (!el) return;
    el.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      const size = Math.random() * 3 + 1;
      const colors = ["var(--cyan-glow)", "var(--primary)", "var(--pink-glow)", "var(--ritual-green)"];
      Object.assign(p.style, {
        position: "absolute",
        left: `${Math.random() * 100}%`,
        bottom: `-${Math.random() * 20}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: colors[Math.floor(Math.random() * colors.length)],
        boxShadow: `0 0 ${size * 4}px currentColor`,
        opacity: "0",
        animation: `particle ${10 + Math.random() * 20}s linear ${Math.random() * 10}s infinite`,
      });
      el.appendChild(p);
    }
  }, [count]);
  return <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0" />;
}
