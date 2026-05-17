import { RITUAL_CHAIN } from "./constants";
import { keccak256, toHex, encodeFunctionData } from "viem";
import contractArtifact from "@/contracts/RitualRiddleQuest.json";

export const CONTRACT_ADDRESS: string =
  (contractArtifact as { address: string }).address || "";
export const CONTRACT_ABI = (contractArtifact as { abi: unknown[] }).abi;

/** Hash an offchain UUID into the bytes32 riddleId used by the contract. */
export const hashRiddleId = (uuid: string): `0x${string}` =>
  keccak256(toHex(uuid));

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

// Send a real on-chain quest submission. If the RitualRiddleQuest contract
// is deployed (address present in src/contracts/RitualRiddleQuest.json) we
// call submit(bytes32,string,string). Otherwise we fall back to a 0-value
// self-transaction with a memo so the flow still works pre-deploy.
export async function sendRitualQuestTx(
  wallet: string,
  riddleId: string,
  opts: { xUsername: string; answer: string },
): Promise<string> {
  const eth = getEthereum();
  if (!eth) throw new Error("No wallet detected");
  await ensureRitualChain();

  const txParams: Record<string, string> = { from: wallet, value: "0x0" };

  if (CONTRACT_ADDRESS) {
    txParams.to = CONTRACT_ADDRESS;
    txParams.data = encodeFunctionData({
      abi: CONTRACT_ABI as never,
      functionName: "submit",
      args: [
        hashRiddleId(riddleId),
        opts.xUsername.replace(/^@/, ""),
        opts.answer,
      ],
    });
  } else {
    // Pre-deploy fallback: encode a short memo as calldata in a self-tx.
    const memo = `RRQ:${riddleId}`;
    txParams.to = wallet;
    txParams.data =
      "0x" +
      Array.from(new TextEncoder().encode(memo))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
  }

  // Best-effort gas estimation. Fall back to a safe default if RPC rejects.
  try {
    const gas = (await eth.request({
      method: "eth_estimateGas",
      params: [txParams],
    })) as string;
    if (gas) txParams.gas = gas;
  } catch {
    txParams.gas = CONTRACT_ADDRESS ? "0x4C4B40" /* 5M */ : "0x186A0" /* 100k */;
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
