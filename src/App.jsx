// Ethereum Sepolia

import { useState, useEffect } from "react";
import * as ethers from "ethers";

/* -------------------- */
/* CONSTANTS & ABI      */
/* -------------------- */

const SEPOLIA_CHAIN_ID = "0xaa36a7";

const ERC20_ABI = [
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const MAX_UINT =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

const KNOWN_SPENDERS = {
  "0xE592427A0AEce92De3Edee1F18E0157C05861564": "Uniswap Router",
};

export default function App() {
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [scanAddress, setScanAddress] = useState("");
  const [activeAddress, setActiveAddress] = useState(null);
  const [lastFetchedAddress, setLastFetchedAddress] = useState(null);

  const [approvals, setApprovals] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [hasScanned, setHasScanned] = useState(false);

  /* -------------------- */
  /* CONNECT WALLET       */
  /* -------------------- */

  async function connectWallet() {
    if (!window.ethereum) {
      alert("No Web3 Wallet Detected🥺");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== 11155111n) {
      alert("Please switch to Sepolia network");
      return;
    }

    const accounts = await provider.send("eth_requestAccounts", []);
    const normalized = ethers.getAddress(accounts[0]);

    setConnectedAddress(normalized);
    setScanAddress(normalized);
    setActiveAddress(normalized);

    if (normalized.toLowerCase() !== lastFetchedAddress?.toLowerCase()) {
      resetState();
    }
  }

  function scanInputAddress() {
    try {
      const checksummed = ethers.getAddress(scanAddress.trim());
      setActiveAddress(checksummed);

      if (checksummed.toLowerCase() !== lastFetchedAddress?.toLowerCase()) {
        resetState();
      }
    } catch {
      alert("Invalid wallet address");
    }
  }

  function resetState() {
    setApprovals([]);
    setSelected({});
    setError("");
    setHasScanned(false);
  }

  useEffect(() => {
    if (
      activeAddress &&
      activeAddress.toLowerCase() !== lastFetchedAddress?.toLowerCase()
    ) {
      fetchApprovals(activeAddress);
    }
    // eslint-disable-next-line
  }, [activeAddress]);

  async function fetchApprovals(addressToScan) {
    try {
      setLoading(true);
      setError("");
      setHasScanned(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const approvalTopic = ethers.id("Approval(address,address,uint256)");

      const logs = await provider.getLogs({
        fromBlock: 0,
        toBlock: "latest",
        topics: [
          approvalTopic,
          ethers.zeroPadValue(addressToScan, 32),
        ],
      });

      const iface = new ethers.Interface(ERC20_ABI);
      const map = new Map();

      for (const log of logs) {
        const parsed = iface.parseLog(log);
        map.set(`${log.address}-${parsed.args.spender}`, {
          token: log.address,
          spender: parsed.args.spender,
          allowance: parsed.args.value.toString(),
          blockNumber: log.blockNumber,
        });
      }

      const latestBlock = await provider.getBlockNumber();
      const result = [];

      for (const a of map.values()) {
        const token = new ethers.Contract(a.token, ERC20_ABI, provider);

        const name = await token.name().catch(() => "Unknown Token");
        const symbol = await token.symbol().catch(() => "");
        const decimals = await token.decimals().catch(() => 18);

        const isUnlimited = a.allowance === MAX_UINT;
        const formatted = isUnlimited
          ? "Unlimited"
          : ethers.formatUnits(a.allowance, decimals);

        if (!isUnlimited && Number(formatted) === 0) continue;

        const daysOld = Math.round((latestBlock - a.blockNumber) / 6500);
        const risk = computeRisk(isUnlimited, a.spender, daysOld);

        result.push({
          ...a,
          name,
          symbol,
          isUnlimited,
          formatted,
          daysOld,
          risk,
          knownSpender: KNOWN_SPENDERS[a.spender],
        });
      }

      result.sort((a, b) => riskRank(b.risk) - riskRank(a.risk));

      setApprovals(result);
      setLastFetchedAddress(addressToScan);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch approvals");
    } finally {
      setLoading(false);
    }
  }

  function computeRisk(isUnlimited, spender, daysOld) {
    const known = KNOWN_SPENDERS[spender];
    if (isUnlimited && !known) return "High";
    if (daysOld > 180) return "Medium";
    return "Low";
  }

  function riskRank(level) {
    return level === "High" ? 2 : level === "Medium" ? 1 : 0;
  }

  async function batchRevoke() {
    if (
      connectedAddress?.toLowerCase() !==
      activeAddress?.toLowerCase()
    ) {
      alert("You can only revoke approvals for your own wallet");
      return;
    }

    const targets = approvals.filter(
      (a) => selected[`${a.token}-${a.spender}`]
    );

    if (!targets.length) {
      alert("No approvals selected");
      return;
    }

    try {
      setRevoking(true);
      setProgress({ current: 0, total: targets.length });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      for (let i = 0; i < targets.length; i++) {
        const a = targets[i];
        setProgress({ current: i + 1, total: targets.length });

        const token = new ethers.Contract(a.token, ERC20_ABI, signer);
        const tx = await token.approve(a.spender, 0);
        await tx.wait();

        setApprovals((prev) =>
          prev.filter(
            (x) =>
              !(x.token === a.token && x.spender === a.spender)
          )
        );
      }

      setSelected({});
    } catch {
      alert("Batch revoke cancelled or failed");
    } finally {
      setRevoking(false);
      setProgress({ current: 0, total: 0 });
    }
  }

  const filtered =
    filter === "all"
      ? approvals
      : approvals.filter((a) => a.risk.toLowerCase() === filter);

  return (
    <div
      style={{
        padding: 16,
        fontFamily: "sans-serif",
        maxWidth: 480,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ textAlign: "center" }}>
        Sepolia Token Revoker 🔐
      </h2>

      <input
        value={scanAddress}
        onChange={(e) => setScanAddress(e.target.value)}
        placeholder="Wallet address"
        style={{ width: "100%", padding: 10 }}
      />

      <button
        onClick={scanInputAddress}
        style={{ width: "100%", marginTop: 8 }}
      >
        Scan Address
      </button>

      <hr />

      {!connectedAddress ? (
        <button
          onClick={connectWallet}
          style={{ width: "100%" }}
        >
          Connect Wallet
        </button>
      ) : (
        <p style={{ wordBreak: "break-all", fontSize: 14 }}>
          Connected: {connectedAddress}
        </p>
      )}

      {loading && <p>Scanning blockchain…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && hasScanned && approvals.length === 0 && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: "#f4f4f4",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <strong>No approvals found 🎉</strong>
          <p style={{ fontSize: 14 }}>
            This wallet has no active ERC-20 approvals.
          </p>
        </div>
      )}

      {connectedAddress?.toLowerCase() ===
        activeAddress?.toLowerCase() &&
        approvals.length > 0 && (
          <button
            onClick={batchRevoke}
            disabled={revoking}
            style={{
              background: "crimson",
              color: "white",
              marginTop: 12,
              padding: 12,
              width: "100%",
              borderRadius: 8,
              border: "none",
            }}
          >
            {revoking
              ? `Revoking ${progress.current}/${progress.total}`
              : "Revoke Selected"}
          </button>
        )}

      <div style={{ marginTop: 20 }}>
        {filtered.map((a) => {
          const key = `${a.token}-${a.spender}`;

          return (
            <div
              key={key}
              style={{
                border: "1px solid #ccc",
                padding: 14,
                marginBottom: 14,
                borderRadius: 10,
              }}
            >
              {connectedAddress?.toLowerCase() ===
                activeAddress?.toLowerCase() && (
                <input
                  type="checkbox"
                  checked={!!selected[key]}
                  onChange={() =>
                    setSelected((s) => ({
                      ...s,
                      [key]: !s[key],
                    }))
                  }
                  style={{ marginBottom: 8 }}
                />
              )}

              <strong>
                {a.name} {a.symbol && `(${a.symbol})`}
              </strong>

              <p style={{ wordBreak: "break-all" }}>
                Spender: {a.spender}
              </p>

              <p style={{ wordBreak: "break-all" }}>
                Allowance:{" "}
                {a.isUnlimited ? "Unlimited 🚨" : a.formatted}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}