
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title DeFi Lending and Borrowing Simulator
/// @notice Educational local-blockchain prototype using virtual balances only.
contract DeFiLending {
    uint256 public constant BPS = 10_000;
    uint256 public constant COLLATERAL_FACTOR_BPS = 7_500;
    uint256 public constant LIQUIDATION_THRESHOLD_BPS = 8_000;
    uint256 public constant BORROW_APR_BPS = 500;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant ETH_PRICE = 2_000 ether;
    uint256 public constant USDC_PRICE = 1 ether;

    // Virtual liquidity provided by the demo market.
    uint256 public marketLiquidityUSDC = 1_000_000 ether;

    struct Position {
        uint256 suppliedETH;
        uint256 suppliedUSDC;
        uint256 borrowedUSDC;
        uint256 lastAccrued;
    }

    mapping(address => Position) private positions;
    mapping(address => uint256) public virtualETH;
    mapping(address => uint256) public virtualUSDC;
    mapping(address => bool) public claimedDemoFunds;

    event FundsMinted(address indexed user, uint256 ethAmount, uint256 usdcAmount);
    event Supplied(address indexed user, string asset, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, string asset, uint256 amount);

    function claimDemoFunds() external {
        require(!claimedDemoFunds[msg.sender], "Demo funds already claimed");
        claimedDemoFunds[msg.sender] = true;

        virtualETH[msg.sender] = 10 ether;
        virtualUSDC[msg.sender] = 10_000 ether;

        emit FundsMinted(msg.sender, 10 ether, 10_000 ether);
    }

    function supplyETH(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        require(virtualETH[msg.sender] >= amount, "Insufficient virtual ETH");

        _accrue(msg.sender);
        virtualETH[msg.sender] -= amount;
        positions[msg.sender].suppliedETH += amount;

        emit Supplied(msg.sender, "ETH", amount);
    }

    function supplyUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        require(virtualUSDC[msg.sender] >= amount, "Insufficient virtual USDC");

        _accrue(msg.sender);
        virtualUSDC[msg.sender] -= amount;
        positions[msg.sender].suppliedUSDC += amount;
        marketLiquidityUSDC += amount;

        emit Supplied(msg.sender, "USDC", amount);
    }

    function borrowUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        _accrue(msg.sender);

        Position storage p = positions[msg.sender];

        require(marketLiquidityUSDC >= amount, "Insufficient market liquidity");

        uint256 newDebt = p.borrowedUSDC + amount;
        uint256 maxBorrow =
            (_collateralValue(msg.sender) * COLLATERAL_FACTOR_BPS) / BPS;

        require(newDebt <= maxBorrow, "Exceeds borrowing limit");

        p.borrowedUSDC = newDebt;
        marketLiquidityUSDC -= amount;
        virtualUSDC[msg.sender] += amount;

        emit Borrowed(msg.sender, amount);
    }

    function repayUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be positive");

        _accrue(msg.sender);

        Position storage p = positions[msg.sender];

        uint256 debt = p.borrowedUSDC;
        require(debt > 0, "No outstanding debt");

        uint256 payment = amount > debt ? debt : amount;

        require(
            virtualUSDC[msg.sender] >= payment,
            "Insufficient virtual USDC"
        );

        p.borrowedUSDC = debt - payment;
        virtualUSDC[msg.sender] -= payment;
        marketLiquidityUSDC += payment;

        emit Repaid(msg.sender, payment);
    }


    function repayAllUSDC() external {
        _accrue(msg.sender);

        Position storage p = positions[msg.sender];
        uint256 payment = p.borrowedUSDC;

        require(payment > 0, "No outstanding debt");
        require(
            virtualUSDC[msg.sender] >= payment,
            "Insufficient virtual USDC"
        );

        p.borrowedUSDC = 0;
        virtualUSDC[msg.sender] -= payment;
        marketLiquidityUSDC += payment;

        emit Repaid(msg.sender, payment);
    }



    function withdrawETH(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        _accrue(msg.sender);

        Position storage p = positions[msg.sender];
        require(p.suppliedETH >= amount, "Insufficient supplied ETH");

        p.suppliedETH -= amount;
        require(_debtWithinLimit(msg.sender), "Withdrawal makes position unsafe");

        virtualETH[msg.sender] += amount;
        emit Withdrawn(msg.sender, "ETH", amount);
    }

    function withdrawUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        _accrue(msg.sender);

        Position storage p = positions[msg.sender];
        require(p.suppliedUSDC >= amount, "Insufficient supplied USDC");

        p.suppliedUSDC -= amount;
        require(_debtWithinLimit(msg.sender), "Withdrawal makes position unsafe");

        virtualUSDC[msg.sender] += amount;
        marketLiquidityUSDC -= amount;

        emit Withdrawn(msg.sender, "USDC", amount);
    }

    function getPosition(address user)
        external
        view
        returns (
            uint256 suppliedETH,
            uint256 suppliedUSDC,
            uint256 borrowedUSDC,
            uint256 ethWallet,
            uint256 usdcWallet
        )
    {
        Position storage p = positions[user];

        return (
            p.suppliedETH,
            p.suppliedUSDC,
            _currentDebt(user),
            virtualETH[user],
            virtualUSDC[user]
        );
    }

    function collateralValueUSD(address user) external view returns (uint256) {
        return _collateralValue(user);
    }

    // Returns basis points: 10,000 means a health factor of 1.0.
    function healthFactorBps(address user) external view returns (uint256) {
        uint256 debt = _currentDebt(user);

        if (debt == 0) {
            return type(uint256).max;
        }

        uint256 liquidationValue =
            (_collateralValue(user) * LIQUIDATION_THRESHOLD_BPS) / BPS;

        return (liquidationValue * BPS) / debt;
    }

    function _collateralValue(address user) internal view returns (uint256) {
        Position storage p = positions[user];

        return
            (p.suppliedETH * ETH_PRICE / 1 ether)
            + (p.suppliedUSDC * USDC_PRICE / 1 ether);
    }

    function _debtWithinLimit(address user) internal view returns (bool) {
        uint256 maxDebt =
            (_collateralValue(user) * COLLATERAL_FACTOR_BPS) / BPS;

        return _currentDebt(user) <= maxDebt;
    }

    function _currentDebt(address user) internal view returns (uint256) {
        Position storage p = positions[user];

        if (p.borrowedUSDC == 0 || p.lastAccrued == 0) {
            return p.borrowedUSDC;
        }

        uint256 elapsed = block.timestamp - p.lastAccrued;
        uint256 interest =
            (p.borrowedUSDC * BORROW_APR_BPS * elapsed)
            / (BPS * SECONDS_PER_YEAR);

        return p.borrowedUSDC + interest;
    }

    function _accrue(address user) internal {
        Position storage p = positions[user];

        if (p.lastAccrued == 0) {
            p.lastAccrued = block.timestamp;
            return;
        }

        p.borrowedUSDC = _currentDebt(user);
        p.lastAccrued = block.timestamp;
    }
}
