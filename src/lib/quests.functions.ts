import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PublicRiddle = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  clues: string[];
  image_url: string | null;
  start_time: string;
  end_time: string;
  xp_reward: number;
  badge_title: string;
  max_winners: number;
  active: boolean;
  created_at: string;
  main_hint: string;
  creator_x_username: string;
};

export const listRiddles = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("riddles_public")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicRiddle[];
});

export const getRiddle = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: r, error } = await supabaseAdmin
      .from("riddles_public")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!r) throw new Error("Riddle not found");
    return r as PublicRiddle;
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((d: { riddleId?: string }) =>
    z.object({ riddleId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    // If scoped to a single riddle, gate winners behind reveal (quest end).
    if (data.riddleId) {
      const { data: r } = await supabaseAdmin
        .from("riddles")
        .select("end_time")
        .eq("id", data.riddleId)
        .maybeSingle();
      const revealed = !!r && new Date(r.end_time).getTime() <= Date.now();
      if (!revealed) return [];
    }
    let q = supabaseAdmin
      .from("submissions")
      .select("id, riddle_id, wallet_address, x_username, x_avatar_seed, is_correct, xp_earned, badge_title, completion_time_ms, created_at")
      .eq("is_correct", true)
      .order("xp_earned", { ascending: false })
      .order("completion_time_ms", { ascending: true })
      .limit(100);
    if (data.riddleId) q = q.eq("riddle_id", data.riddleId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getRecentActivity = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select("id, x_username, x_avatar_seed, is_correct, xp_earned, created_at, riddle_id")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getAnnouncements = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getMySubmission = createServerFn({ method: "GET" })
  .inputValidator((d: { riddleId: string; wallet: string }) =>
    z.object({ riddleId: z.string().uuid(), wallet: z.string().min(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("submissions")
      .select("*")
      .eq("riddle_id", data.riddleId)
      .ilike("wallet_address", data.wallet)
      .maybeSingle();
    if (!row) return null;
    const { data: r } = await supabaseAdmin
      .from("riddles")
      .select("end_time")
      .eq("id", data.riddleId)
      .maybeSingle();
    const revealed = !!r && new Date(r.end_time).getTime() <= Date.now();
    if (!revealed) {
      // Strip correctness/xp/badge until the quest ends.
      return { ...row, is_correct: null, xp_earned: 0, badge_title: null, answer: null, revealed: false };
    }
    return { ...row, revealed: true };
  });

/** Public participants list for a riddle — visible before reveal.
 *  Hides correctness, XP, and the answer text. */
export const getRiddleParticipants = createServerFn({ method: "GET" })
  .inputValidator((d: { riddleId: string }) =>
    z.object({ riddleId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("submissions")
      .select("id, x_username, x_avatar_seed, created_at, tx_hash")
      .eq("riddle_id", data.riddleId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ============================================================
 * Performers leaderboard
 * Aggregates submissions per X-handle. Wallet addresses are
 * never returned to clients. Used by:
 *   - global "/leaderboard"
 *   - home page top section
 *   - per-quest sidebar (pass riddleId)
 * Sorting rules:
 *   winners first → xp desc → best ms asc → first-seen asc
 * Streak = consecutive most-recent revealed-correct submissions
 * for that X-handle across ALL quests (pending quests do not
 * break a streak).
 * ============================================================ */
export type PerformerRow = {
  x_username: string;
  x_avatar_seed: string;
  xp: number;
  wins: number;
  attempts: number;
  streak: number;
  best_ms: number | null;
  last_at: string;
  status: "winner" | "incorrect" | "pending";
};

export const getPerformers = createServerFn({ method: "GET" })
  .inputValidator((d: { riddleId?: string }) =>
    z.object({ riddleId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<PerformerRow[]> => {
    const { data: subs, error } = await supabaseAdmin
      .from("submissions")
      .select("riddle_id, x_username, x_avatar_seed, is_correct, xp_earned, completion_time_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const allSubs = subs ?? [];
    const ids = Array.from(new Set(allSubs.map((s) => s.riddle_id)));
    let endMap = new Map<string, number>();
    if (ids.length) {
      const { data: rids } = await supabaseAdmin
        .from("riddles").select("id, end_time").in("id", ids);
      endMap = new Map((rids ?? []).map((r) => [r.id, new Date(r.end_time).getTime()]));
    }
    const now = Date.now();
    const isRevealed = (rid: string) => (endMap.get(rid) ?? Infinity) <= now;

    type Group = { handle: string; seed: string; subs: typeof allSubs };
    const byUser = new Map<string, Group>();
    for (const s of allSubs) {
      const key = s.x_username.toLowerCase();
      let g = byUser.get(key);
      if (!g) { g = { handle: key, seed: s.x_avatar_seed || key, subs: [] }; byUser.set(key, g); }
      g.subs.push(s);
    }

    const out: PerformerRow[] = [];
    for (const [, u] of byUser) {
      const sorted = [...u.subs].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      );

      // Global streak: most-recent consecutive revealed-correct.
      let streak = 0;
      for (const s of sorted) {
        if (!isRevealed(s.riddle_id)) continue;
        if (s.is_correct) streak += 1; else break;
      }

      let xp = 0, wins = 0, bestMs: number | null = null;
      for (const s of sorted) {
        if (isRevealed(s.riddle_id) && s.is_correct) {
          xp += s.xp_earned;
          wins += 1;
          if (bestMs === null || s.completion_time_ms < bestMs) bestMs = s.completion_time_ms;
        }
      }

      let status: PerformerRow["status"] = "pending";
      if (data.riddleId) {
        const here = sorted.find((s) => s.riddle_id === data.riddleId);
        if (!here) continue;
        status = !isRevealed(here.riddle_id)
          ? "pending"
          : here.is_correct ? "winner" : "incorrect";
      } else {
        const hasRevealedWrong = sorted.some(
          (s) => isRevealed(s.riddle_id) && !s.is_correct,
        );
        status = wins > 0 ? "winner" : (hasRevealedWrong ? "incorrect" : "pending");
      }

      out.push({
        x_username: u.handle,
        x_avatar_seed: u.seed,
        xp, wins, attempts: u.subs.length, streak,
        best_ms: bestMs,
        last_at: sorted[0].created_at,
        status,
      });
    }

    const rank = (r: PerformerRow) =>
      r.status === "winner" ? 0 : r.status === "pending" ? 1 : 2;
    out.sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (a.xp !== b.xp) return b.xp - a.xp;
      if (b.streak !== a.streak) return b.streak - a.streak;
      const am = a.best_ms ?? Infinity, bm = b.best_ms ?? Infinity;
      if (am !== bm) return am - bm;
      return +new Date(a.last_at) - +new Date(b.last_at);
    });

    return out.slice(0, 100);
  });

const SubmitSchema = z.object({
  riddleId: z.string().uuid(),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  xUsername: z.string().min(1).max(60).regex(/^@?[A-Za-z0-9_]{1,30}$/),
  answer: z.string().min(1).max(300),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  startedAt: z.number().int().positive(),
});

export const submitAnswer = createServerFn({ method: "POST" })
  .inputValidator((d) => SubmitSchema.parse(d))
  .handler(async ({ data }) => {
    const handle = data.xUsername.replace(/^@/, "").toLowerCase();

    // Already submitted?
    const { data: existing } = await supabaseAdmin
      .from("submissions")
      .select("id, is_correct")
      .eq("riddle_id", data.riddleId)
      .ilike("wallet_address", data.wallet)
      .maybeSingle();
    if (existing) throw new Error("This wallet already submitted for this riddle.");

    // Banned?
    const { data: banned } = await supabaseAdmin
      .from("banned_wallets")
      .select("wallet_address")
      .ilike("wallet_address", data.wallet)
      .maybeSingle();
    if (banned) throw new Error("Wallet is banned.");

    // Load riddle (with answer)
    const { data: r, error: rErr } = await supabaseAdmin
      .from("riddles")
      .select("*")
      .eq("id", data.riddleId)
      .maybeSingle();
    if (rErr || !r) throw new Error("Riddle not found");
    if (!r.active) throw new Error("Quest inactive");
    if (new Date(r.end_time).getTime() < Date.now()) throw new Error("Quest ended");
    if (new Date(r.start_time).getTime() > Date.now()) throw new Error("Quest not started");

    // Winner cap
    const { count } = await supabaseAdmin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("riddle_id", data.riddleId)
      .eq("is_correct", true);
    const capReached = (count ?? 0) >= r.max_winners;

    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const isCorrect = !capReached && normalize(data.answer) === normalize(r.correct_answer);
    const completionMs = Math.max(0, Date.now() - data.startedAt);

    const xpEarned = isCorrect ? r.xp_reward : 0;
    const badge = isCorrect ? r.badge_title : null;

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("submissions")
      .insert({
        riddle_id: data.riddleId,
        wallet_address: data.wallet,
        x_username: handle,
        x_avatar_seed: handle,
        answer: data.answer,
        is_correct: isCorrect,
        xp_earned: xpEarned,
        badge_title: badge,
        completion_time_ms: completionMs,
        tx_hash: data.txHash,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);

    return {
      submission: inserted,
      // Hide correctness from clients until the quest ends.
      correct: null as boolean | null,
      capReached,
      xpEarned: 0,
      badge: null as string | null,
      revealed: false,
    };
  });
