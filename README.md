# Day 1 – Wallet Approval Tracker (Web3)

A Web3 security mini-app built as part of a daily vibecoding challenge.

## Features
- Scan any wallet address for ERC-20 approvals
- Connect wallet to manage approvals
- Detect unlimited (uint256.max) approvals
- Human-readable allowance values
- Batch revoke approvals (revoke.cash style)
- Mobile-first (MetaMask + Termux compatible)

## Tech Stack
- React + Vite
- ethers.js (v6)
- Ethereum (Sepolia & Mainnet)
- Event-based indexing (Approval logs)

## Why This Matters
Token approvals are a major Web3 security risk.  
This tool helps users discover and revoke risky approvals safely.

## Status
✅ Day 1 Challenge Completed