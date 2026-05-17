import siggy from "@/assets/siggy.png";

export function Siggy({ className = "", size = 240, glow = true, float = true }: {
  className?: string; size?: number; glow?: boolean; float?: boolean;
}) {
  return (
    <div className={`relative inline-block ${float ? "animate-float" : ""} ${className}`} style={{ width: size, height: size }}>
      {glow && (
        <div className="absolute inset-0 rounded-full blur-3xl opacity-60 pointer-events-none"
             style={{ background: "radial-gradient(circle, var(--cyan-glow), transparent 65%)" }} />
      )}
      <img
        src={siggy}
        alt="Siggy the Ritual cat mascot"
        className={`relative w-full h-full object-contain ${glow ? "animate-pulse-glow" : ""}`}
        draggable={false}
      />
      {/* glowing eye overlay (subtle blink) */}
      <div className="absolute pointer-events-none animate-blink-eyes"
           style={{ inset: 0, background: "radial-gradient(circle at 42% 56%, oklch(0.9 0.22 95 / 0.0) 1.5%, transparent 4%), radial-gradient(circle at 58% 56%, oklch(0.9 0.22 95 / 0.0) 1.5%, transparent 4%)" }} />
    </div>
  );
}

export function SiggyMini({ size = 48 }: { size?: number }) {
  return (
    <img src={siggy} alt="Siggy" width={size} height={size}
      className="object-contain drop-shadow-[0_0_8px_oklch(0.82_0.18_195/0.6)]" />
  );
}
