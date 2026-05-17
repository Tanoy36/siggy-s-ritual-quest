import { Crown, Medal, Trophy, Flame, Hourglass, X as XIcon } from "lucide-react";
import { fmtMs } from "@/lib/format";
import type { PerformerRow } from "@/lib/quests.functions";

export function PerformersList({
  rows,
  pendingMode = false,
}: {
  rows: PerformerRow[];
  /** When true, hide XP/wins/streak and show all rows as "Awaiting Reveal". */
  pendingMode?: boolean;
}) {
  if (!rows.length)
    return (
      <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
        No performers yet · be the first to seal a submission.
      </div>
    );
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <PerformerRowItem key={r.x_username} r={r} rank={i + 1} pendingMode={pendingMode} />
      ))}
    </ol>
  );
}

function PerformerRowItem({
  r,
  rank,
  pendingMode,
}: {
  r: PerformerRow;
  rank: number;
  pendingMode: boolean;
}) {
  const isWinner = !pendingMode && r.status === "winner";
  const isIncorrect = !pendingMode && r.status === "incorrect";
  const isPending = pendingMode || r.status === "pending";

  return (
    <li
      className={[
        "group relative flex items-center gap-3 rounded-2xl p-3 transition-all duration-300",
        "hover:translate-x-1 hover:scale-[1.005]",
        isWinner
          ? "glass-strong border border-amber-300/30 shadow-[0_0_24px_-6px_rgba(251,191,36,.45)]"
          : "glass",
      ].join(" ")}
    >
      {isWinner && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-60"
          style={{
            background:
              "linear-gradient(120deg, transparent 30%, rgba(255,215,140,.18) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "shine 3.5s ease-in-out infinite",
            mixBlendMode: "screen",
          }}
        />
      )}

      <RankBadge rank={rank} winner={isWinner} />

      <AvatarRing handle={r.x_username} winner={isWinner} dim={isIncorrect} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <a
            href={`https://x.com/${r.x_username}`}
            target="_blank"
            rel="noreferrer"
            className="truncate font-semibold text-foreground hover:text-accent"
          >
            @{r.x_username}
          </a>
          {isWinner && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
              <Trophy className="size-3" /> Winner
            </span>
          )}
          {r.streak >= 2 && !pendingMode && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300 animate-pulse">
              <Flame className="size-3" /> {r.streak}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <StatusPill pending={isPending} winner={isWinner} incorrect={isIncorrect} />
          {!pendingMode && r.best_ms !== null && <span>· best {fmtMs(r.best_ms)}</span>}
          {!pendingMode && r.wins > 0 && <span>· {r.wins} solved</span>}
        </div>
      </div>

      <div className="text-right">
        {pendingMode || r.xp === 0 ? (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {pendingMode ? "sealed" : isPending ? "pending" : "—"}
          </div>
        ) : (
          <>
            <div className="font-mono text-lg font-bold text-holographic">
              {r.xp.toLocaleString()}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
          </>
        )}
      </div>
    </li>
  );
}

function StatusPill({
  pending, winner, incorrect,
}: { pending: boolean; winner: boolean; incorrect: boolean }) {
  if (winner)
    return (
      <span className="inline-flex items-center gap-1 text-amber-300">
        <Trophy className="size-3" /> Winner
      </span>
    );
  if (incorrect)
    return (
      <span className="inline-flex items-center gap-1 text-fuchsia-300/80">
        <XIcon className="size-3" /> Incorrect
      </span>
    );
  if (pending)
    return (
      <span className="inline-flex items-center gap-1 text-accent">
        <Hourglass className="size-3 animate-pulse" /> Awaiting Reveal
      </span>
    );
  return null;
}

function AvatarRing({ handle, winner, dim }: { handle: string; winner: boolean; dim: boolean }) {
  return (
    <div
      className="relative h-11 w-11 shrink-0 rounded-full p-[2px]"
      style={{
        background: winner
          ? "conic-gradient(from 90deg, #fde68a, #f59e0b, #fb923c, #fde68a)"
          : dim
            ? "linear-gradient(135deg, rgba(167,139,250,.25), rgba(236,72,153,.15))"
            : "conic-gradient(from 180deg, #a78bfa, #22d3ee, #ec4899, #a78bfa)",
        boxShadow: winner ? "0 0 18px -3px rgba(251,191,36,.7)" : undefined,
      }}
    >
      <img
        src={`https://unavatar.io/x/${handle}`}
        alt={`@${handle}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${handle}`;
        }}
        className={`h-full w-full rounded-full border border-background object-cover bg-background ${dim ? "opacity-80" : ""}`}
        loading="lazy"
      />
    </div>
  );
}

function RankBadge({ rank, winner }: { rank: number; winner: boolean }) {
  const cfg =
    rank === 1
      ? { icon: <Crown className="size-4" />, cls: "bg-gradient-to-br from-yellow-300 to-orange-500 text-black" }
      : rank === 2
        ? { icon: <Medal className="size-4" />, cls: "bg-gradient-to-br from-zinc-200 to-zinc-500 text-black" }
        : rank === 3
          ? { icon: <Medal className="size-4" />, cls: "bg-gradient-to-br from-amber-700 to-yellow-900 text-white" }
          : { icon: <Trophy className="size-3.5" />, cls: "bg-secondary text-muted-foreground" };
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${cfg.cls} ${winner && rank > 3 ? "ring-1 ring-amber-300/40" : ""}`}
    >
      {rank <= 3 ? cfg.icon : <span>{rank}</span>}
    </div>
  );
}
