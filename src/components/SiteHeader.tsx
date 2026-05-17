import { Link } from "@tanstack/react-router";
import { Info, Menu, Shield, Sparkles, Trophy, X } from "lucide-react";
import { useState } from "react";
import { SiggyMini } from "./Siggy";
import { WalletButton } from "./WalletButton";

const NAV = [
  { to: "/", label: "Live Quests", icon: <Sparkles className="size-4" /> },
  { to: "/leaderboard", label: "Leaderboard", icon: <Trophy className="size-4" /> },
  { to: "/about", label: "About", icon: <Info className="size-4" /> },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="absolute inset-0 -z-10 backdrop-blur-xl bg-background/40 border-b border-border/60" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link to="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <SiggyMini size={40} />
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Ritual Ecosystem</div>
            <div className="font-display text-base font-bold text-holographic">Ritual Riddle Quest</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map(n => <NavLink key={n.to} to={n.to} icon={n.icon}>{n.label}</NavLink>)}
          <Link to="/admin-login"
            className="ml-2 inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent transition-smooth hover:bg-accent/20 hover:glow-cyan">
            <Shield className="size-4" /> Admin Panel
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block"><WalletButton /></div>
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary/40 p-2 lg:hidden">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border/60 backdrop-blur-xl bg-background/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4">
            {NAV.map(n => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "text-foreground bg-secondary/60" }}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40">
                {n.icon}{n.label}
              </Link>
            ))}
            <Link to="/admin-login" onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-3 text-sm font-semibold text-accent">
              <Shield className="size-4" /> Admin Panel
            </Link>
            <div className="sm:hidden pt-2"><WalletButton /></div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link to={to}
      activeOptions={{ exact: to === "/" }}
      activeProps={{ className: "text-foreground bg-secondary/50 glow-cyan" }}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground hover:bg-secondary/40">
      {icon}{children}
    </Link>
  );
}
