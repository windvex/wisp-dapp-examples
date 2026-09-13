import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  VEX_EVM_CHAIN_ID_HEX,
  VEX_EVM_RPC,
  VEX_NATIVE_CHAIN_ID,
  VEX_NATIVE_RPC,
  WISP_API_URL,
} from "./config";
import { detectEnvironment } from "./lib/environment";
import {
  connectEvm,
  disconnectEvm,
  ensureVexEvmNetwork,
  getEvmAddress,
  getEvmBalance,
  sendEvmTransaction,
  subscribeEvm,
  type EvmConnection,
} from "./lib/wispEvm";
import {
  connectNative,
  disconnectNative,
  getNativeAccount,
  getNativeBalance,
  restoreNative,
  sendNativeTransfer,
  subscribeNative,
  type NativeConnection,
} from "./lib/wispNative";
import {
  connectWalletConnect,
  disconnectWalletConnect,
  isWalletConnectConfigured,
} from "./lib/walletConnect";

type ResultState = {
  title: string;
  value: unknown;
  at: string;
};

function message(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected request failure.";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

export default function App() {
  const environment = useMemo(detectEnvironment, []);
  const [native, setNative] = useState<NativeConnection | null>(null);
  const [restoringNative, setRestoringNative] = useState(true);
  const [nativeBalance, setNativeBalance] = useState("");
  const [nativeForm, setNativeForm] = useState({
    recipient: "",
    amount: "0.0001",
    memo: "Wisp example",
  });
  const [evm, setEvm] = useState<EvmConnection | null>(null);
  const [evmBalance, setEvmBalance] = useState("");
  const [evmForm, setEvmForm] = useState({ recipient: "", amount: "0.000001" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);

  useEffect(() => {
    let mounted = true;
    const stopNative = subscribeNative((connection) => {
      if (mounted) setNative(connection);
    });
    const stopEvm = subscribeEvm((connection) => {
      if (mounted) setEvm(connection);
    });

    void restoreNative()
      .catch((caught) => {
        if (mounted) setError(message(caught));
      })
      .finally(() => {
        if (mounted) setRestoringNative(false);
      });

    return () => {
      mounted = false;
      stopNative();
      stopEvm();
    };
  }, []);

  async function run<T>(title: string, operation: () => Promise<T>) {
    if (busy) return;
    setBusy(title);
    setError("");
    try {
      const value = await operation();
      setResult({ title, value, at: new Date().toISOString() });
      return value;
    } catch (caught) {
      setError(message(caught));
      throw caught;
    } finally {
      setBusy("");
    }
  }

  const nativeDisabled = Boolean(busy) || restoringNative;

  const handleConnectNative = () =>
    run("Native connected", async () => {
      const connection = await connectNative();
      setNative(connection);
      return connection;
    }).catch(() => undefined);

  const handleNativeAccount = () =>
    run("Native account", async () => getNativeAccount()).catch(() => undefined);

  const handleNativeBalance = () =>
    run("Native balance", async () => {
      const balance = await getNativeBalance();
      setNativeBalance(balance);
      return balance;
    }).catch(() => undefined);

  const handleNativeTransfer = (event: FormEvent) => {
    event.preventDefault();
    if (!window.confirm("Request this real VEX Native mainnet transfer in Wisp Wallet?")) return;
    void run("Native transaction", () => sendNativeTransfer(nativeForm)).catch(() => undefined);
  };

  const handleConnectInjectedEvm = () =>
    run("Wisp EVM connected", async () => {
      const connection = await connectEvm();
      setEvm(connection);
      return connection;
    }).catch(() => undefined);

  const handleConnectWalletConnect = () =>
    run("WalletConnect connected", async () => {
      const provider = await connectWalletConnect();
      const connection = await connectEvm(provider, "WalletConnect v2");
      setEvm(connection);
      return connection;
    }).catch(() => undefined);

  const handleEnsureNetwork = () =>
    run("VEX EVM network ready", async () => {
      const chainId = await ensureVexEvmNetwork();
      setEvm((current) => (current ? { ...current, chainId } : current));
      return chainId;
    }).catch(() => undefined);

  const handleEvmAddress = () =>
    run("EVM address", async () => getEvmAddress()).catch(() => undefined);

  const handleEvmBalance = () =>
    run("EVM balance", async () => {
      const balance = await getEvmBalance();
      setEvmBalance(balance);
      return balance;
    }).catch(() => undefined);

  const handleEvmTransfer = (event: FormEvent) => {
    event.preventDefault();
    if (!window.confirm("Request this real VEX EVM mainnet transfer in Wisp Wallet?")) return;
    void run("EVM transaction", async () => ({
      transactionHash: await sendEvmTransaction(evmForm),
    })).catch(() => undefined);
  };

  const handleNativeDisconnect = () =>
    run("Native disconnected", async () => {
      await disconnectNative();
      setNative(null);
      setNativeBalance("");
      return "Disconnected";
    }).catch(() => undefined);

  const handleEvmDisconnect = () =>
    run("EVM disconnected", async () => {
      if (evm?.method === "WalletConnect v2") await disconnectWalletConnect();
      disconnectEvm();
      setEvm(null);
      setEvmBalance("");
      return "Disconnected";
    }).catch(() => undefined);

  return (
    <main className="page-shell">
      <header className="hero">
        <span className="eyebrow">React + Vite + TypeScript</span>
        <h1>Wisp dApp Example</h1>
        <p>Connect Wisp Wallet, read balances, and send example VEX Native or VEX EVM transactions.</p>
      </header>

      {error && (
        <div className="notice error" role="alert">
          <strong>Request failed</strong>
          <span>{error}</span>
        </div>
      )}
      {busy && <div className="notice pending" role="status">Waiting: {busy}</div>}

      <section className="card full">
        <div className="section-heading">
          <div><span className="step">01</span><h2>Environment</h2></div>
          <span className="status">{environment.runtime}</span>
        </div>
        <dl className="info-grid">
          <Field label="Runtime" value={environment.runtime} />
          <Field label="Secure context" value={environment.isSecureContext ? "Yes" : "No — Wisp Telegram requires HTTPS"} />
          <Field label="Wisp Native" value={environment.hasInjectedNative ? "Available" : "Not detected"} />
          <Field label="Wisp EVM" value={environment.hasInjectedEvm ? "Available" : "Not detected"} />
          <Field label="Native RPC" value={VEX_NATIVE_RPC} />
          <Field label="EVM RPC" value={VEX_EVM_RPC} />
          <Field label="Wisp API" value={WISP_API_URL} />
        </dl>
      </section>

      <div className="columns">
        <section className="card">
          <div className="section-heading">
            <div><span className="step">02</span><h2>VEX Native</h2></div>
            <span className="status">{restoringNative ? "Restoring…" : native?.method || "Disconnected"}</span>
          </div>
          <div className="button-grid">
            <button onClick={handleConnectNative} disabled={nativeDisabled}>Connect Wisp Native</button>
            <button className="secondary" onClick={handleNativeAccount} disabled={nativeDisabled || !native}>Get Account</button>
            <button className="secondary" onClick={handleNativeBalance} disabled={nativeDisabled || !native}>Get VEX Balance</button>
            <button className="ghost" onClick={handleNativeDisconnect} disabled={nativeDisabled || !native}>Disconnect</button>
          </div>
          <p className="hint">A saved Wisp session is checked when the page opens. Connecting is only requested when you press Connect.</p>
          <dl className="compact-info">
            <Field label="Account" value={native?.account.permissionLevel || ""} />
            <Field label="Chain" value={native?.chainId || VEX_NATIVE_CHAIN_ID} />
            <Field label="Balance" value={nativeBalance} />
          </dl>
          <form onSubmit={handleNativeTransfer} className="transaction-form">
            <h3>Native transfer</h3>
            <label>
              Recipient
              <input required value={nativeForm.recipient} onChange={(event) => setNativeForm({ ...nativeForm, recipient: event.target.value })} placeholder="receiver" autoComplete="off" />
            </label>
            <label>
              Amount (VEX)
              <input required inputMode="decimal" value={nativeForm.amount} onChange={(event) => setNativeForm({ ...nativeForm, amount: event.target.value })} />
            </label>
            <label>
              Memo
              <input value={nativeForm.memo} onChange={(event) => setNativeForm({ ...nativeForm, memo: event.target.value })} maxLength={256} />
            </label>
            <button type="submit" disabled={nativeDisabled || !native}>Send Native Transaction</button>
          </form>
        </section>

        <section className="card">
          <div className="section-heading">
            <div><span className="step">03</span><h2>VEX EVM</h2></div>
            <span className="status">{evm?.method || "Disconnected"}</span>
          </div>
          <div className="button-grid">
            <button onClick={handleConnectInjectedEvm} disabled={Boolean(busy)}>Connect Wisp EVM</button>
            <button className="secondary" onClick={handleConnectWalletConnect} disabled={Boolean(busy) || !isWalletConnectConfigured()}>Connect WalletConnect v2</button>
            <button className="secondary" onClick={handleEnsureNetwork} disabled={Boolean(busy) || !evm}>Switch/Add VEX EVM Network</button>
            <button className="secondary" onClick={handleEvmAddress} disabled={Boolean(busy) || !evm}>Get Address</button>
            <button className="secondary" onClick={handleEvmBalance} disabled={Boolean(busy) || !evm}>Get Native VEX Balance</button>
            <button className="ghost" onClick={handleEvmDisconnect} disabled={Boolean(busy) || !evm}>Disconnect</button>
          </div>
          {!isWalletConnectConfigured() && <p className="hint">WalletConnect requires <code>VITE_WALLETCONNECT_PROJECT_ID</code>.</p>}
          <dl className="compact-info">
            <Field label="Address" value={evm?.address || ""} />
            <Field label="Chain" value={evm?.chainId || VEX_EVM_CHAIN_ID_HEX} />
            <Field label="Balance" value={evmBalance} />
          </dl>
          <form onSubmit={handleEvmTransfer} className="transaction-form">
            <h3>EVM transfer</h3>
            <label>
              Recipient
              <input required value={evmForm.recipient} onChange={(event) => setEvmForm({ ...evmForm, recipient: event.target.value })} placeholder="0x..." autoComplete="off" />
            </label>
            <label>
              Amount (VEX)
              <input required inputMode="decimal" value={evmForm.amount} onChange={(event) => setEvmForm({ ...evmForm, amount: event.target.value })} />
            </label>
            <button type="submit" disabled={Boolean(busy) || !evm}>Send EVM Transaction</button>
          </form>
        </section>
      </div>

      <section className="card full">
        <div className="section-heading"><div><span className="step">04</span><h2>Wallet Information</h2></div></div>
        <dl className="info-grid">
          <Field label="Native connection" value={native?.method || "Not connected"} />
          <Field label="Native account" value={native?.account.permissionLevel || ""} />
          <Field label="EVM connection" value={evm?.method || "Not connected"} />
          <Field label="EVM address" value={evm?.address || ""} />
        </dl>
      </section>

      <section className="card full result-card">
        <div className="section-heading">
          <div><span className="step">05</span><h2>Latest Result</h2></div>
          <span className="status">{result ? `${result.title} · ${result.at}` : "No request yet"}</span>
        </div>
        <pre>{result ? JSON.stringify(result.value, null, 2) : "Connect a wallet or send a transaction to see the result."}</pre>
      </section>
    </main>
  );
}
