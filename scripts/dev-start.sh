#!/bin/bash

# DevOps Environment Switcher
# Usage: ./scripts/dev-start.sh [mockusdc|mocketh|status]

set -e

SETUP=${1:-mockusdc}
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Chainpot DevOps Manager"
echo "=============================="

case "$SETUP" in
  "mockusdc")
    echo "🔄 Starting MockUSDC development environment..."
    echo "   - Chain ID: 31337"  
    echo "   - Token: mUSDC (6 decimals)"
    echo "   - Entry: 100 mUSDC"
    echo ""
    
    # Kill any existing processes
    echo "🧹 Cleaning up existing processes..."
    pkill -f "hardhat node" || true
    pkill -f "next dev" || true
    sleep 2
    
    # Start hardhat node in background
    echo "⛓️  Starting Hardhat node..."
    cd "$REPO_ROOT/chain"
    npx hardhat node --hostname 127.0.0.1 --port 8547 > /tmp/hardhat.log 2>&1 &
    HARDHAT_PID=$!
    echo "   Hardhat PID: $HARDHAT_PID"
    
    # Wait for node to start
    echo "⏳ Waiting for blockchain to start..."
    sleep 5
    
    # Deploy MockUSDC contracts
    echo "📦 Deploying MockUSDC contracts..."
    npx hardhat run scripts/deployLocalAll.ts --network local
    
    # Switch environment
    echo "🔧 Configuring environment..."
    npx ts-node scripts/switchSetup.ts mockusdc
    
    # Start web app
    echo "🌐 Starting web application..."
    cd "$REPO_ROOT"
    pnpm --filter=./apps/web dev &
    WEB_PID=$!
    echo "   Web PID: $WEB_PID"
    
    echo ""
    echo "✅ MockUSDC environment ready!"
    echo "🔗 AdminPanel: http://localhost:3000/pool/0xABb5cd949730f4f0d00a0E2b9abDD6727632ddF9/admin"
    echo "📋 Add mUSDC token: 0xe5bB50Cf598eC6c6D635938bF814ad25c2ea68Fb (6 decimals)"
    echo ""
    echo "💡 Press Ctrl+C to stop all services"
    
    # Keep script running and handle cleanup
    trap "echo '🛑 Stopping services...'; kill $HARDHAT_PID $WEB_PID 2>/dev/null || true; exit 0" INT TERM
    wait
    ;;
    
  "mocketh")
    echo "🔄 Starting MockETH development environment..."
    echo "   - Chain ID: 31337"
    echo "   - Token: mETH (18 decimals)"  
    echo "   - Entry: 0.1 mETH"
    echo ""
    
    # Similar process for MockETH...
    echo "🧹 Cleaning up existing processes..."
    pkill -f "hardhat node" || true
    pkill -f "next dev" || true
    sleep 2
    
    echo "⛓️  Starting Hardhat node..."
    cd "$REPO_ROOT/chain"
    npx hardhat node --hostname 127.0.0.1 --port 8547 > /tmp/hardhat.log 2>&1 &
    HARDHAT_PID=$!
    
    sleep 5
    echo "📦 Deploying MockETH contracts..."
    npx hardhat run scripts/deployLocalETH.ts --network local
    
    echo "🔧 Configuring environment..."
    npx ts-node scripts/switchSetup.ts mocketh
    
    echo "🌐 Starting web application..."
    cd "$REPO_ROOT"
    pnpm --filter=./apps/web dev &
    WEB_PID=$!
    
    echo ""
    echo "✅ MockETH environment ready!"
    echo "🔗 AdminPanel: http://localhost:3000/pool/0x78e1fF0D4D00A4c708195d29Ba614b30912EB171/admin" 
    echo "📋 Add mETH token: 0x42308B98Bf42F39b32F45755bcf8A31FD7EA1719 (18 decimals)"
    
    trap "echo '🛑 Stopping services...'; kill $HARDHAT_PID $WEB_PID 2>/dev/null || true; exit 0" INT TERM
    wait
    ;;
    
  "status")
    echo "📊 Current Environment Status"
    echo "=============================="
    
    cd "$REPO_ROOT/chain"
    echo "🌐 Available setups:"
    npx ts-node scripts/switchSetup.ts list
    
    echo ""
    echo "🔧 Current web configuration:"
    if [ -f "$REPO_ROOT/apps/web/.env.local" ]; then
      grep "NEXT_PUBLIC_CHAIN_ID\|NEXT_PUBLIC_USDC_ADDRESS\|NEXT_PUBLIC_POOL_FACTORY" "$REPO_ROOT/apps/web/.env.local"
    else
      echo "   No .env.local found"
    fi
    
    echo ""
    echo "⛓️  Hardhat node status:"
    if lsof -i:8547 > /dev/null 2>&1; then
      echo "   ✅ Running on port 8547"
    else
      echo "   ❌ Not running"
    fi
    
    echo ""
    echo "🌐 Web app status:"
    if lsof -i:3000 > /dev/null 2>&1; then
      echo "   ✅ Running on port 3000"
    else
      echo "   ❌ Not running"
    fi
    ;;
    
  *)
    echo "Usage: $0 [mockusdc|mocketh|status]"
    echo ""
    echo "Commands:"
    echo "  mockusdc  - Start full MockUSDC development environment"
    echo "  mocketh   - Start full MockETH development environment"  
    echo "  status    - Show current environment status"
    echo ""
    echo "Quick switches (if blockchain already running):"
    echo "  pnpm run switch:mockusdc"
    echo "  pnpm run switch:mocketh"
    echo "  pnpm run switch:mainnet"
    ;;
esac
