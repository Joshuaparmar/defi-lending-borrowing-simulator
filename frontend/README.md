# DeFi Lending and Borrowing Simulator

A browser-based educational prototype for the HBCC801 Decentralized Finance ISE assignment.

## Run it
1. Download and extract the project folder.
2. Open `index.html` in a modern browser (Chrome, Edge, or Firefox).
3. No package installation, backend, wallet, or API key is required.

You can also open the folder in VS Code and use the **Live Server** extension to serve `index.html`.

## Features
- Supply virtual USDC and ETH.
- Borrow virtual USDC against supplied collateral.
- Repay debt and withdraw supplied assets.
- Simulated debt interest at 5% APR.
- Collateral factor, liquidation threshold, available borrowing power, and health factor.
- Transaction log, validation, reset button, and responsive layout.

## Simplified assumptions
- USDC price: $1.
- ETH price: $2,000.
- Maximum borrowing: 75% of supplied collateral value.
- Liquidation threshold: 80% of supplied collateral value.
- Borrow APR: 5% (interest is accrued approximately over elapsed time while the page is open).
- Supply APR: 2% is displayed for learning context but is not added to supplied balances.
- Borrowing is limited to USDC.
- All balances are virtual; no wallet or blockchain is connected.

## Important limitation
This is a teaching simulator, not a production DeFi protocol. It does not model gas, oracle failures, pool liquidity, variable rates, liquidation execution, or smart-contract security. A health factor at or below 1.0 is shown as at risk; the app does not liquidate assets automatically.
