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
  const msg = `🐈‍⬛ Ritual Riddle Quest\nRitual Chain ${RITUAL_CHAIN.id}\nRiddle: ${riddleId}\nWallet: ${wallet}\nTime: ${new Date().toISOString()}`;
  const hex = "0x" + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, "0")).join("");
  return (await eth.request({ method: "personal_sign", params: [hex, wallet] })) as string;
}

// Send a real on-chain quest interaction: 0-value self-transaction on Ritual chain.
// This proves wallet ownership and produces a real tx hash + explorer link.
export async function sendRitualQuestTx(wallet: string, riddleId: string): Promise<string> {
  const eth = getEthereum();
  if (!eth) throw new Error("No wallet detected");
  await ensureRitualChain();

  // Encode a short memo as calldata (hex of "RRQ:<riddleId>").
  const memo = `RRQ:${riddleId}`;
  const data =
    "0x" +
    Array.from(new TextEncoder().encode(memo))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

  const txParams: Record<string, string> = {
    from: wallet,
    to: wallet, // self-tx, no funds leave the wallet
    value: "0x0",
    data,
  };

  // Best-effort gas estimation. Fall back to a safe default if RPC rejects.
  try {
    const gas = (await eth.request({
      method: "eth_estimateGas",
      params: [txParams],
    })) as string;
    if (gas) txParams.gas = gas;
  } catch {
    txParams.gas = "0x186A0"; // 100k
  }

  const hash = (await eth.request({
    method: "eth_sendTransaction",
    params: [txParams],
  })) as string;

  if (!hash || !hash.startsWith("0x")) throw new Error("Transaction not broadcast");
  return hash;
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
