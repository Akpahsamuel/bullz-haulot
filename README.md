# 🐂 Bullz - Fantasy Sports for Crypto Assets

> Draft squads of blockchain assets, compete weekly, and win prizes based on real-world performance.

[![Sui](https://img.shields.io/badge/Sui-Blockchain-blue)](https://sui.io)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Move](https://img.shields.io/badge/Move-Smart%20Contracts-orange)](https://docs.sui.io/concepts/sui-move-concepts)

## 🎯 What is Bullz?

Bullz combines **fantasy sports** with **crypto prediction markets**. Pick blockchain assets (BTC, ETH, SUI, etc.), draft your squad of 7, and compete for prizes based on which assets perform best each week.

**Key Concept:** Hold shares of top-performing assets to win—not just trade them.

## 🎮 How It Works

1. **Buy Asset Shares**: Acquire Bullz Shares ($bBTC, $bETH, etc.) through packs or trading
2. **Draft Your Squad**: Select 7 assets you think will perform best
3. **Squad Lock**: Each Monday, all squads are locked and snapshotted on-chain
4. **Compete**: Track your squad's performance throughout the week
5. **Win Prizes**: Top asset holders and best squads earn Alpha Points and Shill Points

**Rolling Trades**: Edit your squad anytime, but changes only apply to the next competition week (like Fantasy Premier League).

## 🏆 Prize System

- **Alpha Points**: Earned by holding top 3 assets in each category (Large Cap, Mid Cap, Small Cap, Memes). Used to buy packs.
- **Shill Points**: Earned from squad performance. Required to participate in competitions.
- **Prize Distribution**: 80% to players, 20% to team treasury

## 🌟 Key Features

- 🎴 **Asset Shares**: Fixed-supply NFTs representing crypto assets (BTC, ETH, SUI, etc.)
- 🏆 **Squad Management**: Draft and manage your 7-asset squad
- 📊 **Alpha Chart**: Real-time trending assets based on new buyers
- 🎯 **Weekly Competitions**: Compete for prizes based on asset performance
- 📈 **Leaderboards**: Track top assets and top squads
- 💬 **Community Hub**: Discover trending tokens and founder commentary
- ⛓️ **Fully On-Chain**: Transparent, verifiable, non-custodial

## 🛠 Tech Stack

**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI

**Blockchain**: Sui Network + Move Smart Contracts

**Key Libraries**:
- `@mysten/dapp-kit` - Wallet integration
- `@mysten/sui` - Sui SDK  
- `@mysten/walrus` - Decentralized storage
- TanStack Query - State management
- Recharts - Data visualization

**Smart Contracts**: 
- `bullz.move` - Core protocol
- `squad_management.move` - Squad system
- `weekly_competition.move` - Competition logic
- `fee_management.move` - Prize distribution

## 🚀 Getting Started

```bash
# Clone and install
git clone <repository-url>
cd Bullz_haulot/bullz-client-app
pnpm install

# Start dev server
pnpm dev
```

Visit `http://localhost:5173`

### Deploy Smart Contracts

```bash
cd BullzContracts/Bullz
sui client publish --gas-budget 100000000
```

Update contract IDs in `bullz-client-app/src/constantsId.ts`

## 💻 Development

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start:automation # Run bid matching automation
pnpm start:snapshot   # Run competition snapshot service
```

## 📚 Documentation

- [Environment Setup](bullz-client-app/ENVIRONMENT_SETUP.md)
- [Snapshot Service](bullz-client-app/scripts/SNAPSHOT_SERVICE.md)
- [Walrus Upload Guide](walrus/WALRUS_UPLOAD_GUIDE.md)



## 🔗 Links

- [Sui Documentation](https://docs.sui.io)
- [Walrus Storage](https://docs.walrus.site)

---

Built by the Bullz team 🐂
