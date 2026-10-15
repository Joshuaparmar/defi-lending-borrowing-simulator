
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("DeFiLending", async function () {
  const { viem } = await network.connect();

  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  const deployContract = async () => {
    const contract = await viem.deployContract("DeFiLending");
    return contract;
  };

  it("allows a user to claim demo funds once", async function () {
    const contract = await deployContract();
    const [user] = walletClients;

    await contract.write.claimDemoFunds({
      account: user.account,
    });

    const ethBalance = await contract.read.virtualETH([user.account.address]);
    const usdcBalance = await contract.read.virtualUSDC([user.account.address]);

    assert.equal(ethBalance, parseEther("10"));
    assert.equal(usdcBalance, parseEther("10000"));

    await assert.rejects(
      contract.write.claimDemoFunds({ account: user.account }),
    );
  });

  it("allows supplying ETH and borrowing within the collateral limit", async function () {
    const contract = await deployContract();
    const [user] = walletClients;

    await contract.write.claimDemoFunds({ account: user.account });
    await contract.write.supplyETH([parseEther("1")], {
      account: user.account,
    });

    await contract.write.borrowUSDC([parseEther("1000")], {
      account: user.account,
    });

    const position = await contract.read.getPosition([user.account.address]);

    assert.equal(position[0], parseEther("1")); // supplied ETH
    assert.equal(position[2], parseEther("1000")); // borrowed USDC
    assert.equal(position[4], parseEther("11000")); // wallet USDC
  });

  it("rejects borrowing above the collateral limit", async function () {
    const contract = await deployContract();
    const [user] = walletClients;

    await contract.write.claimDemoFunds({ account: user.account });
    await contract.write.supplyETH([parseEther("1")], {
      account: user.account,
    });

    await assert.rejects(
      contract.write.borrowUSDC([parseEther("1600")], {
        account: user.account,
      }),
    );
  });

  it("allows repayment and restores market liquidity", async function () {
    const contract = await deployContract();
    const [user] = walletClients;

    await contract.write.claimDemoFunds({ account: user.account });
    await contract.write.supplyETH([parseEther("1")], {
      account: user.account,
    });
    await contract.write.borrowUSDC([parseEther("1000")], {
      account: user.account,
    });

    const liquidityBefore = await contract.read.marketLiquidityUSDC();

    await contract.write.repayUSDC([parseEther("400")], {
      account: user.account,
    });

    const position = await contract.read.getPosition([user.account.address]);
    const liquidityAfter = await contract.read.marketLiquidityUSDC();

    // Interest may accrue between transactions, so debt can exceed 600 USDC.
    assert.ok(position[2] >= parseEther("600"));
    assert.ok(position[2] < parseEther("601"));

    // Repayment reduces the wallet balance by the amount actually paid.
    assert.equal(
    position[4],
    parseEther("11000") - parseEther("400"),
    );

    // Market liquidity increases by the actual repayment amount.
    assert.equal(
    liquidityAfter - liquidityBefore,
    parseEther("400"),
    );  
});

  it("prevents withdrawing collateral that would exceed the borrow limit", async function () {
    const contract = await deployContract();
    const [user] = walletClients;

    await contract.write.claimDemoFunds({ account: user.account });
    await contract.write.supplyETH([parseEther("1")], {
      account: user.account,
    });
    await contract.write.borrowUSDC([parseEther("1000")], {
      account: user.account,
    });

    await assert.rejects(
      contract.write.withdrawETH([parseEther("0.6")], {
        account: user.account,
      }),
    );
  });
});
