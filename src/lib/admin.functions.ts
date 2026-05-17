import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "./constants";

const Cred = z.object({ username: z.string(), password: z.string() });

function checkAuth(c: { username: string; password: string }) {
  if (c.username !== ADMIN_USERNAME || c.password !== ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => Cred.parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    return { ok: true };
  });

export const adminListAll = createServerFn({ method: "POST" })
  .inputValidator((d) => Cred.parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    const [r, s, b, a] = await Promise.all([
      supabaseAdmin.from("riddles").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("submissions").select("*").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("banned_wallets").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("announcements").select("*").order("created_at", { ascending: false }),
    ]);
    return {
      riddles: r.data ?? [],
      submissions: s.data ?? [],
      banned: b.data ?? [],
      announcements: a.data ?? [],
    };
  });

const RiddleInput = Cred.extend({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(2000),
  image_url: z.string().url().nullable().optional(),
  clues: z.array(z.string().min(1).max(500)).max(10),
  correct_answer: z.string().min(1).max(200),
  difficulty: z.enum(["easy", "medium", "hard", "legendary"]),
  xp_reward: z.number().int().min(0).max(100000),
  badge_title: z.string().min(1).max(60).default("Ritualist"),
  main_hint: z.string().max(500).default(""),
  creator_x_username: z.string().max(60).default(""),
  start_time: z.string(),
  end_time: z.string(),
  max_winners: z.number().int().min(1).max(100000),
  active: z.boolean(),
});

export const adminUpsertRiddle = createServerFn({ method: "POST" })
  .inputValidator((d) => RiddleInput.parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    const { username: _u, password: _p, id, ...row } = data;
    if (id) {
      const { data: out, error } = await supabaseAdmin
        .from("riddles").update(row).eq("id", id).select("*").single();
      if (error) throw new Error(error.message);
      return out;
    } else {
      const { data: out, error } = await supabaseAdmin
        .from("riddles").insert(row).select("*").single();
      if (error) throw new Error(error.message);
      return out;
    }
  });

export const adminDeleteRiddle = createServerFn({ method: "POST" })
  .inputValidator((d) => Cred.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    const { error } = await supabaseAdmin.from("riddles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleActive = createServerFn({ method: "POST" })
  .inputValidator((d) => Cred.extend({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    const { error } = await supabaseAdmin.from("riddles").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBanWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => Cred.extend({ wallet: z.string().min(8), reason: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    const { error } = await supabaseAdmin
      .from("banned_wallets")
      .upsert({ wallet_address: data.wallet.toLowerCase(), reason: data.reason ?? null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUnbanWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => Cred.extend({ wallet: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    await supabaseAdmin.from("banned_wallets").delete().ilike("wallet_address", data.wallet);
    return { ok: true };
  });

export const adminAnnounce = createServerFn({ method: "POST" })
  .inputValidator((d) => Cred.extend({ message: z.string().min(2).max(500) }).parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    const { error } = await supabaseAdmin.from("announcements").insert({ message: data.message });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d) => Cred.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    await supabaseAdmin.from("announcements").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteSubmission = createServerFn({ method: "POST" })
  .inputValidator((d) => Cred.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    checkAuth(data);
    await supabaseAdmin.from("submissions").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminUploadImage = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    Cred.extend({
      filename: z.string().min(1).max(120),
      mime: z.string().regex(/^image\/(png|jpeg|webp|jpg)$/),
      dataBase64: z.string().min(10),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    checkAuth(data);
    const bytes = Buffer.from(data.dataBase64, "base64");
    const ext = data.filename.split(".").pop()?.toLowerCase() || "png";
    const key = `riddles/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("riddle-images")
      .upload(key, bytes, { contentType: data.mime, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("riddle-images").getPublicUrl(key);
    return { url: pub.publicUrl };
  });
