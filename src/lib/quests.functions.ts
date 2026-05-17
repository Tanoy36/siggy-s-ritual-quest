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
    .select("id, wallet_address, x_username, x_avatar_seed, is_correct, xp_earned, created_at, riddle_id")
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
    return row;
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
      correct: isCorrect,
      capReached,
      xpEarned,
      badge,
    };
  });
