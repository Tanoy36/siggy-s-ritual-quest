import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Lock, Loader2, Sparkles, Download, Twitter } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { getRiddle, getLeaderboard, submitAnswer, getMySubmission } from "@/lib/quests.functions";
import { LeaderboardList } from "@/components/LeaderboardList";
import { Siggy, SiggyMini } from "@/components/Siggy";
import { useWallet } from "@/components/WalletButton";
import { signRitualMessage } from "@/lib/wallet";
import { avatarUrlFor } from "@/lib/constants";
import { countdown, fmtMs } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/quests/$id")({
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/quests/$id" });
  const getR = useServerFn(getRiddle);
  const getLb = useServerFn(getLeaderboard);
  const getMy = useServerFn(getMySubmission);
  const submit = useServerFn(submitAnswer);

  const r = useQuery({ queryKey: ["riddle", id], queryFn: () => getR({ data: { id } }) });
  const lb = useQuery({ queryKey: ["lb", id], queryFn: () => getLb({ data: { riddleId: id } }) });

  const { addr, connect } = useWallet();
  const my = useQuery({
    queryKey: ["my", id, addr],
    queryFn: () => getMy({ data: { riddleId: id, wallet: addr! } }),
    enabled: !!addr,
  });

  useEffect(() => {
    const ch = supabase.channel(`r-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `riddle_id=eq.${id}` }, () => lb.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, lb]);

  const startedAt = useMemo(() => Date.now(), [id]);
  const [answer, setAnswer] = useState("");
  const [xUser, setXUser] = useState("");
  const [showCard, setShowCard] = useState<null | { correct: boolean; xp: number; badge: string | null; ms: number }>(null);

  const m = useMutation({
    mutationFn: async () => {
      if (!addr) throw new Error("Connect wallet first");
      if (!xUser.trim()) throw new Error("Enter your X username");
      const sig = await signRitualMessage(addr, id);
      const res = await submit({ data: {
        riddleId: id, wallet: addr, xUsername: xUser.trim(),
        answer: answer.trim(), signature: sig, startedAt,
      } });
      return res;
    },
    onSuccess: (res) => {
      lb.refetch(); my.refetch();
      setShowCard({ correct: res.correct, xp: res.xpEarned, badge: res.badge, ms: res.submission.completion_time_ms });
      if (res.correct) toast.success("Riddle cracked!", { description: `+${res.xpEarned} XP earned` });
      else toast.error("Not quite", { description: "Your answer didn't match. One shot per wallet." });
    },
    onError: (e) => toast.error("Submission failed", { description: (e as Error).message }),
  });

  if (r.isLoading) return <Loading />;
  if (r.error || !r.data) return <div className="p-16 text-center text-destructive">Riddle not found.</div>;
  const riddle = r.data;
  const ended = new Date(riddle.end_time).getTime() < Date.now();
  const locked = !addr;
  const already = !!my.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <SiggyMini size={22} /> Riddle · {riddle.difficulty} · {riddle.xp_reward} XP
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-holographic">{riddle.title}</h1>
        <p className="mt-3 text-muted-foreground">{riddle.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-muted-foreground">
          <span className="rounded-full bg-secondary/60 px-3 py-1">⏱ {ended ? "ended" : countdown(riddle.end_time)}</span>
          <span className="rounded-full bg-secondary/60 px-3 py-1">🏆 {riddle.badge_title}</span>
          <span className="rounded-full bg-secondary/60 px-3 py-1">👥 max {riddle.max_winners}</span>
        </div>

        {riddle.image_url && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border glow-cyan">
            <img src={riddle.image_url} alt="" className="w-full object-cover" />
          </div>
        )}

        {riddle.clues.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Clues</h3>
            {riddle.clues.map((c, i) => (
              <div key={i} className="glass rounded-xl p-4 text-sm">
                <span className="mr-2 font-mono text-accent">[{i + 1}]</span>{c}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 glass-strong border-glow rounded-2xl p-6">
          {already ? (
            <div className="text-center">
              <div className={`text-3xl mb-2 ${my.data!.is_correct ? "text-ritual-green" : "text-muted-foreground"}`}>
                {my.data!.is_correct ? "✓ You cracked it" : "✗ Already submitted"}
              </div>
              <p className="text-sm text-muted-foreground">One submission per wallet. Time: {fmtMs(my.data!.completion_time_ms)}</p>
            </div>
          ) : ended ? (
            <div className="text-center text-muted-foreground">This quest has ended.</div>
          ) : locked ? (
            <div className="text-center space-y-3">
              <Lock className="mx-auto size-8 text-accent" />
              <p className="text-sm text-muted-foreground">Connect your wallet on Ritual chain to attempt this riddle.</p>
              <button onClick={connect} className="rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold glow-cyan">
                Connect wallet
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">X (Twitter) handle</label>
                <input value={xUser} onChange={(e) => setXUser(e.target.value)} placeholder="@yourhandle"
                  className="w-full rounded-xl bg-input/60 border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Your answer</label>
                <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Decode the riddle..."
                  className="w-full rounded-xl bg-input/60 border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <button disabled={m.isPending} type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-accent to-pink-glow px-5 py-3 text-sm font-semibold text-primary-foreground glow-purple disabled:opacity-60">
                {m.isPending ? <><Loader2 className="size-4 animate-spin" /> Signing & submitting…</> : <><Sparkles className="size-4" /> Sign & submit</>}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">You'll sign a Ritual chain message · no funds spent.</p>
            </form>
          )}
        </div>

        {showCard && (
          <ShareCardModal data={{
            ...showCard,
            handle: xUser.replace(/^@/, "") || my.data?.x_username || "ritualist",
            title: riddle.title, badge: showCard.badge ?? riddle.badge_title,
          }} onClose={() => setShowCard(null)} />
        )}
      </div>

      <aside>
        <h3 className="mb-3 font-display text-lg font-bold">Riddle Leaderboard</h3>
        <LeaderboardList rows={lb.data ?? []} />
      </aside>
    </div>
  );
}

function Loading() {
  return <div className="p-24 text-center"><Loader2 className="mx-auto size-8 animate-spin text-accent" /></div>;
}

function ShareCardModal({ data, onClose }: {
  data: { correct: boolean; xp: number; badge: string | null; ms: number; handle: string; title: string };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dl = async () => {
    if (!ref.current) return;
    const url = await htmlToImage.toPng(ref.current, { pixelRatio: 2, cacheBust: true });
    const a = document.createElement("a"); a.href = url; a.download = `siggy-${data.handle}.png`; a.click();
  };
  const tweet = () => {
    const t = encodeURIComponent(`I just ${data.correct ? "cracked" : "attempted"} "${data.title}" on Ritual Riddle Quest 🐈‍⬛✨ +${data.xp} XP on Ritual.`);
    window.open(`https://twitter.com/intent/tweet?text=${t}`, "_blank");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <div ref={ref} className="relative overflow-hidden rounded-3xl p-8"
          style={{ background: "linear-gradient(135deg, oklch(0.15 0.08 290), oklch(0.10 0.05 250))",
                   boxShadow: "0 0 80px -10px oklch(0.65 0.28 305 / 0.6)" }}>
          <div className="absolute -top-10 -right-10 size-48 rounded-full blur-3xl"
            style={{ background: "var(--cyan-glow)", opacity: 0.3 }} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/60">Ritual Ecosystem</div>
              <Siggy size={56} float={false} glow={false} />
            </div>
            <div className="mt-6 text-3xl font-display font-bold text-white">{data.correct ? "Riddle Cracked" : "Quest Attempted"}</div>
            <div className="mt-1 text-sm text-white/70">{data.title}</div>
            <div className="mt-6 flex items-center gap-3">
              <img src={avatarUrlFor(data.handle)} className="size-14 rounded-full border-2 border-white/30" alt="" />
              <div>
                <div className="text-lg font-semibold text-white">@{data.handle}</div>
                <div className="text-xs text-white/60 font-mono">{fmtMs(data.ms)}</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-[10px] uppercase text-white/60">XP</div>
                <div className="text-2xl font-bold text-white font-mono">+{data.xp}</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-[10px] uppercase text-white/60">Title</div>
                <div className="text-sm font-bold text-white">{data.badge}</div>
              </div>
            </div>
            <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-white/40">siggy's riddle quest</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={dl} className="flex-1 rounded-xl glass-strong py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 glow-cyan">
            <Download className="size-4" /> Download PNG
          </button>
          <button onClick={tweet} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold inline-flex items-center justify-center gap-2">
            <Twitter className="size-4" /> Share on X
          </button>
        </div>
        <button onClick={onClose} className="w-full text-xs text-muted-foreground">close</button>
      </div>
    </div>
  );
}
