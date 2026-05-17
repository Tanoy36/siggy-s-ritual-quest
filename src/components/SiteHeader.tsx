import { Link } from "@tanstack/react-router";
import { Shield, Sparkles, Trophy } from "lucide-react";
import { SiggyMini } from "./Siggy";
import { WalletButton } from "./WalletButton";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="absolute inset-0 -z-10 backdrop-blur-xl bg-background/40 border-b border-border/60" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <SiggyMini size={40} />
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Ritual Ecosystem</div>
            <div className="font-display text-base font-bold text-holographic">SIGGY'S RIDDLE QUEST</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" icon={<Sparkles className="size-4" />}>Quests</NavLink>
          <NavLink to="/leaderboard" icon={<Trophy className="size-4" />}>Leaderboard</NavLink>
          <NavLink to="/admin-login" icon={<Shield className="size-4" />}>Admin Panel</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <WalletButton />
        </div>
      </div>
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
