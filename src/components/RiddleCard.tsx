import { Link } from "@tanstack/react-router";
import { Flame, Trophy, Users, Clock } from "lucide-react";
import { countdown } from "@/lib/format";

export type PublicRiddle = {
  id: string; title: string; description: string; image_url: string | null;
  difficulty: string; xp_reward: number; badge_title: string;
  start_time: string; end_time: string; max_winners: number; active: boolean;
};

const diffColor: Record<string, string> = {
  easy: "text-ritual-green",
  medium: "text-cyan-glow",
  hard: "text-pink-glow",
  legendary: "text-primary",
};

export function RiddleCard({ r, count }: { r: PublicRiddle; count?: number }) {
  const ended = new Date(r.end_time).getTime() < Date.now();
  const live = r.active && !ended;
  return (
    <Link to="/quests/$id" params={{ id: r.id }}
      className="group relative block overflow-hidden rounded-2xl glass border-glow p-5 transition-smooth hover:-translate-y-1 hover:glow-purple">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
            <span className={`inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 ${diffColor[r.difficulty] ?? "text-foreground"}`}>
              <Flame className="size-3" /> {r.difficulty}
            </span>
            {live ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-ritual-green/15 px-2 py-0.5 text-ritual-green">
                <span className="size-1.5 rounded-full bg-ritual-green animate-pulse" /> LIVE
              </span>
            ) : (
              <span className="rounded-full bg-muted/60 px-2 py-0.5 text-muted-foreground">ENDED</span>
            )}
          </div>
          <h3 className="font-display text-xl font-bold text-foreground group-hover:text-holographic">{r.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
        </div>
        {r.image_url && (
          <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border/60 sm:block">
            <img src={r.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Stat icon={<Trophy className="size-3.5 text-primary" />} label="XP" value={r.xp_reward.toLocaleString()} />
        <Stat icon={<Users className="size-3.5 text-accent" />} label="Solved" value={`${count ?? 0}/${r.max_winners}`} />
        <Stat icon={<Clock className="size-3.5 text-pink-glow" />} label={live ? "Ends in" : "Ended"} value={countdown(r.end_time)} />
      </div>
    </Link>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-2">
      <div className="mb-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
