import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveAdmin, loadAdmin } from "@/lib/admin-session";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/lib/constants";
import { Siggy } from "@/components/Siggy";

export const Route = createFileRoute("/admin-login")({ component: Page });

function Page() {
  const nav = useNavigate();
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  // Persistent session: skip the form if already logged in
  useEffect(() => { if (loadAdmin()) nav({ to: "/admin-dashboard" }); }, [nav]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setLoading(true);
    // Instant local check — no server roundtrip on login itself.
    // Server functions still re-verify credentials on every privileged call.
    if (u.trim() === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
      saveAdmin({ username: u.trim(), password: p });
      toast.success("Welcome, Radiant Ritualist");
      nav({ to: "/admin-dashboard" });
      return;
    }
    setErr("Invalid credentials");
    setLoading(false);
  };
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-8">
      <div className="flex justify-center"><Siggy size={300} /></div>
      <form onSubmit={submit} className="glass-strong border-glow rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <Shield className="size-6 text-accent" />
          <h1 className="font-display text-2xl font-bold">Admin access</h1>
        </div>
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Username</label>
        <input value={u} onChange={(e) => setU(e.target.value)} autoComplete="off"
          className="mb-4 w-full rounded-xl bg-input/60 border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Password</label>
        <input type="password" value={p} onChange={(e) => setP(e.target.value)}
          className="mb-4 w-full rounded-xl bg-input/60 border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        {err && <div className="mb-4 rounded-lg bg-destructive/20 px-3 py-2 text-sm text-destructive animate-pulse">{err}</div>}
        <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold glow-purple inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />} Enter
        </button>
      </form>
    </div>
  );
}
