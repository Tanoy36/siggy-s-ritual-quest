import { Crown, Medal, Trophy } from "lucide-react";
import { avatarUrlFor } from "@/lib/constants";
import { fmtMs, shortAddr } from "@/lib/format";

export type LbRow = {
  id: string; wallet_address: string; x_username: string; x_avatar_seed: string;
  xp_earned: number; badge_title: string | null; completion_time_ms: number;
};

export function LeaderboardList({ rows }: { rows: LbRow[] }) {
  if (!rows.length) return (
    <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
      No champions yet — be the first to crack the riddle.
    </div>
  );
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.id}
          className={`group relative flex items-center gap-3 rounded-xl p-3 transition-smooth hover:translate-x-1 ${
            i === 0 ? "glass-strong glow-purple" : "glass"
          }`}>
          <RankBadge rank={i + 1} />
          <img src={avatarUrlFor(r.x_avatar_seed)} alt={r.x_username}
            className="h-10 w-10 rounded-full border border-border/60 bg-background object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-foreground">@{r.x_username}</span>
              {r.badge_title && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                  {r.badge_title}
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">{shortAddr(r.wallet_address)} · {fmtMs(r.completion_time_ms)}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-bold text-holographic">{r.xp_earned.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const cfg = rank === 1
    ? { icon: <Crown className="size-4" />, cls: "bg-gradient-to-br from-yellow-400 to-orange-500 text-black" }
    : rank === 2 ? { icon: <Medal className="size-4" />, cls: "bg-gradient-to-br from-zinc-300 to-zinc-500 text-black" }
    : rank === 3 ? { icon: <Medal className="size-4" />, cls: "bg-gradient-to-br from-amber-700 to-yellow-900 text-white" }
    : { icon: <Trophy className="size-3.5" />, cls: "bg-secondary text-muted-foreground" };
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${cfg.cls}`}>
      {rank <= 3 ? cfg.icon : <span>{rank}</span>}
    </div>
  );
}
