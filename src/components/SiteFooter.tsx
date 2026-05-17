import { RITUAL_CHAIN } from "@/lib/constants";
import { SiggyMini } from "./Siggy";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
        <div className="flex items-center gap-3">
          <SiggyMini size={28} />
          <span>© Ritual Riddle Quest · built on the Ritual Network</span>
        </div>
        <div className="font-mono">
          Chain ID {RITUAL_CHAIN.id} · <a className="hover:text-accent" target="_blank" rel="noreferrer" href={RITUAL_CHAIN.explorer}>Explorer</a>
        </div>
      </div>
    </footer>
  );
}
