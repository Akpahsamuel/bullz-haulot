# Bullz: The Proof of Conviction Engine

**Gamified Prediction Markets for Capital-Backed Sentiment.**  
Built on Sui & Walrus.

## 🐂 Project Overview

Bullz answers the biggest question in Web3: **"What to buy?"**

We solve this by blending prediction markets with the viral mechanics of fantasy football. Users build a "squad" of 7 assets and lock capital to their predictions in weekly leagues. This filters out the noise of bots, shillers, and "mindshare farming," generating a **Provably Authentic sentiment layer** backed by real "skin in the game."

## 🎯 Hackathon Track: Provably Authentic

Bullz fits the **Provably Authentic** track because we are building a **Trust Oracle for market sentiment**.

In a world of deepfakes and bot farms, Bullz provides the only sentiment data that cannot be faked: **sentiment backed by locked capital**. We verify the "truth" of market conviction and use Walrus to create an immutable, decentralized record of that truth.

## 🦭 How We Use Walrus

Walrus is the backbone of our data integrity and asset management, ensuring our "Proof of Conviction" is verifiable, censorship-resistant, and decentralized.

### 1. Dynamic NFT Metadata Storage
Every "Bullz Share" and "Squad" position is represented as an NFT. We use Walrus to store the dynamic metadata and visual assets for these positions.

**Why Walrus?** Traditional IPFS can be slow or unreliable for dynamic game assets. Walrus provides the speed and redundancy needed for a consumer-grade game experience while keeping the underlying asset data decentralized.

### 2. Verifiable Game History (The "Truth Engine")
To function as a sentiment oracle, our historical data must be immutable.

- **Implementation:** At the end of every Game Week, we take a snapshot of the leaderboard, asset performance, and "Conviction Bars" data.
- **Archival:** This entire dataset is compressed and archived onto Walrus.
- **Outcome:** This creates a permanent, tamper-proof ledger of market sentiment that serves as a decentralized oracle for future analysis, backtesting, and "reputation scoring" for our top players.

### 3. Decentralized Frontend (Roadmap)
We are in the process of migrating our frontend hosting to Walrus Sites to ensure the platform is as unstoppable as the data it generates, protecting our users from censorship or de-platforming.

## 🚀 Key Features

- **Fantasy Squads:** Draft a team of 7 assets (Crypto, NFTs, RWAs) from any chain.
- **Lock-to-Play:** Users must lock real capital (shares) to enter, filtering out bots and spam.
- **Conviction Bars:** A real-time dashboard aggregating locked capital to show exactly what the smartest managers are betting on.
- **Pre-TGE Markets:** The first market for unlaunched tokens, allowing projects to gauge true community conviction before TGE.
- **Unified Wallet:** Deposit USDC from Base, ETH, or Solana directly into your Bullz game wallet.

## 🛠️ Tech Stack

- **Blockchain:** Sui Network (Move Smart Contracts)
- **Storage:** Walrus Protocol
- **Frontend:** React / Vite / Tailwind CSS
- **Indexing:** Custom indexer for real-time game scoring

## 💻 Getting Started

To run the Bullz project locally:

### Prerequisites
- Node.js & pnpm
- Sui CLI
- Walrus CLI

### Installation

1. **Clone the repo**
```bash
git clone https://github.com/Akpahsamuel/bullz-haulot.git
cd bullz-haulot
```

2. **Install Dependencies**
```bash
cd bullz-client-app
pnpm install
```

3. **Configure Environment**  
Copy `.env.example` to `.env` and add your Walrus aggregator and publisher URLs.

4. **Run Local Development**
```bash
pnpm dev
```

Visit `http://localhost:5173`

### Deploy Smart Contracts

```bash
cd BullzContracts/Bullz
sui client publish --gas-budget 100000000
```

Update contract IDs in `bullz-client-app/src/constantsId.ts`

## 🗺️ Roadmap

- **Phase 1 (Current):** Core Game Loop & Walrus Integration (Testnet)
- **Phase 2:** Pre-TGE Markets & "Conviction Bars" V1
- **Phase 3:** Mainnet Launch & Cross-Chain Expansion

## 🤝 Contact

**Founder:** Jack Daniyel (Lionhead)  
**X / Telegram:** [@lionhead_king](https://twitter.com/lionhead_king)  
**Email:** jd@fanpool.gg

---

Built with 🐂 by the Bullz team
