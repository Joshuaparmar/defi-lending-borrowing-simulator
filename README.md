# DeFi Lending & Borrowing Simulator

A local blockchain-based decentralized finance (DeFi) simulator that demonstrates how users can supply assets, borrow against collateral, repay loans, and manage their positions through a simple web interface.

The project combines a Solidity smart contract, a Hardhat local blockchain, an Express.js backend, and a frontend built with HTML, CSS, and JavaScript.

> **Note:** This is an educational simulator that runs on a local development blockchain. It uses virtual demo balances and is not intended for real financial transactions.

## Features

- **Demo Funds:** Claim virtual ETH and USDC to explore the simulator.
- **Supply Assets:** Supply ETH or USDC to the protocol.
- **Collateral-Based Borrowing:** Borrow USDC against eligible collateral.
- **Repay Loans:** Make partial repayments or repay the entire outstanding debt.
- **Withdraw Assets:** Withdraw supplied assets when protocol rules permit.
- **Interest Accrual:** Simulate borrowing interest at a configured annual rate.
- **Health Factor:** Monitor the health of a borrowing position.
- **Collateral Limits:** Apply borrowing and liquidation thresholds.
- **Live Position Dashboard:** View supplied assets, outstanding debt, wallet balances, and borrowing capacity.
- **Transaction Feedback:** Receive feedback when protocol actions succeed or fail.
- **One-Click Startup:** Use `START_DEFI.bat` to launch the local blockchain, deploy the smart contract, start the backend, and open the frontend.

## Tech Stack

| Technology | Purpose |
|---|---|
| Solidity | Smart contract development |
| Hardhat 3 | Local blockchain and contract deployment |
| Viem | Smart contract interaction |
| Node.js | JavaScript runtime |
| Express.js | Backend API |
| HTML5 | Frontend structure |
| CSS3 | Frontend styling |
| JavaScript | Frontend interactions and API communication |
| Git & GitHub | Version control and source code hosting |

## Architecture

The application consists of three main layers.

1. **Frontend:** Provides the dashboard and forms for supplying, borrowing, repaying, and withdrawing assets.
2. **Backend API:** Uses Express.js to receive frontend requests and interact with the deployed smart contract through Viem.
3. **Smart Contract:** Implements asset accounting, collateral checks, borrowing, repayment, withdrawals, and interest calculations.

### Application Flow

```text
User
 |
 v
Frontend (HTML, CSS, JavaScript)
 |
 v
Express.js Backend API
 |
 v
Viem
 |
 v
Hardhat Local Blockchain
 |
 v
DeFiLending.sol
```

## Protocol Parameters

The simulator uses the following configured parameters:

| Parameter | Value |
|---|---:|
| Initial virtual ETH balance | 10 ETH |
| Initial virtual USDC balance | 10,000 USDC |
| ETH reference price | $2,000 |
| USDC reference price | $1 |
| Collateral factor | 75% |
| Liquidation threshold | 80% |
| Borrowing interest rate | 5% APR |
| Initial USDC market liquidity | 1,000,000 USDC |

These values are configuration parameters for the simulation, not live market prices or real financial terms.

## Project Structure

```text
defi_lending_simulator/
├── blockchain/
│   ├── contracts/
│   │   └── DeFiLending.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── hardhat.config.ts
│   └── package.json
│
├── server/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── README.md
│
├── START_DEFI.bat
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/)
- npm, which is included with Node.js
- [Git](https://git-scm.com/) (optional, for cloning the repository)

### Option 1: Run with the One-Click Launcher

On Windows:

1. Clone or download the repository.
2. Open the project folder.
3. Install dependencies in the `blockchain` and `server` directories if they have not already been installed.
4. Double-click `START_DEFI.bat`.
5. Wait for the local blockchain to start, the smart contract to deploy, and the backend API to become available.
6. Use the frontend opened in your browser.

Keep the Hardhat and backend terminal windows open while using the application.

### Option 2: Run Manually

Open separate terminals from the project root.

**Terminal 1 — Start the local blockchain**

```powershell
cd blockchain
npx hardhat node
```

**Terminal 2 — Deploy the smart contract**

With the blockchain running:

```powershell
cd blockchain
npx hardhat run scripts/deploy.ts --network localhost
```

Ensure the deployed contract address matches the address configured in the backend.

**Terminal 3 — Start the backend API**

```powershell
cd server
node server.js
```

**Frontend**

Open `frontend/index.html` in your browser.

### Install Dependencies

If you are setting up the project on a new machine, install the dependencies in each package directory:

```powershell
cd blockchain
npm install
```

Then, from the project root:

```powershell
cd server
npm install
```

Run these installation commands only once per setup, or when dependencies change.

## Local Development Endpoints

| Service | Address |
|---|---|
| Hardhat JSON-RPC | `http://127.0.0.1:8545` |
| Express backend | `http://127.0.0.1:3001` |
| Frontend | `frontend/index.html` |

The backend exposes API endpoints for checking status and position data and for submitting protocol actions.

## How to Use

1. Start the application.
2. Claim demo funds if needed.
3. Supply ETH or USDC.
4. Borrow USDC within the permitted collateral limit.
5. Repay part or all of your outstanding debt.
6. Withdraw assets when the contract's rules allow it.
7. Monitor your balances, borrowing capacity, health factor, and transaction feedback on the dashboard.

## Key Concepts Demonstrated

- **Collateral:** Assets supplied to support borrowing.
- **Collateral Factor:** The maximum proportion of collateral value eligible for borrowing.
- **Borrowing:** Obtaining USDC against eligible collateral, subject to protocol limits and available liquidity.
- **Interest Accrual:** An increase in outstanding debt over time based on the configured borrowing rate.
- **Health Factor:** An indicator of the position's collateral health relative to debt and the liquidation threshold.
- **Liquidation Threshold:** The configured threshold used to evaluate whether a borrowing position is at risk of liquidation.

## Important Limitations

- The project runs on a local Hardhat development blockchain.
- ETH and USDC balances are simulated; no real funds are transferred.
- Asset prices are fixed reference values rather than live oracle data.
- This is an educational prototype, not an audited DeFi protocol.
- The simulator should not be deployed to a public blockchain with its development credentials or configuration unchanged.

## Future Improvements

- Add automated contract and integration tests.
- Introduce configurable asset prices and a simulated price oracle.
- Improve transaction history and position analytics.
- Add more assets and lending markets.
- Improve error messages and frontend responsiveness.
- Add a dedicated liquidation demonstration and visual position monitoring.

## Author

Developed as an educational blockchain project to explore smart contracts, decentralized lending mechanics, and full-stack blockchain application development.
