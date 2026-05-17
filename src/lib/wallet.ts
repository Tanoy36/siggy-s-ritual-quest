import { RITUAL_CHAIN } from "./constants";

type Eth = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (e: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (e: string, cb: (...a: unknown[]) => void) => void;
};
declare global { interface Window { ethereum?: Eth } }

export const getEthereum = (): Eth | null =>
  typeof window !== "undefined" && window.ethereum ? window.ethereum : null;

export async function connectWallet(): Promise<string> {
  const eth = getEthereum();
  if (!eth) throw new Error("No EVM wallet detected. Install MetaMask or Rabby.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.[0]) throw new Error("No account");
  await ensureRitualChain();
  return accounts[0];
}

export async function ensureRitualChain() {
  const eth = getEthereum();
  if (!eth) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: RITUAL_CHAIN.hex }] });
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: RITUAL_CHAIN.hex,
          chainName: RITUAL_CHAIN.name,
          nativeCurrency: { name: RITUAL_CHAIN.symbol, symbol: RITUAL_CHAIN.symbol, decimals: 18 },
          rpcUrls: [RITUAL_CHAIN.rpcUrl],
          blockExplorerUrls: [RITUAL_CHAIN.explorer],
        }],
      });
    } else {
      throw e;
    }
  }
}

export async function signRitualMessage(wallet: string, riddleId: string): Promise<string> {
  const eth = getEthereum();
  if (!eth) throw new Error("No wallet");
  const msg = `🐈‍⬛ SIGGY'S RIDDLE QUEST\nRitual Chain ${RITUAL_CHAIN.id}\nRiddle: ${riddleId}\nWallet: ${wallet}\nTime: ${new Date().toISOString()}`;
  const hex = "0x" + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, "0")).join("");
  return (await eth.request({ method: "personal_sign", params: [hex, wallet] })) as string;
}

export function getStoredWallet(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("siggy-wallet");
}
export function storeWallet(addr: string | null) {
  if (typeof window === "undefined") return;
  if (addr) localStorage.setItem("siggy-wallet", addr);
  else localStorage.removeItem("siggy-wallet");
}
