
import { network } from "hardhat";

const { viem } = await network.connect();

const contract = await viem.deployContract("DeFiLending");

console.log("DeFiLending deployed successfully.");
console.log("Contract address:", contract.address);
