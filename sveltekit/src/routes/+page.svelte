<script lang="ts">
  import { onMount } from "svelte";

  import { appConfig } from "$lib/config";
  import { detectEnvironment, type RuntimeEnvironment } from "$lib/environment";
  import { createEvmWallet, type EvmConnection } from "$lib/wispEvm";
  import { createNativeWallet, type NativeConnection } from "$lib/wispNative";
  import { createWalletConnect } from "$lib/walletConnect";

  type ResultState = {
    title: string;
    value: unknown;
    at: string;
  };

  const nativeWallet = createNativeWallet(appConfig);
  const evmWallet = createEvmWallet(appConfig);
  const walletConnect = createWalletConnect(appConfig);

  let environment = $state<RuntimeEnvironment>({
    runtime: "Desktop browser",
    isAndroid: false,
    isTelegram: false,
    hasInjectedNative: false,
    hasInjectedEvm: false,
    isSecureContext: false,
  });
  let native = $state<NativeConnection | null>(null);
  let restoringNative = $state(true);
  let nativeBalance = $state("");
  let nativeForm = $state({ recipient: "", amount: "0.0001", memo: "Wisp example" });
  let evm = $state<EvmConnection | null>(null);
  let evmBalance = $state("");
  let evmForm = $state({ recipient: "", amount: "0.000001" });
  let busy = $state("");
  let error = $state("");
  let result = $state<ResultState | null>(null);

  onMount(() => {
    environment = detectEnvironment();
    const stopNative = nativeWallet.subscribe((connection) => {
      native = connection;
    });
    const stopEvm = evmWallet.subscribe((connection) => {
      evm = connection;
    });

    void nativeWallet
      .restore()
      .catch((caught) => {
        error = message(caught);
      })
      .finally(() => {
        restoringNative = false;
      });

    return () => {
      stopNative();
      stopEvm();
    };
  });

  function message(caught: unknown) {
    return caught instanceof Error ? caught.message : "Unexpected request failure.";
  }

  async function run<T>(title: string, operation: () => Promise<T>) {
    if (busy) return undefined;
    busy = title;
    error = "";
    try {
      const value = await operation();
      result = { title, value, at: new Date().toISOString() };
      return value;
    } catch (caught) {
      error = message(caught);
      return undefined;
    } finally {
      busy = "";
    }
  }

  async function handleConnectNative() {
    await run("Native connected", async () => {
      const connection = await nativeWallet.connect();
      native = connection;
      return connection;
    });
  }

  async function handleNativeAccount() {
    await run("Native account", nativeWallet.getAccount);
  }

  async function handleNativeBalance() {
    await run("Native balance", async () => {
      const balance = await nativeWallet.getBalance();
      nativeBalance = balance;
      return balance;
    });
  }

  async function handleNativeTransfer() {
    if (!window.confirm("Request this real VEX Native mainnet transfer in Wisp Wallet?")) return;
    await run("Native transaction", () => nativeWallet.sendTransfer({ ...nativeForm }));
  }

  async function handleConnectInjectedEvm() {
    await run("Wisp EVM connected", async () => {
      const connection = await evmWallet.connect();
      evm = connection;
      return connection;
    });
  }

  async function handleConnectWalletConnect() {
    await run("WalletConnect connected", async () => {
      const provider = await walletConnect.connect();
      const connection = await evmWallet.connect(provider, "WalletConnect v2");
      evm = connection;
      return connection;
    });
  }

  async function handleEnsureNetwork() {
    await run("VEX EVM network ready", async () => {
      const chainId = await evmWallet.ensureNetwork();
      if (evm) evm = { ...evm, chainId };
      return chainId;
    });
  }

  async function handleEvmAddress() {
    await run("EVM address", evmWallet.getAddress);
  }

  async function handleEvmBalance() {
    await run("EVM balance", async () => {
      const balance = await evmWallet.getBalance();
      evmBalance = balance;
      return balance;
    });
  }

  async function handleEvmTransfer() {
    if (!window.confirm("Request this real VEX EVM mainnet transfer in Wisp Wallet?")) return;
    await run("EVM transaction", async () => ({
      transactionHash: await evmWallet.sendTransaction({ ...evmForm }),
    }));
  }

  async function handleNativeDisconnect() {
    await run("Native disconnected", async () => {
      await nativeWallet.disconnect();
      native = null;
      nativeBalance = "";
      return "Disconnected";
    });
  }

  async function handleEvmDisconnect() {
    await run("EVM disconnected", async () => {
      if (evm?.method === "WalletConnect v2") await walletConnect.disconnect();
      evmWallet.disconnect();
      evm = null;
      evmBalance = "";
      return "Disconnected";
    });
  }

  function renderedResult() {
    return result
      ? JSON.stringify(result.value, null, 2)
      : "Connect a wallet or send a transaction to see the result.";
  }
</script>

<svelte:head>
  <title>Wisp dApp Example · SvelteKit</title>
  <meta
    name="description"
    content="SvelteKit example for Wisp Wallet, WindStack, VEX Native, and VEX EVM."
  />
</svelte:head>

<main class="page-shell">
  <header class="hero">
    <span class="eyebrow">SvelteKit 2 + Svelte 5 + TypeScript</span>
    <h1>Wisp dApp Example</h1>
    <p>Connect Wisp Wallet, restore an existing session, read balances, and send example VEX Native or VEX EVM transactions.</p>
  </header>

  {#if error}
    <div class="notice error" role="alert"><strong>Request failed</strong><span>{error}</span></div>
  {/if}
  {#if busy}
    <div class="notice pending" role="status">Waiting: {busy}</div>
  {/if}

  <section class="card full">
    <div class="section-heading"><div><span class="step">01</span><h2>Environment</h2></div><span class="status">{environment.runtime}</span></div>
    <dl class="info-grid">
      <div class="info-row"><dt>Runtime</dt><dd>{environment.runtime}</dd></div>
      <div class="info-row"><dt>Secure context</dt><dd>{environment.isSecureContext ? "Yes" : "No — Wisp Telegram requires HTTPS"}</dd></div>
      <div class="info-row"><dt>Wisp Native</dt><dd>{environment.hasInjectedNative ? "Available" : "Not detected"}</dd></div>
      <div class="info-row"><dt>Wisp EVM</dt><dd>{environment.hasInjectedEvm ? "Available" : "Not detected"}</dd></div>
      <div class="info-row"><dt>Native RPC</dt><dd>{appConfig.nativeRpc}</dd></div>
      <div class="info-row"><dt>EVM RPC</dt><dd>{appConfig.evmRpc}</dd></div>
      <div class="info-row"><dt>Wisp API</dt><dd>{appConfig.wispApiUrl}</dd></div>
    </dl>
  </section>

  <div class="columns">
    <section class="card">
      <div class="section-heading"><div><span class="step">02</span><h2>VEX Native</h2></div><span class="status">{restoringNative ? "Restoring…" : native?.method || "Disconnected"}</span></div>
      <div class="button-grid">
        <button type="button" disabled={Boolean(busy) || restoringNative} onclick={handleConnectNative}>Connect Wisp Native</button>
        <button type="button" class="secondary" disabled={Boolean(busy) || restoringNative || !native} onclick={handleNativeAccount}>Get Account</button>
        <button type="button" class="secondary" disabled={Boolean(busy) || restoringNative || !native} onclick={handleNativeBalance}>Get VEX Balance</button>
        <button type="button" class="ghost" disabled={Boolean(busy) || restoringNative || !native} onclick={handleNativeDisconnect}>Disconnect</button>
      </div>
      <p class="hint">A saved Wisp session is checked after hydration. A new connection request only starts when you press Connect.</p>
      <dl class="compact-info">
        <div class="info-row"><dt>Account</dt><dd>{native?.account.permissionLevel || "—"}</dd></div>
        <div class="info-row"><dt>Chain</dt><dd>{native?.chainId || appConfig.nativeChainId}</dd></div>
        <div class="info-row"><dt>Balance</dt><dd>{nativeBalance || "—"}</dd></div>
      </dl>
      <form class="transaction-form" onsubmit={(event) => { event.preventDefault(); void handleNativeTransfer(); }}>
        <h3>Native transfer</h3>
        <label>Recipient<input bind:value={nativeForm.recipient} required placeholder="receiver" autocomplete="off" /></label>
        <label>Amount (VEX)<input bind:value={nativeForm.amount} required inputmode="decimal" /></label>
        <label>Memo<input bind:value={nativeForm.memo} maxlength="256" /></label>
        <button type="submit" disabled={Boolean(busy) || restoringNative || !native}>Send Native Transaction</button>
      </form>
    </section>

    <section class="card">
      <div class="section-heading"><div><span class="step">03</span><h2>VEX EVM</h2></div><span class="status">{evm?.method || "Disconnected"}</span></div>
      <div class="button-grid">
        <button type="button" disabled={Boolean(busy)} onclick={handleConnectInjectedEvm}>Connect Wisp EVM</button>
        <button type="button" class="secondary" disabled={Boolean(busy) || !walletConnect.isConfigured()} onclick={handleConnectWalletConnect}>Connect WalletConnect v2</button>
        <button type="button" class="secondary" disabled={Boolean(busy) || !evm} onclick={handleEnsureNetwork}>Switch/Add VEX EVM Network</button>
        <button type="button" class="secondary" disabled={Boolean(busy) || !evm} onclick={handleEvmAddress}>Get Address</button>
        <button type="button" class="secondary" disabled={Boolean(busy) || !evm} onclick={handleEvmBalance}>Get Native VEX Balance</button>
        <button type="button" class="ghost" disabled={Boolean(busy) || !evm} onclick={handleEvmDisconnect}>Disconnect</button>
      </div>
      {#if !walletConnect.isConfigured()}
        <p class="hint">WalletConnect requires <code>PUBLIC_WALLETCONNECT_PROJECT_ID</code>.</p>
      {/if}
      <dl class="compact-info">
        <div class="info-row"><dt>Address</dt><dd>{evm?.address || "—"}</dd></div>
        <div class="info-row"><dt>Chain</dt><dd>{evm?.chainId || appConfig.evmChainIdHex}</dd></div>
        <div class="info-row"><dt>Balance</dt><dd>{evmBalance || "—"}</dd></div>
      </dl>
      <form class="transaction-form" onsubmit={(event) => { event.preventDefault(); void handleEvmTransfer(); }}>
        <h3>EVM transfer</h3>
        <label>Recipient<input bind:value={evmForm.recipient} required placeholder="0x..." autocomplete="off" /></label>
        <label>Amount (VEX)<input bind:value={evmForm.amount} required inputmode="decimal" /></label>
        <button type="submit" disabled={Boolean(busy) || !evm}>Send EVM Transaction</button>
      </form>
    </section>
  </div>

  <section class="card full">
    <div class="section-heading"><div><span class="step">04</span><h2>Wallet Information</h2></div></div>
    <dl class="info-grid">
      <div class="info-row"><dt>Native connection</dt><dd>{native?.method || "Not connected"}</dd></div>
      <div class="info-row"><dt>Native account</dt><dd>{native?.account.permissionLevel || "—"}</dd></div>
      <div class="info-row"><dt>EVM connection</dt><dd>{evm?.method || "Not connected"}</dd></div>
      <div class="info-row"><dt>EVM address</dt><dd>{evm?.address || "—"}</dd></div>
    </dl>
  </section>

  <section class="card full result-card">
    <div class="section-heading"><div><span class="step">05</span><h2>Latest Result</h2></div><span class="status">{result ? `${result.title} · ${result.at}` : "No request yet"}</span></div>
    <pre>{renderedResult()}</pre>
  </section>
</main>
