import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Lock, Loader2, Sparkles, Download, Twitter, ExternalLink, Trophy, Zap, Clock, Eye } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { getRiddle, getLeaderboard, submitAnswer, getMySubmission } from "@/lib/quests.functions";
import { LeaderboardList } from "@/components/LeaderboardList";
import { Siggy, SiggyMini } from "@/components/Siggy";
import { useWallet } from "@/components/WalletButton";
import { sendRitualQuestTx } from "@/lib/wallet";
import { avatarUrlFor, RITUAL_CHAIN } from "@/lib/constants";
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
  const [showCard, setShowCard] = useState<null | { correct: boolean; xp: number; badge: string | null; ms: number; txHash: string }>(null);

  const m = useMutation({
    mutationFn: async () => {
      if (!addr) throw new Error("Connect wallet first");
      if (!xUser.trim()) throw new Error("Enter your X username");
      const txHash = await sendRitualQuestTx(addr, id, {
        xUsername: xUser.trim(),
        answer: answer.trim(),
      });
      const res = await submit({ data: {
        riddleId: id, wallet: addr, xUsername: xUser.trim(),
        answer: answer.trim(), txHash, startedAt,
      } });
      return { ...res, txHash };
    },
    onSuccess: (res) => {
      lb.refetch(); my.refetch();
      setShowCard({ correct: res.correct, xp: res.xpEarned, badge: res.badge, ms: res.submission.completion_time_ms, txHash: res.txHash });
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
        {riddle.main_hint && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm">
            <Sparkles className="size-4 mt-0.5 text-accent shrink-0" />
            <span className="italic text-foreground/90">{riddle.main_hint}</span>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-muted-foreground">
          <span className="rounded-full bg-secondary/60 px-3 py-1">⏱ {ended ? "ended" : countdown(riddle.end_time)}</span>
          <span className="rounded-full bg-secondary/60 px-3 py-1">👥 max {riddle.max_winners}</span>
        </div>

        {riddle.image_url && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border glow-cyan bg-secondary/30">
            <img src={riddle.image_url} alt={riddle.title} loading="lazy"
              className="w-full h-auto object-contain max-h-[520px] opacity-0 transition-opacity duration-500"
              onLoad={(e) => e.currentTarget.classList.remove("opacity-0")} />
          </div>
        )}

        {riddle.creator_x_username && (
          <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-accent/40 bg-secondary/40 px-4 py-3 glow-cyan">
            <div className="relative">
              <img src={`https://unavatar.io/x/${riddle.creator_x_username}`} alt={`@${riddle.creator_x_username}`}
                className="size-10 rounded-full ring-2 ring-accent/70"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${riddle.creator_x_username}`; }} />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-accent ring-2 ring-background" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Uploaded by</div>
              <a href={`https://x.com/${riddle.creator_x_username}`} target="_blank" rel="noreferrer"
                className="text-sm font-semibold text-foreground hover:text-accent">@{riddle.creator_x_username}</a>
            </div>
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
                {m.isPending ? <><Loader2 className="size-4 animate-spin" /> Confirm in wallet…</> : <><Sparkles className="size-4" /> Send onchain & submit</>}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">A 0-value tx on Ritual chain {RITUAL_CHAIN.id} · only gas, no funds sent.</p>
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

function XAvatar({ handle, size = 64 }: { handle: string; size?: number }) {
  const clean = handle.replace(/^@/, "");
  const [src, setSrc] = useState(`https://unavatar.io/x/${clean}?fallback=false`);
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="relative shrink-0 rounded-full p-[2px]"
      style={{
        width: size,
        height: size,
        background: "conic-gradient(from 180deg, #a78bfa, #22d3ee, #ec4899, #a78bfa)",
        boxShadow: "0 0 24px -4px rgba(167,139,250,.7)",
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full bg-[#0b0b1a]">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 to-white/0" />
        )}
        <img
          src={src}
          alt={`@${clean}`}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setSrc(avatarUrlFor(clean))}
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

function ShareCardModal({ data, onClose }: {
  data: { correct: boolean; xp: number; badge: string | null; ms: number; handle: string; title: string; txHash: string };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "https://ritualriddlequest.app";

  const dl = async () => {
    if (!ref.current) return;
    setDownloading(true);
    try {
      const url = await htmlToImage.toPng(ref.current, {
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: "#06060f",
        skipFonts: false,
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `ritual-riddle-${data.handle}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  const tweet = () => {
    const lines = data.correct
      ? [
          `🧩 I cracked a Ritual Riddle Quest onchain.`,
          `⚡ Earned +${data.xp} XP on Ritual Chain ${RITUAL_CHAIN.id}`,
          `🐈‍⬛ Guided by Siggy`,
          ``,
          `Think you can solve it too?`,
          `👉 ${shareUrl}`,
          ``,
          `#BuildOnRitual #RitualRiddles`,
        ]
      : [
          `🧩 Just submitted a Ritual Riddle Quest onchain.`,
          `Siggy is probably laughing at my answer 🐈‍⬛`,
          ``,
          `Can you solve it?`,
          `👉 ${shareUrl}`,
          ``,
          `#BuildOnRitual`,
        ];
    const t = encodeURIComponent(lines.join("\n"));
    window.open(`https://twitter.com/intent/tweet?text=${t}`, "_blank", "noopener,noreferrer");
  };

  const correct = data.correct;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-xl p-4 overflow-y-auto" onClick={onClose}>
      <div className="max-w-md w-full space-y-4 my-4" onClick={(e) => e.stopPropagation()}>
        {/* The card */}
        <div
          ref={ref}
          className="relative overflow-hidden rounded-[28px]"
          style={{
            aspectRatio: "4 / 5",
            background: correct
              ? "radial-gradient(120% 80% at 0% 0%, #2a1860 0%, transparent 55%), radial-gradient(120% 80% at 100% 100%, #0a3a4a 0%, transparent 55%), linear-gradient(160deg, #07071a 0%, #0a0420 60%, #06060f 100%)"
              : "radial-gradient(120% 80% at 0% 0%, #2a0a2a 0%, transparent 55%), radial-gradient(120% 80% at 100% 100%, #18001f 0%, transparent 55%), linear-gradient(160deg, #050008 0%, #0a0210 60%, #03000a 100%)",
            boxShadow: correct
              ? "0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px -20px rgba(139,92,246,0.55), 0 10px 40px -10px rgba(34,211,238,0.35)"
              : "0 0 0 1px rgba(255,255,255,0.05), 0 30px 80px -20px rgba(139,30,80,0.45), 0 10px 40px -10px rgba(80,20,120,0.35)",
          }}
        >
          {/* Holographic border */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[28px]"
            style={{
              padding: 1,
              background: correct
                ? "conic-gradient(from 130deg, #a78bfa55, #22d3ee55, #ec489955, #a78bfa55)"
                : "conic-gradient(from 130deg, #7c2d6f44, #4c1d9544, #1f1b3a44, #7c2d6f44)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
          {/* Floating glows */}
          {correct ? (
            <>
              <div className="absolute -top-16 -right-16 size-64 rounded-full blur-3xl opacity-60"
                style={{ background: "radial-gradient(circle, #22d3ee, transparent 65%)" }} />
              <div className="absolute -bottom-20 -left-20 size-72 rounded-full blur-3xl opacity-50"
                style={{ background: "radial-gradient(circle, #a78bfa, transparent 65%)" }} />
              <div className="absolute top-1/3 left-1/2 size-40 rounded-full blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle, #ec4899, transparent 65%)" }} />
            </>
          ) : (
            <>
              <div className="absolute -top-16 -right-16 size-64 rounded-full blur-3xl opacity-40"
                style={{ background: "radial-gradient(circle, #7c2d6f, transparent 65%)" }} />
              <div className="absolute -bottom-20 -left-20 size-72 rounded-full blur-3xl opacity-35"
                style={{ background: "radial-gradient(circle, #4c1d95, transparent 65%)" }} />
            </>
          )}
          {/* Noise */}
          <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")" }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

          <div className="relative h-full w-full flex flex-col p-7 text-white">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-white/50">Ritual Ecosystem</div>
                <div className="mt-1 text-[11px] font-mono text-cyan-300/90">chain {RITUAL_CHAIN.id} · onchain proof</div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 -m-3 rounded-full blur-2xl opacity-70"
                  style={{ background: "radial-gradient(circle, #fde68a, transparent 60%)" }} />
                <div className="relative animate-float">
                  <Siggy size={72} float={false} glow={false} />
                </div>
              </div>
            </div>

            {/* Title block */}
            <div className="mt-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.25em] backdrop-blur-md">
                {correct ? (
                  <><Trophy className="size-3 text-amber-300" /> Riddle Cracked</>
                ) : (
                  <><Eye className="size-3 text-fuchsia-300" /> Riddle Submitted</>
                )}
              </div>
              <h2 className="mt-3 font-display text-[28px] leading-[1.05] font-extrabold"
                style={{
                  backgroundImage: correct
                    ? "linear-gradient(135deg, #ffffff 0%, #a5f3fc 50%, #f9a8d4 100%)"
                    : "linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 50%, #f0abfc 100%)",
                  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                }}>
                {data.title}
              </h2>
              {!correct && (
                <p className="mt-2 text-[12px] italic text-white/60">
                  An attempt has been etched onto Ritual chain. Siggy is watching 👁️
                </p>
              )}
            </div>

            {/* User row */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
              <XAvatar handle={data.handle} size={56} />
              <div className="min-w-0">
                <div className="text-base font-semibold truncate">@{data.handle}</div>
                <div className="flex items-center gap-1 text-[11px] text-white/60 font-mono">
                  <Clock className="size-3" /> {fmtMs(data.ms)}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4">
              {correct ? (
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <div className="absolute inset-0 opacity-40"
                    style={{ background: "linear-gradient(135deg, rgba(34,211,238,.25), transparent 60%)" }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
                      <Zap className="size-3 text-cyan-300" /> XP Earned
                    </div>
                    <div className="text-3xl font-bold font-mono"
                      style={{ textShadow: "0 0 24px rgba(34,211,238,.55)" }}>+{data.xp}</div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 backdrop-blur-md">
                  <div className="relative flex items-center gap-2 text-[11px] text-white/70 font-mono uppercase tracking-[0.2em]">
                    <Eye className="size-3.5 text-fuchsia-300" /> Attempt recorded onchain
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-white/50">Ritual Riddle Quest</div>
                <div className="mt-1 text-[10px] font-mono text-white/40 truncate max-w-[180px]">
                  tx {data.txHash.slice(0, 10)}…{data.txHash.slice(-6)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Guided by</div>
                <div className="text-sm font-display font-bold bg-gradient-to-r from-amber-200 to-pink-300 bg-clip-text text-transparent">Siggy 🐈‍⬛</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={dl} disabled={downloading}
            className="flex-1 rounded-xl glass-strong py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 glow-cyan disabled:opacity-60 active:scale-[0.98] transition">
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {downloading ? "Rendering HD…" : "Download HD PNG"}
          </button>
          <button onClick={tweet}
            className="flex-1 rounded-xl bg-gradient-to-r from-primary via-accent to-pink-glow py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition">
            <Twitter className="size-4" /> Share on X
          </button>
        </div>
        <a href={`${RITUAL_CHAIN.explorer}/tx/${data.txHash}`} target="_blank" rel="noreferrer"
          className="flex w-full rounded-xl glass py-2.5 text-xs font-mono items-center justify-center gap-2 text-accent hover:text-foreground">
          <ExternalLink className="size-3.5" /> View tx on Ritual explorer
        </a>
        <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground">close</button>
      </div>
    </div>
  );
}
