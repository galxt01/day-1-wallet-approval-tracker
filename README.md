# 🛡 Sepolia Token Revoker

A lightweight Web3 security tool that allows users to:

- 🔍 Scan ERC-20 token approvals
- ⚠ Detect unlimited approvals
- 📊 View risk analysis
- 🔐 Batch revoke token approvals
- 🌐 Scan any wallet address
- 🧪 Test safely on Ethereum Sepolia

Built using:
- React (Vite)
- Ethers.js v6

---

## 🚀 Features

### 🔎 Approval Scanner
Fetches all ERC-20 approvals for a wallet using public API.

### ⚠ Risk Engine
Highlights:
- Unlimited approvals
- High value-at-risk approvals
- Risk levels (Low / Medium / High)

### 🔐 Batch Revoke
If the connected wallet matches the scanned address:
- Select multiple approvals
- Revoke them in a single session

### 📱 Mobile Friendly
Optimized layout for mobile devices with:
- Proper address wrapping
- No horizontal overflow
- Clean card layout

---

## 🌐 Network

This version runs on:

**Ethereum Sepolia Testnet**

You must:
- Connect MetaMask
- Switch network to Sepolia

---

## 🧪 Demo Flow

1. Enter a wallet address
2. Click **Scan**
3. View approvals
4. Connect wallet (if revoking)
5. Select approvals
6. Click **Revoke Selected**

---

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/galxt01/revoky.git
cd revoky
npm install
npm run dev