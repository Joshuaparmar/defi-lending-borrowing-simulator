@echo off
setlocal
title DeFi Lending and Borrowing Simulator

REM ============================================
REM DeFi Simulator - One Click Launcher
REM ============================================

set "ROOT=%~dp0"
set "BLOCKCHAIN=%ROOT%blockchain"
set "BACKEND=%ROOT%server"
set "FRONTEND=%ROOT%frontend"

echo.
echo ============================================
echo   DeFi Lending and Borrowing Simulator
echo ============================================
echo.

REM Check required folders
if not exist "%BLOCKCHAIN%\package.json" (
    echo ERROR: Blockchain project not found.
    echo Expected: %BLOCKCHAIN%
    pause
    exit /b 1
)

if not exist "%BACKEND%\server.js" (
    echo ERROR: Backend server.js not found.
    pause
    exit /b 1
)

if not exist "%FRONTEND%\index.html" (
    echo ERROR: Frontend index.html not found.
    pause
    exit /b 1
)

REM Step 1: Start the local blockchain
echo [1/5] Starting Hardhat blockchain...
start "DeFi - Hardhat Blockchain" cmd /k "cd /d "%BLOCKCHAIN%" && npx hardhat node"

REM Step 2: Wait for the blockchain to initialize
echo [2/5] Waiting for blockchain RPC...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0; $i -lt 30; $i++){ try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:8545' -Method Post -ContentType 'application/json' -Body '{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}' -TimeoutSec 2; if($r.result){$ready=$true; break} } catch {}; Start-Sleep -Seconds 1 }; if(-not $ready){exit 1}"

if errorlevel 1 (
    echo ERROR: Hardhat blockchain did not start.
    echo Check the Hardhat terminal for errors.
    pause
    exit /b 1
)

REM Step 3: Deploy the smart contract
echo [3/5] Deploying DeFiLending contract...
cd /d "%BLOCKCHAIN%"
call npx hardhat run scripts/deploy.ts --network localhost

if errorlevel 1 (
    echo ERROR: Contract deployment failed.
    echo Check the blockchain and deployment configuration.
    pause
    exit /b 1
)

REM Step 4: Start the Express backend
echo [4/5] Starting backend API...
start "DeFi - Backend API" cmd /k "cd /d "%BACKEND%" && node server.js"

REM Step 5: Wait for API and open frontend
echo [5/5] Waiting for backend API...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0; $i -lt 20; $i++){ try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/status' -TimeoutSec 2; $ready=$true; break } catch {}; Start-Sleep -Seconds 1 }; if(-not $ready){exit 1}"

if errorlevel 1 (
    echo WARNING: Could not confirm the API is responding.
    echo Check the backend terminal for errors.
    pause
    exit /b 1
)

start "" "%FRONTEND%\index.html"

echo.
echo ============================================
echo   Simulator startup completed!
echo ============================================
echo.
echo Blockchain RPC: http://127.0.0.1:8545
echo Backend API:    http://127.0.0.1:3001
echo Frontend:       Opened in your browser
echo.
echo Keep the Hardhat and Backend terminal windows open.
echo Close those windows to stop the corresponding servers.
echo.
pause

