
import express from "express";
import cors from "cors";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatEther,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3001;
const RPC_URL = "http://127.0.0.1:8545";

// Replace this with the address from your latest deployment.
const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

// Hardhat local account #0. For local demonstrations only.
// NEVER use this private key with real funds or on a public network.
const account = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);

const abi = parseAbi([
  "function claimDemoFunds()",
  "function supplyETH(uint256 amount)",
  "function supplyUSDC(uint256 amount)",
  "function borrowUSDC(uint256 amount)",
  "function repayUSDC(uint256 amount)",
  "function repayAllUSDC()",
  "function withdrawETH(uint256 amount)",
  "function withdrawUSDC(uint256 amount)",
  "function getPosition(address user) view returns (uint256 suppliedETH, uint256 suppliedUSDC, uint256 borrowedUSDC, uint256 ethWallet, uint256 usdcWallet)",
  "function healthFactorBps(address user) view returns (uint256)",
  "function collateralValueUSD(address user) view returns (uint256)",
  "function marketLiquidityUSDC() view returns (uint256)",
  "function claimedDemoFunds(address user) view returns (bool)",
  "function BORROW_APR_BPS() view returns (uint256)",
  "function COLLATERAL_FACTOR_BPS() view returns (uint256)",
  "function LIQUIDATION_THRESHOLD_BPS() view returns (uint256)",
]);

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  transport: http(RPC_URL),
});

async function sendContractTransaction(functionName, args = []) {
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName,
    args,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error("Blockchain transaction failed");
  }

  return { hash };
}

// Check the local blockchain connection.
app.get("/api/status", async (_req, res) => {
  try {
    const blockNumber = await publicClient.getBlockNumber();

    res.json({
      connected: true,
      network: "Hardhat local",
      blockNumber: blockNumber.toString(),
      contractAddress: CONTRACT_ADDRESS,
      account: account.address,
    });
  } catch (error) {
    res.status(503).json({
      connected: false,
      error:
        "Cannot connect to local Hardhat node. Start it with npx hardhat node.",
    });
  }
});

// Read the current user's position from the smart contract.
app.get("/api/position", async (_req, res) => {
  try {
    const [
      position,
      healthBps,
      collateral,
      liquidity,
      claimed,
      borrowAPR,
      collateralFactor,
      liquidationThreshold,
    ] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "getPosition",
        args: [account.address],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "healthFactorBps",
        args: [account.address],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "collateralValueUSD",
        args: [account.address],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "marketLiquidityUSDC",
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "claimedDemoFunds",
        args: [account.address],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "BORROW_APR_BPS",
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "COLLATERAL_FACTOR_BPS",
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "LIQUIDATION_THRESHOLD_BPS",
      }),
    ]);

    res.json({
      account: account.address,
      suppliedETH: formatEther(position[0]),
      suppliedUSDC: formatEther(position[1]),
      borrowedUSDC: formatEther(position[2]),
      walletETH: formatEther(position[3]),
      walletUSDC: formatEther(position[4]),
      collateralValueUSD: formatEther(collateral),
      healthFactor:
        healthBps === 2n ** 256n - 1n
          ? null
          : (Number(healthBps) / 10000).toFixed(4),
      marketLiquidityUSDC: formatEther(liquidity),
      claimedDemoFunds: claimed,
      borrowAPRPercent: Number(borrowAPR) / 100,
      collateralFactorPercent: Number(collateralFactor) / 100,
      liquidationThresholdPercent: Number(liquidationThreshold) / 100,
    });
  } catch (error) {
    res.status(500).json({
      error: error.shortMessage || error.message,
    });
  }
});

// Execute local simulator actions.
app.post("/api/action", async (req, res) => {
  try {
    const { action, amount } = req.body ?? {};

    if (action === "claimDemoFunds") {
      const result = await sendContractTransaction("claimDemoFunds");
      return res.json({ success: true, ...result });
    }

    // Repay the entire accrued debt without a frontend-rounded amount.
    if (action === "repayAllUSDC") {
      const result = await sendContractTransaction("repayAllUSDC");
      return res.json({ success: true, ...result });
    }

    const validActions = {
      supplyETH: "supplyETH",
      supplyUSDC: "supplyUSDC",
      borrowUSDC: "borrowUSDC",
      repayUSDC: "repayUSDC",
      withdrawETH: "withdrawETH",
      withdrawUSDC: "withdrawUSDC",
    };

    const functionName = validActions[action];

    if (!functionName) {
      return res.status(400).json({
        error: "Unknown action",
      });
    }

    if (
      typeof amount !== "string" ||
      !/^\d+(\.\d{1,18})?$/.test(amount) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        error: "Enter a positive amount with up to 18 decimal places",
      });
    }

    const result = await sendContractTransaction(functionName, [
      parseEther(amount),
    ]);

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({
      error: error.shortMessage || error.message || "Transaction failed",
    });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`DeFi local API running at http://127.0.0.1:${PORT}`);
});
