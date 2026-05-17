import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowRight, Megaphone, Radio, Sparkles, Zap } from "lucide-react";
import { Siggy } from "@/components/Siggy";
import { RiddleCard } from "@/components/RiddleCard";
import { PerformersList } from "@/components/PerformersList";
import { listRiddles, getPerformers, getRecentActivity, getAnnouncements } from "@/lib/quests.functions";
import { supabase } from "@/integrations/supabase/client";
import { avatarUrlFor, RITUAL_CHAIN } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ritual Riddle Quest · Live Onchain Riddles on Ritual" },
      { name: "description", content: "Solve live onchain riddles in the Ritual ecosystem. Connect your wallet, climb the leaderboard, mint your share card." },
    ],
  }),
  component: Home,
});

function Home() {
  const list = useServerFn(listRiddles);
  const lb = useServerFn(getPerformers);
  const feed = useServerFn(getRecentActivity);
  const ann = useServerFn(getAnnouncements);

  const riddlesQ = useQuery({ queryKey: ["riddles"], queryFn: () => list() });
  const lbQ = useQuery({ queryKey: ["performers", "global"], queryFn: () => lb({ data: {} }) });
  const feedQ = useQuery({ queryKey: ["feed"], queryFn: () => feed() });
  const annQ = useQuery({ queryKey: ["announcements"], queryFn: () => ann() });

  useEffect(() => {
    const ch = supabase
      .channel("realtime:home")
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, () => {
        lbQ.refetch(); feedQ.refetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "riddles" }, () => riddlesQ.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => annQ.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [lbQ, feedQ, riddlesQ, annQ]);

  const riddles = riddlesQ.data ?? [];
  const active = riddles.filter(r => r.active && new Date(r.end_time).getTime() > Date.now());
  const ended = riddles.filter(r => !r.active || new Date(r.end_time).getTime() <= Date.now());
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
      {/* HERO */}
      <section className="relative grid grid-cols-1 items-center gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full glass border-glow px-3 py-1 text-xs font-medium">
            <Radio className="size-3.5 text-ritual-green animate-pulse" />
            <span className="text-ritual-green">Ritual Chain Online</span>
            <span className="text-muted-foreground">· chain {RITUAL_CHAIN.id}</span>
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Decode the<br />
            <span className="text-holographic">Ritual riddles.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            A live onchain quest platform where the Ritual community races to crack mysterious riddles,
            sign a chain interaction, and ascend the leaderboard. Curated by Siggy.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {active[0] ? (
              <Link to="/quests/$id" params={{ id: active[0].id }}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-accent to-pink-glow px-5 py-3 text-sm font-semibold text-primary-foreground glow-purple transition-smooth hover:scale-[1.03]">
                <Sparkles className="size-4" /> Enter live quest <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <button disabled className="rounded-xl glass px-5 py-3 text-sm text-muted-foreground">No active quest yet</button>
            )}
            <Link to="/leaderboard"
              className="inline-flex items-center gap-2 rounded-xl glass border-glow px-5 py-3 text-sm font-semibold transition-smooth hover:glow-cyan">
              <Zap className="size-4 text-accent" /> View leaderboard
            </Link>
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 -z-10 blur-3xl opacity-50"
            style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 60%)" }} />
          <Siggy size={360} />
        </div>
      </section>

      {/* ANNOUNCEMENTS */}
      {annQ.data && annQ.data.length > 0 && (
        <section className="mb-12">
          <div className="glass-strong border-glow rounded-2xl px-5 py-4 flex items-start gap-3">
            <Megaphone className="mt-0.5 size-5 text-pink-glow shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Announcement</div>
              <p className="text-sm text-foreground/90">{annQ.data[0].message}</p>
            </div>
          </div>
        </section>
      )}

      {/* QUESTS */}
      <section className="mb-16">
        <SectionHeader title="Active Quests" hint={`${active.length} live`} />
        {active.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
            Siggy is preparing the next riddle. Stay tuned.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {active.map(r => <RiddleCard key={r.id} r={r} />)}
          </div>
        )}
        {ended.length > 0 && (
          <>
            <SectionHeader title="Past Quests" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-80">
              {ended.slice(0, 6).map(r => <RiddleCard key={r.id} r={r} />)}
            </div>
          </>
        )}
      </section>

      {/* LB + FEED */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionHeader title="Top Performers" link={{ to: "/leaderboard", label: "Full leaderboard" }} />
          <PerformersList rows={(lbQ.data ?? []).slice(0, 8)} />
        </div>
        <div>
          <SectionHeader title="Live Activity" />
          <div className="glass rounded-2xl p-3 max-h-[520px] overflow-y-auto space-y-2">
            {(feedQ.data ?? []).length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No submissions yet.</div>
            )}
            {(feedQ.data ?? []).map(f => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-2">
                <img src={avatarUrlFor(f.x_avatar_seed)} className="h-8 w-8 rounded-full border border-border" alt="" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    <span className="font-semibold">@{f.x_username}</span>{" "}
                    <span className={f.is_correct ? "text-ritual-green" : "text-muted-foreground"}>
                      {f.is_correct ? "cracked a riddle" : "took a shot"}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {new Date(f.created_at).toLocaleTimeString()}
                  </div>
                </div>
                {f.is_correct && <span className="text-xs font-mono text-pink-glow">+{f.xp_earned}xp</span>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, hint, link }: { title: string; hint?: string; link?: { to: string; label: string } }) {
  return (
    <div className="mb-4 mt-10 flex items-end justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
        {hint && <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{hint}</span>}
      </div>
      {link && (
        <Link to={link.to} className="text-xs uppercase tracking-wider text-accent hover:text-foreground">
          {link.label} →
        </Link>
      )}
    </div>
  );
}
