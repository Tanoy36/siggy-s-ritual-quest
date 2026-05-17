import { useEffect, useState } from "react";
import { Wallet, LogOut } from "lucide-react";
import { connectWallet, getStoredWallet, storeWallet, getEthereum } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";
import { toast } from "sonner";

export function useWallet() {
  const [addr, setAddr] = useState<string | null>(null);
  useEffect(() => {
    setAddr(getStoredWallet());
    const eth = getEthereum();
    const onAccounts = (...args: unknown[]) => {
      const a = (args[0] as string[]) ?? [];
      setAddr(a[0] ?? null);
      storeWallet(a[0] ?? null);
    };
    eth?.on?.("accountsChanged", onAccounts);
    return () => eth?.removeListener?.("accountsChanged", onAccounts);
  }, []);

  const connect = async () => {
    try {
      const a = await connectWallet();
      setAddr(a); storeWallet(a);
      toast.success("Wallet linked", { description: shortAddr(a) });
    } catch (e) {
      toast.error("Wallet connection failed", { description: (e as Error).message });
    }
  };
  const disconnect = () => { setAddr(null); storeWallet(null); };

  return { addr, connect, disconnect };
}

export function WalletButton() {
  const { addr, connect, disconnect } = useWallet();
  if (!addr) {
    return (
      <button onClick={connect}
        className="group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-foreground glass border-glow transition-smooth hover:scale-[1.03] hover:glow-cyan">
        <Wallet className="size-4 text-accent" /> Connect Wallet
      </button>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-xl glass border-glow px-3 py-2 text-xs font-mono">
      <span className="size-2 rounded-full bg-ritual-green shadow-[0_0_10px_var(--ritual-green)] animate-pulse" />
      <span className="text-foreground/90">{shortAddr(addr)}</span>
      <button onClick={disconnect} title="Disconnect"
        className="ml-1 rounded-md p-1 text-muted-foreground hover:text-destructive transition-smooth">
        <LogOut className="size-3.5" />
      </button>
    </div>
  );
}
