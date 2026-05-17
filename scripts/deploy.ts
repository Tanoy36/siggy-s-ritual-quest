// Hardhat-compatible deploy script.
// Run with:  npx hardhat run scripts/deploy.ts --network ritual
//
// For this sandbox we ship a parallel pure-Node deploy at
// scripts/deploy.mjs that does the same thing using viem + solc, so
// the project does not need to install the full Hardhat toolchain to
// produce a deployment.
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer :", deployer.address);
  console.log("Network  :", network.name);

  const Factory = await ethers.getContractFactory("RitualRiddleQuest");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("Deployed :", address);

  const artifact = await import("../artifacts/contracts/RitualRiddleQuest.sol/RitualRiddleQuest.json", {
    assert: { type: "json" },
  });

  const out = {
    address,
    chainId: 1979,
    abi: (artifact as any).default.abi,
    deployedAt: new Date().toISOString(),
  };
  const outPath = path.resolve(__dirname, "../src/contracts/RitualRiddleQuest.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote    :", outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });