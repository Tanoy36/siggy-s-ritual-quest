// Pure-Node deploy script. Compiles RitualRiddleQuest.sol with solc and
// deploys it to Ritual chain (1979) using viem. Designed to run in the
// Lovable sandbox without installing the full Hardhat toolchain.
//
//   PRIVATE_KEY=0x... RPC_URL=https://rpc.ritualfoundation.org \
//   node scripts/deploy.mjs
//
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";
import { createWalletClient, createPublicClient, http, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL ?? "https://rpc.ritualfoundation.org";
const CHAIN_ID = 1979;

if (!PRIVATE_KEY) {
  console.error("Missing PRIVATE_KEY env var.");
  process.exit(1);
}

const ritual = defineChain({
  id: CHAIN_ID,
  name: "Ritual",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Ritual Explorer", url: "https://explorer.ritualfoundation.org" } },
});

const sourcePath = path.join(ROOT, "contracts/RitualRiddleQuest.sol");
const source = fs.readFileSync(sourcePath, "utf8");

console.log("→ Compiling RitualRiddleQuest.sol with solc", solc.version());
const input = {
  language: "Solidity",
  sources: { "RitualRiddleQuest.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === "error");
  for (const e of output.errors) console.log(e.formattedMessage);
  if (fatal.length) process.exit(1);
}
const artifact = output.contracts["RitualRiddleQuest.sol"]["RitualRiddleQuest"];
const abi = artifact.abi;
const bytecode = "0x" + artifact.evm.bytecode.object;

const account = privateKeyToAccount(PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
const wallet = createWalletClient({ account, chain: ritual, transport: http(RPC_URL) });
const pub = createPublicClient({ chain: ritual, transport: http(RPC_URL) });

console.log("→ Deployer:", account.address);
const bal = await pub.getBalance({ address: account.address });
console.log("→ Balance :", bal.toString(), "wei");
if (bal === 0n) {
  console.error("Deployer has 0 RITUAL. Fund the wallet on Ritual chain first.");
  process.exit(1);
}

console.log("→ Sending deploy tx…");
const hash = await wallet.deployContract({ abi, bytecode });
console.log("  tx:", hash);
const receipt = await pub.waitForTransactionReceipt({ hash });
if (!receipt.contractAddress) {
  console.error("Deploy failed; no contract address in receipt.");
  process.exit(1);
}
console.log("✓ Deployed:", receipt.contractAddress);
console.log("  block   :", receipt.blockNumber.toString());
console.log("  explorer:", `https://explorer.ritualfoundation.org/address/${receipt.contractAddress}`);

const outPath = path.join(ROOT, "src/contracts/RitualRiddleQuest.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({
  address: receipt.contractAddress,
  chainId: CHAIN_ID,
  abi,
  deployedAt: new Date().toISOString(),
  txHash: hash,
}, null, 2));
console.log("✓ Wrote   :", outPath);