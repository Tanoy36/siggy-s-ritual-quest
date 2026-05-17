import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, LogOut, Megaphone, Ban, Upload, Loader2, Power } from "lucide-react";
import {
  adminListAll, adminUpsertRiddle, adminDeleteRiddle, adminToggleActive,
  adminBanWallet, adminUnbanWallet, adminAnnounce, adminDeleteAnnouncement,
  adminDeleteSubmission, adminUploadImage,
} from "@/lib/admin.functions";
import { loadAdmin, clearAdmin } from "@/lib/admin-session";
import { shortAddr, fmtMs } from "@/lib/format";

export const Route = createFileRoute("/admin-dashboard")({ component: Page });

function Page() {
  const nav = useNavigate();
  const [creds, setCreds] = useState(loadAdmin());
  useEffect(() => { if (!creds) nav({ to: "/admin-login" }); }, [creds, nav]);
  if (!creds) return null;

  const listAll = useServerFn(adminListAll);
  const upsert = useServerFn(adminUpsertRiddle);
  const del = useServerFn(adminDeleteRiddle);
  const toggle = useServerFn(adminToggleActive);
  const ban = useServerFn(adminBanWallet);
  const unban = useServerFn(adminUnbanWallet);
  const announce = useServerFn(adminAnnounce);
  const delAnn = useServerFn(adminDeleteAnnouncement);
  const delSub = useServerFn(adminDeleteSubmission);
  const upload = useServerFn(adminUploadImage);

  const q = useQuery({ queryKey: ["admin-all"], queryFn: () => listAll({ data: creds }) });

  const refresh = () => q.refetch();
  const [tab, setTab] = useState<"riddles" | "submissions" | "bans" | "announcements">("riddles");

  const logout = () => { clearAdmin(); setCreds(null); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Radiant Ritualist Console</div>
          <h1 className="font-display text-3xl font-bold text-holographic">Admin Dashboard</h1>
        </div>
        <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl glass px-4 py-2 text-sm hover:text-destructive">
          <LogOut className="size-4" /> Logout
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["riddles", "submissions", "bans", "announcements"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm transition-smooth ${tab === t ? "bg-gradient-to-r from-primary to-accent text-primary-foreground glow-purple" : "glass hover:bg-secondary/60"}`}>
            {t}
          </button>
        ))}
      </div>

      {q.isLoading ? <Loader2 className="mx-auto size-6 animate-spin" /> : (
        <>
          {tab === "riddles" && <RiddlesTab data={q.data!.riddles} creds={creds} upsert={upsert} del={del} toggle={toggle} upload={upload} onChange={refresh} />}
          {tab === "submissions" && <SubsTab data={q.data!.submissions} creds={creds} delSub={delSub} onChange={refresh} />}
          {tab === "bans" && <BansTab data={q.data!.banned} creds={creds} ban={ban} unban={unban} onChange={refresh} />}
          {tab === "announcements" && <AnnsTab data={q.data!.announcements} creds={creds} announce={announce} delAnn={delAnn} onChange={refresh} />}
        </>
      )}
    </div>
  );
}

type Creds = { username: string; password: string };

function RiddlesTab({ data, creds, upsert, del, toggle, upload, onChange }: {
  data: any[]; creds: Creds;
  upsert: any; del: any; toggle: any; upload: any; onChange: () => void;
}) {
  const [editing, setEditing] = useState<any | null>(null);
  const blank = () => ({
    title: "", description: "", image_url: null, clues: [], correct_answer: "",
    difficulty: "medium", xp_reward: 100, badge_title: "Ritualist",
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    max_winners: 100, active: true,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
      <div className="space-y-3">
        <button onClick={() => setEditing(blank())} className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 glow-purple">
          <Plus className="size-4" /> New riddle
        </button>
        {data.map(r => (
          <div key={r.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.difficulty} · {r.xp_reward} XP · {r.active ? <span className="text-ritual-green">active</span> : <span className="text-muted-foreground">inactive</span>}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={async () => { await toggle({ data: { ...creds, id: r.id, active: !r.active } }); onChange(); }}
                  className="rounded-lg p-2 hover:bg-secondary" title="Toggle"><Power className="size-4" /></button>
                <button onClick={() => setEditing({ ...r, start_time: r.start_time.slice(0, 16), end_time: r.end_time.slice(0, 16) })}
                  className="rounded-lg p-2 hover:bg-secondary text-xs">Edit</button>
                <button onClick={async () => { if (confirm("Delete?")) { await del({ data: { ...creds, id: r.id } }); onChange(); } }}
                  className="rounded-lg p-2 hover:bg-destructive/20 text-destructive"><Trash2 className="size-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && <RiddleForm editing={editing} setEditing={setEditing} creds={creds} upsert={upsert} upload={upload} onSaved={onChange} />}
    </div>
  );
}

function RiddleForm({ editing, setEditing, creds, upsert, upload, onSaved }: any) {
  const [f, setF] = useState(editing);
  useEffect(() => setF(editing), [editing]);
  const [busy, setBusy] = useState(false);
  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    setBusy(true);
    try {
      const res = await upload({ data: { ...creds, filename: file.name, mime: file.type, dataBase64: b64 } });
      setF((x: any) => ({ ...x, image_url: res.url }));
      toast.success("Image uploaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true);
    try {
      await upsert({ data: {
        ...creds, ...f,
        clues: (f.clues || []).filter((c: string) => c.trim()),
        start_time: new Date(f.start_time).toISOString(),
        end_time: new Date(f.end_time).toISOString(),
        xp_reward: Number(f.xp_reward), max_winners: Number(f.max_winners),
      } });
      toast.success("Saved"); onSaved(); setEditing(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="glass-strong border-glow rounded-2xl p-5 space-y-3 sticky top-24 self-start">
      <Input label="Title" v={f.title} on={(v) => setF({ ...f, title: v })} />
      <Textarea label="Description" v={f.description} on={(v) => setF({ ...f, description: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Correct answer" v={f.correct_answer} on={(v) => setF({ ...f, correct_answer: v })} />
        <Input label="Badge title" v={f.badge_title} on={(v) => setF({ ...f, badge_title: v })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select label="Difficulty" v={f.difficulty} on={(v) => setF({ ...f, difficulty: v })} options={["easy", "medium", "hard", "legendary"]} />
        <Input label="XP" type="number" v={String(f.xp_reward)} on={(v) => setF({ ...f, xp_reward: Number(v) })} />
        <Input label="Max winners" type="number" v={String(f.max_winners)} on={(v) => setF({ ...f, max_winners: Number(v) })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Start" type="datetime-local" v={f.start_time} on={(v) => setF({ ...f, start_time: v })} />
        <Input label="End" type="datetime-local" v={f.end_time} on={(v) => setF({ ...f, end_time: v })} />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Clues (one per line)</label>
        <textarea value={(f.clues || []).join("\n")} onChange={(e) => setF({ ...f, clues: e.target.value.split("\n") })}
          rows={4} className="w-full rounded-xl bg-input/60 border border-border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Image hint (optional)</label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-6 text-sm hover:bg-secondary/50">
          <Upload className="size-4" /> {busy ? "Uploading…" : (f.image_url ? "Replace image" : "Upload JPG / PNG / WEBP")}
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
        {f.image_url && <img src={f.image_url} className="mt-2 max-h-40 rounded-lg" alt="" />}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active
      </label>
      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold glow-purple disabled:opacity-60">
          {busy ? "Saving…" : "Save riddle"}
        </button>
        <button onClick={() => setEditing(null)} className="rounded-xl glass px-4 py-3 text-sm">Cancel</button>
      </div>
    </div>
  );
}

function Input({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return <div><label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
    <input type={type} value={v} onChange={(e) => on(e.target.value)}
      className="w-full rounded-xl bg-input/60 border border-border px-3 py-2 text-sm" /></div>;
}
function Textarea({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return <div><label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
    <textarea value={v} onChange={(e) => on(e.target.value)} rows={3}
      className="w-full rounded-xl bg-input/60 border border-border px-3 py-2 text-sm" /></div>;
}
function Select({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: string[] }) {
  return <div><label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
    <select value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-xl bg-input/60 border border-border px-3 py-2 text-sm">
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select></div>;
}

function SubsTab({ data, creds, delSub, onChange }: any) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-3 py-2 text-left">When</th><th className="text-left">User</th><th className="text-left">Wallet</th><th>Correct</th><th>XP</th><th>Time</th><th></th></tr>
        </thead>
        <tbody>
          {data.map((s: any) => (
            <tr key={s.id} className="border-t border-border/60">
              <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
              <td>@{s.x_username}</td>
              <td className="font-mono text-xs">{shortAddr(s.wallet_address)}</td>
              <td className="text-center">{s.is_correct ? "✓" : "✗"}</td>
              <td className="text-center font-mono">{s.xp_earned}</td>
              <td className="text-center font-mono text-xs">{fmtMs(s.completion_time_ms)}</td>
              <td><button onClick={async () => { await delSub({ data: { ...creds, id: s.id } }); onChange(); }}
                className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="size-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BansTab({ data, creds, ban, unban, onChange }: any) {
  const [w, setW] = useState(""); const [r, setR] = useState("");
  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl p-5 flex flex-col md:flex-row gap-2">
        <input value={w} onChange={(e) => setW(e.target.value)} placeholder="0x wallet…"
          className="flex-1 rounded-xl bg-input/60 border border-border px-3 py-2 text-sm font-mono" />
        <input value={r} onChange={(e) => setR(e.target.value)} placeholder="reason"
          className="flex-1 rounded-xl bg-input/60 border border-border px-3 py-2 text-sm" />
        <button onClick={async () => { await ban({ data: { ...creds, wallet: w, reason: r } }); setW(""); setR(""); onChange(); }}
          className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold inline-flex items-center gap-2">
          <Ban className="size-4" /> Ban
        </button>
      </div>
      <div className="space-y-2">
        {data.map((b: any) => (
          <div key={b.wallet_address} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
            <div><div className="font-mono text-sm">{b.wallet_address}</div><div className="text-xs text-muted-foreground">{b.reason || " · "}</div></div>
            <button onClick={async () => { await unban({ data: { ...creds, wallet: b.wallet_address } }); onChange(); }}
              className="text-xs text-accent hover:text-foreground">Unban</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnsTab({ data, creds, announce, delAnn, onChange }: any) {
  const [m, setM] = useState("");
  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl p-5 flex gap-2">
        <input value={m} onChange={(e) => setM(e.target.value)} placeholder="Announce something to the ritualists…"
          className="flex-1 rounded-xl bg-input/60 border border-border px-3 py-2 text-sm" />
        <button onClick={async () => { if (!m.trim()) return; await announce({ data: { ...creds, message: m } }); setM(""); onChange(); }}
          className="rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold inline-flex items-center gap-2">
          <Megaphone className="size-4" /> Push
        </button>
      </div>
      <div className="space-y-2">
        {data.map((a: any) => (
          <div key={a.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div><div className="text-sm">{a.message}</div><div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div></div>
            <button onClick={async () => { await delAnn({ data: { ...creds, id: a.id } }); onChange(); }}
              className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
