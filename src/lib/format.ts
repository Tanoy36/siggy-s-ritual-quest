export const shortAddr = (a?: string | null) =>
  !a ? "" : `${a.slice(0, 6)}…${a.slice(-4)}`;
export const fmtMs = (ms: number) => {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
};
export const countdown = (target: string | Date) => {
  const t = new Date(target).getTime() - Date.now();
  if (t <= 0) return "ENDED";
  const d = Math.floor(t / 86400000);
  const h = Math.floor((t % 86400000) / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
};
