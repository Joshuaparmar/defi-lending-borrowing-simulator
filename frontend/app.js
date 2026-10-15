
"use strict";

// DeFiLab - Local DeFi Lending & Borrowing Simulator
// Educational prototype for a local Hardhat blockchain only.
// No real cryptocurrency or external wallet is used.

const API_BASE = "http://127.0.0.1:3001/api";
const MAX_DECIMALS = 6;
const AMOUNT_SCALE = 1_000_000;

const state = {
  tab: "supply",
  status: null,
  position: null,
  busy: false,
  activity: []
};

const $ = (id) => document.getElementById(id);

const elements = {
  claimFundsBtn: $("claimFundsBtn"),
  resetBtn: $("resetBtn"),
  connectionLabel: $("connectionLabel"),
  connectionDetail: $("connectionDetail"),

  suppliedValue: $("suppliedValue"),
  debtValue: $("debtValue"),
  debtFoot: $("debtFoot"),
  availableValue: $("availableValue"),
  healthValue: $("healthValue"),
  healthBar: $("healthBar"),
  healthFoot: $("healthFoot"),

  tabs: [...document.querySelectorAll("[data-tab]")],
  actionForm: $("actionForm"),
  assetSelect: $("assetSelect"),
  amountInput: $("amountInput"),
  assetUnit: $("assetUnit"),
  amountHint: $("amountHint"),
  maxBtn: $("maxBtn"),
  repayAllBtn: $("repayAllBtn"),
  actionInfo: $("actionInfo"),
  submitBtn: $("submitBtn"),
  message: $("message"),

  walletUSDC: $("walletUSDC"),
  walletUSDCValue: $("walletUSDCValue"),
  walletETH: $("walletETH"),
  walletETHValue: $("walletETHValue"),
  suppliedUSDC: $("suppliedUSDC"),
  suppliedUSDCValue: $("suppliedUSDCValue"),
  suppliedETH: $("suppliedETH"),
  suppliedETHValue: $("suppliedETHValue"),
  borrowedDetail: $("borrowedDetail"),
  borrowedUSDC: $("borrowedUSDC"),
  collateralValue: $("collateralValue"),
  collateralBar: $("collateralBar"),
  maxBorrowLabel: $("maxBorrowLabel"),
  riskBadge: $("riskBadge"),
  riskExplainer: $("riskExplainer"),

  clearLogBtn: $("clearLogBtn"),
  activityList: $("activityList")
};

// ---------- Formatting ----------

function formatNumber(value, maximumFractionDigits = 4) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) return "—";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(number);
}

function formatUSD(value) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) return "$—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(number);
}

function numeric(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Round down, never up. Used for the Max amount field.
function roundDownAmount(value, decimals = MAX_DECIMALS) {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const scale = 10 ** decimals;
  return Math.floor((value + Number.EPSILON) * scale) / scale;
}

// ---------- Messages and busy state ----------

function setMessage(message, type = "success") {
  if (!elements.message) return;

  elements.message.textContent = message;
  elements.message.classList.toggle("error", type === "error");
  elements.message.hidden = false;
}

function clearMessage() {
  if (!elements.message) return;

  elements.message.textContent = "";
  elements.message.hidden = true;
  elements.message.classList.remove("error");
}

function setBusy(isBusy) {
  state.busy = isBusy;

  if (elements.claimFundsBtn) {
    elements.claimFundsBtn.disabled =
      isBusy || Boolean(state.position?.claimedDemoFunds);
  }

  if (elements.resetBtn) {
    elements.resetBtn.disabled = isBusy;
  }

  if (elements.submitBtn) {
    elements.submitBtn.disabled = isBusy;
    elements.submitBtn.textContent = isBusy
      ? "Processing..."
      : getSubmitLabel();
  }

  if (elements.maxBtn) {
    elements.maxBtn.disabled = isBusy;
  }

  if (elements.repayAllBtn) {
    elements.repayAllBtn.disabled = isBusy;
  }

  if (elements.clearLogBtn) {
    elements.clearLogBtn.disabled = isBusy;
  }

  if (elements.assetSelect) {
    elements.assetSelect.disabled = isBusy;
  }

  if (elements.amountInput) {
    elements.amountInput.disabled = isBusy;
  }

  elements.tabs.forEach((button) => {
    button.disabled = isBusy;
  });
}

function getSubmitLabel() {
  const labels = {
    supply: "Supply assets",
    borrow: "Borrow USDC",
    repay: "Repay USDC",
    withdraw: "Withdraw assets"
  };

  return labels[state.tab] || "Submit transaction";
}

// ---------- API ----------

async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error(
      "Cannot connect to the local API. Make sure the Hardhat node and Express server are running."
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    const detail =
      data?.detail ||
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    );
  }

  return data;
}

async function loadStatus() {
  state.status = await apiRequest("/status");
  renderConnection();
}

async function loadPosition() {
  state.position = await apiRequest("/position");
  renderDashboard();
}

async function refreshAll() {
  try {
    await Promise.all([loadStatus(), loadPosition()]);
    return true;
  } catch (error) {
    renderConnection(error.message);
    setMessage(error.message, "error");
    throw error;
  }
}

// ---------- Connection status ----------

function renderConnection(errorMessage = "") {
  const status = state.status || {};

  const connected =
    !errorMessage &&
    status.connected !== false &&
    status.ok !== false &&
    Boolean(state.position);

  if (elements.connectionLabel) {
    elements.connectionLabel.textContent = connected
      ? "Local blockchain connected"
      : "Local blockchain disconnected";

    elements.connectionLabel.classList.toggle("connected", connected);
    elements.connectionLabel.classList.toggle("disconnected", !connected);
  }

  if (elements.connectionDetail) {
    if (connected) {
      const chain =
        status.chainId !== undefined
          ? `Chain ID: ${status.chainId}`
          : status.network || "Connected to your local simulator";

      const address =
        status.contractAddress || status.address || "";

      elements.connectionDetail.textContent = address
        ? `${chain} · Contract: ${address}`
        : chain;
    } else {
      elements.connectionDetail.textContent =
        errorMessage ||
        "Start your local Hardhat node and API server, then refresh.";
    }
  }
}

// ---------- Position and risk calculations ----------

function getPositionValues() {
  const position = state.position || {};

  const suppliedETH = numeric(position.suppliedETH);
  const suppliedUSDC = numeric(position.suppliedUSDC);
  const borrowedUSDC = numeric(position.borrowedUSDC);
  const walletETH = numeric(position.walletETH);
  const walletUSDC = numeric(position.walletUSDC);

  const collateralValueUSD =
    position.collateralValueUSD !== undefined
      ? numeric(position.collateralValueUSD)
      : suppliedETH * 2000 + suppliedUSDC;

  const collateralFactor = numeric(
    position.collateralFactorPercent ?? 75
  );

  const liquidationThreshold = numeric(
    position.liquidationThresholdPercent ?? 80
  );

  const maxBorrow = collateralValueUSD * collateralFactor / 100;
  const availableBorrow = Math.max(0, maxBorrow - borrowedUSDC);

  let healthFactor;

  if (
    position.healthFactor !== undefined &&
    position.healthFactor !== null
  ) {
    healthFactor = numeric(position.healthFactor);
  } else if (borrowedUSDC <= 0) {
    healthFactor = Infinity;
  } else {
    healthFactor =
      collateralValueUSD * liquidationThreshold / 100 / borrowedUSDC;
  }

  return {
    suppliedETH,
    suppliedUSDC,
    borrowedUSDC,
    walletETH,
    walletUSDC,
    collateralValueUSD,
    collateralFactor,
    liquidationThreshold,
    maxBorrow,
    availableBorrow,
    healthFactor
  };
}

function renderDashboard() {
  const p = getPositionValues();
  const position = state.position || {};

  const totalSupplied = p.suppliedETH * 2000 + p.suppliedUSDC;

  if (elements.suppliedValue) {
    elements.suppliedValue.textContent = formatUSD(totalSupplied);
  }

  if (elements.debtValue) {
    elements.debtValue.textContent = formatUSD(p.borrowedUSDC);
  }

  if (elements.debtFoot) {
    elements.debtFoot.textContent =
      `Borrow APR: ${formatNumber(position.borrowAPRPercent ?? 5, 2)}%`;
  }

  if (elements.availableValue) {
    elements.availableValue.textContent = formatUSD(p.availableBorrow);
  }

  if (elements.healthValue) {
    elements.healthValue.textContent = Number.isFinite(p.healthFactor)
      ? formatNumber(p.healthFactor, 2)
      : "∞";
  }

  const healthPercent = Number.isFinite(p.healthFactor)
    ? Math.min(100, Math.max(0, p.healthFactor / 3 * 100))
    : 100;

  if (elements.healthBar) {
    elements.healthBar.style.width = `${healthPercent}%`;
    elements.healthBar.style.background = getHealthColor(p.healthFactor);
  }

  if (elements.healthFoot) {
    elements.healthFoot.textContent = Number.isFinite(p.healthFactor)
      ? p.healthFactor <= 1
        ? "At or below liquidation threshold"
        : p.healthFactor < 1.5
          ? "Liquidation risk is elevated"
          : "Position health is above the risk threshold"
      : "No outstanding debt";
  }

  if (elements.walletUSDC) {
    elements.walletUSDC.textContent = formatNumber(p.walletUSDC);
  }

  if (elements.walletUSDCValue) {
    elements.walletUSDCValue.textContent = formatUSD(p.walletUSDC);
  }

  if (elements.walletETH) {
    elements.walletETH.textContent = `${formatNumber(p.walletETH)} ETH`;
  }

  if (elements.walletETHValue) {
    elements.walletETHValue.textContent = formatUSD(p.walletETH * 2000);
  }

  if (elements.suppliedUSDC) {
    elements.suppliedUSDC.textContent =
      `${formatNumber(p.suppliedUSDC)} USDC`;
  }

  if (elements.suppliedUSDCValue) {
    elements.suppliedUSDCValue.textContent = formatUSD(p.suppliedUSDC);
  }

  if (elements.suppliedETH) {
    elements.suppliedETH.textContent = `${formatNumber(p.suppliedETH)} ETH`;
  }

  if (elements.suppliedETHValue) {
    elements.suppliedETHValue.textContent = formatUSD(p.suppliedETH * 2000);
  }

  if (elements.borrowedDetail) {
    elements.borrowedDetail.textContent =
      `${formatNumber(p.borrowedUSDC, 6)} USDC borrowed`;
  }

  if (elements.borrowedUSDC) {
    elements.borrowedUSDC.textContent =
      `${formatNumber(p.borrowedUSDC, 6)} USDC`;
  }

  if (elements.collateralValue) {
    elements.collateralValue.textContent = formatUSD(p.collateralValueUSD);
  }

  const collateralPercent = p.maxBorrow > 0
    ? Math.min(100, p.borrowedUSDC / p.maxBorrow * 100)
    : 0;

  if (elements.collateralBar) {
    elements.collateralBar.style.width = `${collateralPercent}%`;
    elements.collateralBar.style.background =
      collateralPercent >= 90
        ? "var(--red)"
        : collateralPercent >= 70
          ? "var(--amber)"
          : "var(--mint)";
  }

  if (elements.maxBorrowLabel) {
    elements.maxBorrowLabel.textContent =
      `Borrow limit: ${formatUSD(p.maxBorrow)}`;
  }

  renderRisk(p);

  if (elements.claimFundsBtn) {
    const claimed = Boolean(position.claimedDemoFunds);
    elements.claimFundsBtn.disabled = state.busy || claimed;
    elements.claimFundsBtn.textContent = claimed
      ? "Demo funds claimed"
      : "Claim demo funds";
  }

  renderConnection();
  updateActionForm();
}

function getHealthColor(healthFactor) {
  if (healthFactor <= 1) return "var(--red)";
  if (healthFactor < 1.5) return "var(--amber)";
  return "var(--mint)";
}

function renderRisk(p) {
  let label;
  let className;
  let explanation;

  if (p.borrowedUSDC <= 0) {
    label = "No debt";
    className = "safe";
    explanation =
      "You have no outstanding USDC debt, so this position currently has no borrowing-related liquidation risk.";
  } else if (p.healthFactor <= 1) {
    label = "Critical";
    className = "danger";
    explanation =
      "The health factor is at or below 1. The simulated position is at the liquidation threshold. Add collateral or repay debt.";
  } else if (p.healthFactor < 1.5) {
    label = "Caution";
    className = "caution";
    explanation =
      "Your position has a smaller safety margin. Adding collateral or repaying some debt can improve its health factor.";
  } else {
    label = "Healthy";
    className = "safe";
    explanation =
      "Your position is above the simulator's warning range. Collateral values and debt changes can still increase risk.";
  }

  if (elements.riskBadge) {
    elements.riskBadge.textContent = label;
    elements.riskBadge.className = `risk-badge ${className}`;
  }

  if (elements.riskExplainer) {
    elements.riskExplainer.textContent = explanation;
  }
}

// ---------- Action form ----------

function updateActionForm() {
  if (!elements.assetSelect || !elements.amountInput) return;

  const action = state.tab;
  const asset = elements.assetSelect.value || "USDC";
  const p = getPositionValues();

  const assetIsETH = asset === "ETH";
  const unit = assetIsETH ? "ETH" : "USDC";

  if (elements.assetUnit) {
    elements.assetUnit.textContent = unit;
  }

  if (elements.amountHint) {
    if (action === "borrow") {
      elements.amountHint.textContent =
        `Available borrowing capacity: ${formatUSD(p.availableBorrow)}`;
    } else if (action === "supply") {
      elements.amountHint.textContent =
        `Wallet balance: ${formatNumber(
          assetIsETH ? p.walletETH : p.walletUSDC
        )} ${unit}`;
    } else if (action === "repay") {
      elements.amountHint.textContent =
        `Outstanding debt: ${formatNumber(p.borrowedUSDC, 6)} USDC`;
    } else {
      elements.amountHint.textContent =
        `Supplied balance: ${formatNumber(
          assetIsETH ? p.suppliedETH : p.suppliedUSDC
        )} ${unit}`;
    }
  }

  if (elements.actionInfo) {
    const messages = {
      supply:
        "Supply virtual assets to the lending pool. Supplied ETH counts as collateral in this simulator.",
      borrow:
        "Borrow USDC against eligible collateral. Your borrowing amount is limited by the configured collateral factor.",
      repay:
        "Repay outstanding USDC debt using your simulated wallet balance. Use Repay All to clear the full outstanding debt.",
      withdraw:
        "Withdraw assets from your supplied balance. ETH withdrawals can reduce collateral and borrowing capacity."
    };

    elements.actionInfo.textContent = messages[action] || "";
  }

  if (elements.submitBtn) {
    elements.submitBtn.textContent = state.busy
      ? "Processing..."
      : getSubmitLabel();
  }

  if (elements.claimFundsBtn) {
    elements.claimFundsBtn.disabled =
      state.busy || Boolean(state.position?.claimedDemoFunds);
  }

  if (elements.repayAllBtn) {
    elements.repayAllBtn.hidden =
      state.tab !== "repay" || p.borrowedUSDC <= 0;

    elements.repayAllBtn.disabled = state.busy;
  }
}

function setActiveTab(tab) {
  if (!["supply", "borrow", "repay", "withdraw"].includes(tab)) return;
  if (state.busy) return;

  state.tab = tab;

  elements.tabs.forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  if (elements.assetSelect) {
    const currentAsset = elements.assetSelect.value;

    if (tab === "borrow" || tab === "repay") {
      elements.assetSelect.value = "USDC";
    } else if (!currentAsset) {
      elements.assetSelect.value = "ETH";
    }
  }

  if (elements.amountInput) {
    elements.amountInput.value = "";
  }

  clearMessage();
  updateActionForm();
}

// ---------- Amount limits ----------

function getMaxAmount() {
  const p = getPositionValues();
  const asset = elements.assetSelect?.value || "USDC";

  if (state.tab === "borrow") {
    return p.availableBorrow;
  }

  if (state.tab === "repay") {
    return Math.min(p.borrowedUSDC, p.walletUSDC);
  }

  if (state.tab === "supply") {
    return asset === "ETH" ? p.walletETH : p.walletUSDC;
  }

  if (state.tab === "withdraw") {
    return asset === "ETH" ? p.suppliedETH : p.suppliedUSDC;
  }

  return 0;
}

function handleMaxClick() {
  const amount = getMaxAmount();

  if (!elements.amountInput) return;

  const safeAmount = roundDownAmount(amount);

  elements.amountInput.value =
    safeAmount > 0 ? String(safeAmount) : "";

  clearMessage();
}

// ---------- Transaction naming and activity ----------

function getActionName() {
  const asset = elements.assetSelect?.value || "USDC";

  if (state.tab === "borrow") return "borrowUSDC";
  if (state.tab === "repay") return "repayUSDC";

  if (state.tab === "supply") {
    return asset === "ETH" ? "supplyETH" : "supplyUSDC";
  }

  if (state.tab === "withdraw") {
    return asset === "ETH" ? "withdrawETH" : "withdrawUSDC";
  }

  throw new Error("Select a valid action.");
}

function getActionDescription(action, amount, asset) {
  const descriptions = {
    supplyETH: `Supplied ${amount} ETH`,
    supplyUSDC: `Supplied ${amount} USDC`,
    borrowUSDC: `Borrowed ${amount} USDC`,
    repayUSDC: `Repaid ${amount} USDC`,
    repayAllUSDC: "Repaid all outstanding USDC debt",
    withdrawETH: `Withdrew ${amount} ETH`,
    withdrawUSDC: `Withdrew ${amount} USDC`,
    claimDemoFunds: "Claimed demo funds"
  };

  return descriptions[action] || `${action}: ${amount} ${asset}`;
}

function addActivity(action, amount, asset) {
  const isFullRepayment = action === "repayAllUSDC";
  const isClaim = action === "claimDemoFunds";

  state.activity.unshift({
    id: `${Date.now()}-${Math.random()}`,
    title: getActionDescription(action, amount, asset),
    detail: new Date().toLocaleString(),
    amount: isClaim
      ? "Demo"
      : isFullRepayment
        ? "Full repayment"
        : `${amount} ${asset}`,
    symbol: action.startsWith("borrow")
      ? "↙"
      : action.startsWith("repay")
        ? "↗"
        : action.startsWith("withdraw")
          ? "↑"
          : action.startsWith("claim")
            ? "✦"
            : "↓"
  });

  state.activity = state.activity.slice(0, 12);
  renderActivity();
}

function renderActivity() {
  if (!elements.activityList) return;

  elements.activityList.replaceChildren();

  if (state.activity.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("span");
    icon.textContent = "↗";

    const title = document.createElement("strong");
    title.textContent = "No transactions yet";

    const description = document.createElement("p");
    description.textContent =
      "Your local simulator activity will appear here.";

    empty.append(icon, title, description);
    elements.activityList.appendChild(empty);
    return;
  }

  for (const item of state.activity) {
    const row = document.createElement("div");
    row.className = "activity-item";

    const symbol = document.createElement("div");
    symbol.className = "activity-symbol";
    symbol.textContent = item.symbol;

    const text = document.createElement("div");
    text.className = "activity-text";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const detail = document.createElement("span");
    detail.textContent = item.detail;

    text.append(title, detail);

    const amount = document.createElement("div");
    amount.className = "activity-amount";
    amount.textContent = item.amount;

    row.append(symbol, text, amount);
    elements.activityList.appendChild(row);
  }
}

// ---------- Standard transactions ----------

async function submitAction(event) {
  event.preventDefault();

  if (state.busy) return;

  const rawAmount = elements.amountInput?.value?.trim();
  const amount = Number(rawAmount);
  const asset = elements.assetSelect?.value || "USDC";

  if (
    rawAmount === "" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    setMessage("Enter an amount greater than zero.", "error");
    return;
  }

  const action = getActionName();
  const maxAmount = getMaxAmount();

  // Small tolerance is used only for floating-point comparison.
  // The contract remains the final authority on balances and limits.
  if (amount > maxAmount + 1e-9) {
    setMessage(
      "The amount exceeds your current available balance or limit. Use Max to fill a safe amount.",
      "error"
    );
    return;
  }

  if (action === "borrowUSDC" && asset !== "USDC") {
    setMessage("This simulator only supports borrowing USDC.", "error");
    return;
  }

  setBusy(true);
  clearMessage();

  try {
    await apiRequest("/action", {
      method: "POST",
      body: JSON.stringify({
        action,
        amount: String(amount)
      })
    });

    await loadPosition();

    const displayAmount = formatNumber(amount, MAX_DECIMALS);
    addActivity(action, displayAmount, asset);

    if (elements.amountInput) {
      elements.amountInput.value = "";
    }

    setMessage(
      `${getActionDescription(action, displayAmount, asset)} successfully on the local simulator.`
    );
  } catch (error) {
    setMessage(error.message, "error");

    // Refresh the position after a failed transaction so the displayed
    // wallet and debt balances remain current.
    try {
      await loadPosition();
    } catch {
      // Preserve the original transaction error.
    }
  } finally {
    setBusy(false);
    updateActionForm();
  }
}

// ---------- Full repayment ----------

async function repayAllDebt() {
  if (state.busy) return;

  const p = getPositionValues();

  if (p.borrowedUSDC <= 0) {
    setMessage("There is no outstanding debt to repay.");
    return;
  }

  // Do not calculate or submit a rounded repayment amount here.
  // The backend calls the dedicated repayAllUSDC smart-contract function,
  // which accrues interest and calculates the exact debt on-chain.

  setBusy(true);
  clearMessage();

  try {
    await apiRequest("/action", {
      method: "POST",
      body: JSON.stringify({
        action: "repayAllUSDC"
      })
    });

    await loadPosition();

    addActivity("repayAllUSDC", "", "USDC");

    if (elements.amountInput) {
      elements.amountInput.value = "";
    }

    const updated = getPositionValues();

    if (updated.borrowedUSDC <= 0) {
      setMessage("All outstanding USDC debt repaid successfully.");
    } else {
      setMessage(
        "The transaction completed, but a balance remains. Refresh the position and check the contract.",
        "error"
      );
    }
  } catch (error) {
    setMessage(
      `Full repayment failed: ${error.message}`,
      "error"
    );

    try {
      await loadPosition();
    } catch {
      // Keep the original transaction error visible.
    }
  } finally {
    setBusy(false);
    updateActionForm();
  }
}

// ---------- Claim demo funds ----------

async function claimDemoFunds() {
  if (state.busy) return;

  if (state.position?.claimedDemoFunds) {
    setMessage("Demo funds have already been claimed for this account.");
    return;
  }

  setBusy(true);
  clearMessage();

  try {
    await apiRequest("/action", {
      method: "POST",
      body: JSON.stringify({
        action: "claimDemoFunds"
      })
    });

    await loadPosition();
    addActivity("claimDemoFunds", "", "");

    setMessage(
      "Demo funds claimed. These are simulated balances on your local Hardhat chain."
    );
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusy(false);
    updateActionForm();
  }
}

// ---------- Refresh and activity controls ----------

async function refreshPosition() {
  if (state.busy) return;

  setBusy(true);
  clearMessage();

  try {
    await refreshAll();
    setMessage("Position refreshed from the local API.");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusy(false);
    updateActionForm();
  }
}

function clearActivity() {
  state.activity = [];
  renderActivity();
}

// ---------- Event binding and initialization ----------

function bindEvents() {
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab);
    });
  });

  elements.actionForm?.addEventListener("submit", submitAction);

  elements.assetSelect?.addEventListener("change", () => {
    updateActionForm();
    clearMessage();
  });

  elements.amountInput?.addEventListener("input", clearMessage);

  elements.maxBtn?.addEventListener("click", handleMaxClick);

  elements.repayAllBtn?.addEventListener("click", repayAllDebt);

  elements.claimFundsBtn?.addEventListener("click", claimDemoFunds);

  elements.resetBtn?.addEventListener("click", refreshPosition);

  elements.clearLogBtn?.addEventListener("click", clearActivity);
}

function validateRequiredElements() {
  const required = [
    "claimFundsBtn",
    "resetBtn",
    "connectionLabel",
    "connectionDetail",
    "actionForm",
    "assetSelect",
    "amountInput",
    "maxBtn",
    "submitBtn",
    "repayAllBtn"
  ];

  const missing = required.filter((id) => !$(id));

  if (missing.length > 0) {
    console.error(
      "DeFiLab is missing expected HTML elements:",
      missing
    );
  }
}

async function init() {
  validateRequiredElements();
  bindEvents();
  renderActivity();
  setActiveTab("supply");

  try {
    await refreshAll();
  } catch {
    // refreshAll already displays the connection error.
  }
}

document.addEventListener("DOMContentLoaded", init);
