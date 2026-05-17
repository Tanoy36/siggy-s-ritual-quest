import { Link } from "@tanstack/react-router";
import { Flame, Trophy, Users, Clock, Sparkles } from "lucide-react";
import { countdown } from "@/lib/format";

export type PublicRiddle = {
  id: string; title: string; description: string; image_url: string | null;
  difficulty: string; xp_reward: number; badge_title: string;
  start_time: string; end_time: string; max_winners: number; active: boolean;
  main_hint?: string; creator_x_username?: string;
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
  const creator = (r.creator_x_username || "").replace(/^@/, "");
  return (
    <Link to="/quests/$id" params={{ id: r.id }}
      className="group relative block overflow-hidden rounded-2xl glass border-glow transition-smooth hover:-translate-y-1 hover:glow-purple">
      {r.image_url ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary/40">
          <img src={r.image_url} alt={r.title} loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-0"
            onLoad={(e) => e.currentTarget.classList.remove("opacity-0")} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
            <span className={`inline-flex items-center gap-1 rounded-full bg-background/70 backdrop-blur px-2 py-0.5 ${diffColor[r.difficulty] ?? "text-foreground"}`}>
              <Flame className="size-3" /> {r.difficulty}
            </span>
            {live ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-ritual-green/20 backdrop-blur px-2 py-0.5 text-ritual-green">
                <span className="size-1.5 rounded-full bg-ritual-green animate-pulse" /> LIVE
              </span>
            ) : (
              <span className="rounded-full bg-muted/60 backdrop-blur px-2 py-0.5 text-muted-foreground">ENDED</span>
            )}
          </div>
        </div>
      ) : (
        <div className="px-5 pt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
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
      )}
      <div className="p-5">
        <h3 className="font-display text-xl font-bold text-foreground group-hover:text-holographic">{r.title}</h3>
        {r.main_hint ? (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 p-2 text-sm text-foreground/90">
            <Sparkles className="size-3.5 mt-0.5 text-accent shrink-0" />
            <span className="italic">{r.main_hint}</span>
          </div>
        ) : (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Stat icon={<Trophy className="size-3.5 text-primary" />} label="XP" value={r.xp_reward.toLocaleString()} />
        <Stat icon={<Users className="size-3.5 text-accent" />} label="Solved" value={`${count ?? 0}/${r.max_winners}`} />
        <Stat icon={<Clock className="size-3.5 text-pink-glow" />} label={live ? "Ends in" : "Ended"} value={countdown(r.end_time)} />
        </div>
        {creator && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent/30 bg-secondary/40 px-3 py-2">
            <div className="relative">
              <img src={`https://unavatar.io/x/${creator}`} alt={`@${creator}`}
                className="size-8 rounded-full ring-2 ring-accent/60" loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${creator}`; }} />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-background" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Uploaded by</div>
              <div className="text-sm font-semibold text-foreground">@{creator}</div>
            </div>
          </div>
        )}
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
