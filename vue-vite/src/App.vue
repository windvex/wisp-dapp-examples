<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from "vue";

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

type ResultState = { title: string; value: unknown; at: string };

const environment = detectEnvironment();
const native = ref<NativeConnection | null>(null);
const restoringNative = ref(true);
const nativeBalance = ref("");
const nativeForm = reactive({ recipient: "", amount: "0.0001", memo: "Wisp example" });
const evm = ref<EvmConnection | null>(null);
const evmBalance = ref("");
const evmForm = reactive({ recipient: "", amount: "0.000001" });
const busy = ref("");
const error = ref("");
const result = ref<ResultState | null>(null);

let stopNative: () => unknown = () => undefined;
let stopEvm: () => unknown = () => undefined;

onMounted(() => {
  stopNative = subscribeNative((connection) => { native.value = connection; });
  stopEvm = subscribeEvm((connection) => { evm.value = connection; });

  void restoreNative()
    .catch((caught) => { error.value = message(caught); })
    .finally(() => { restoringNative.value = false; });
});

onUnmounted(() => {
  stopNative();
  stopEvm();
});

function message(caught: unknown) {
  return caught instanceof Error ? caught.message : "Unexpected request failure.";
}

async function run<T>(title: string, operation: () => Promise<T>) {
  if (busy.value) return undefined;
  busy.value = title;
  error.value = "";
  try {
    const value = await operation();
    result.value = { title, value, at: new Date().toISOString() };
    return value;
  } catch (caught) {
    error.value = message(caught);
    return undefined;
  } finally {
    busy.value = "";
  }
}

function nativeDisabled() {
  return Boolean(busy.value) || restoringNative.value;
}

async function handleConnectNative() {
  await run("Native connected", async () => {
    const connection = await connectNative();
    native.value = connection;
    return connection;
  });
}

async function handleNativeAccount() {
  await run("Native account", getNativeAccount);
}

async function handleNativeBalance() {
  await run("Native balance", async () => {
    const balance = await getNativeBalance();
    nativeBalance.value = balance;
    return balance;
  });
}

async function handleNativeTransfer() {
  if (!window.confirm("Request this real VEX Native mainnet transfer in Wisp Wallet?")) return;
  await run("Native transaction", () => sendNativeTransfer({ ...nativeForm }));
}

async function handleConnectInjectedEvm() {
  await run("Wisp EVM connected", async () => {
    const connection = await connectEvm();
    evm.value = connection;
    return connection;
  });
}

async function handleConnectWalletConnect() {
  await run("WalletConnect connected", async () => {
    const provider = await connectWalletConnect();
    const connection = await connectEvm(provider, "WalletConnect v2");
    evm.value = connection;
    return connection;
  });
}

async function handleEnsureNetwork() {
  await run("VEX EVM network ready", async () => {
    const chainId = await ensureVexEvmNetwork();
    if (evm.value) evm.value = { ...evm.value, chainId };
    return chainId;
  });
}

async function handleEvmAddress() {
  await run("EVM address", getEvmAddress);
}

async function handleEvmBalance() {
  await run("EVM balance", async () => {
    const balance = await getEvmBalance();
    evmBalance.value = balance;
    return balance;
  });
}

async function handleEvmTransfer() {
  if (!window.confirm("Request this real VEX EVM mainnet transfer in Wisp Wallet?")) return;
  await run("EVM transaction", async () => ({
    transactionHash: await sendEvmTransaction({ ...evmForm }),
  }));
}

async function handleNativeDisconnect() {
  await run("Native disconnected", async () => {
    await disconnectNative();
    native.value = null;
    nativeBalance.value = "";
    return "Disconnected";
  });
}

async function handleEvmDisconnect() {
  await run("EVM disconnected", async () => {
    if (evm.value?.method === "WalletConnect v2") await disconnectWalletConnect();
    disconnectEvm();
    evm.value = null;
    evmBalance.value = "";
    return "Disconnected";
  });
}

function renderedResult() {
  return result.value
    ? JSON.stringify(result.value.value, null, 2)
    : "Connect a wallet or send a transaction to see the result.";
}
</script>

<template>
  <main class="page-shell">
    <header class="hero">
      <span class="eyebrow">Vue 3 + Vite + TypeScript</span>
      <h1>Wisp dApp Example</h1>
      <p>Connect Wisp Wallet, read balances, and send example VEX Native or VEX EVM transactions.</p>
    </header>

    <div v-if="error" class="notice error" role="alert"><strong>Request failed</strong><span>{{ error }}</span></div>
    <div v-if="busy" class="notice pending" role="status">Waiting: {{ busy }}</div>

    <section class="card full">
      <div class="section-heading"><div><span class="step">01</span><h2>Environment</h2></div><span class="status">{{ environment.runtime }}</span></div>
      <dl class="info-grid">
        <div class="info-row"><dt>Runtime</dt><dd>{{ environment.runtime }}</dd></div>
        <div class="info-row"><dt>Secure context</dt><dd>{{ environment.isSecureContext ? "Yes" : "No — Wisp Telegram requires HTTPS" }}</dd></div>
        <div class="info-row"><dt>Wisp Native</dt><dd>{{ environment.hasInjectedNative ? "Available" : "Not detected" }}</dd></div>
        <div class="info-row"><dt>Wisp EVM</dt><dd>{{ environment.hasInjectedEvm ? "Available" : "Not detected" }}</dd></div>
        <div class="info-row"><dt>Native RPC</dt><dd>{{ VEX_NATIVE_RPC }}</dd></div>
        <div class="info-row"><dt>EVM RPC</dt><dd>{{ VEX_EVM_RPC }}</dd></div>
        <div class="info-row"><dt>Wisp API</dt><dd>{{ WISP_API_URL }}</dd></div>
      </dl>
    </section>

    <div class="columns">
      <section class="card">
        <div class="section-heading"><div><span class="step">02</span><h2>VEX Native</h2></div><span class="status">{{ restoringNative ? "Restoring…" : native?.method || "Disconnected" }}</span></div>
        <div class="button-grid">
          <button :disabled="nativeDisabled()" @click="handleConnectNative">Connect Wisp Native</button>
          <button class="secondary" :disabled="nativeDisabled() || !native" @click="handleNativeAccount">Get Account</button>
          <button class="secondary" :disabled="nativeDisabled() || !native" @click="handleNativeBalance">Get VEX Balance</button>
          <button class="ghost" :disabled="nativeDisabled() || !native" @click="handleNativeDisconnect">Disconnect</button>
        </div>
        <p class="hint">A saved Wisp session is checked when the page opens. Connecting is only requested when you press Connect.</p>
        <dl class="compact-info">
          <div class="info-row"><dt>Account</dt><dd>{{ native?.account.permissionLevel || "—" }}</dd></div>
          <div class="info-row"><dt>Chain</dt><dd>{{ native?.chainId || VEX_NATIVE_CHAIN_ID }}</dd></div>
          <div class="info-row"><dt>Balance</dt><dd>{{ nativeBalance || "—" }}</dd></div>
        </dl>
        <form class="transaction-form" @submit.prevent="handleNativeTransfer">
          <h3>Native transfer</h3>
          <label>Recipient<input v-model="nativeForm.recipient" required placeholder="receiver" autocomplete="off" /></label>
          <label>Amount (VEX)<input v-model="nativeForm.amount" required inputmode="decimal" /></label>
          <label>Memo<input v-model="nativeForm.memo" maxlength="256" /></label>
          <button type="submit" :disabled="nativeDisabled() || !native">Send Native Transaction</button>
        </form>
      </section>

      <section class="card">
        <div class="section-heading"><div><span class="step">03</span><h2>VEX EVM</h2></div><span class="status">{{ evm?.method || "Disconnected" }}</span></div>
        <div class="button-grid">
          <button :disabled="Boolean(busy)" @click="handleConnectInjectedEvm">Connect Wisp EVM</button>
          <button class="secondary" :disabled="Boolean(busy) || !isWalletConnectConfigured()" @click="handleConnectWalletConnect">Connect WalletConnect v2</button>
          <button class="secondary" :disabled="Boolean(busy) || !evm" @click="handleEnsureNetwork">Switch/Add VEX EVM Network</button>
          <button class="secondary" :disabled="Boolean(busy) || !evm" @click="handleEvmAddress">Get Address</button>
          <button class="secondary" :disabled="Boolean(busy) || !evm" @click="handleEvmBalance">Get Native VEX Balance</button>
          <button class="ghost" :disabled="Boolean(busy) || !evm" @click="handleEvmDisconnect">Disconnect</button>
        </div>
        <p v-if="!isWalletConnectConfigured()" class="hint">WalletConnect requires <code>VITE_WALLETCONNECT_PROJECT_ID</code>.</p>
        <dl class="compact-info">
          <div class="info-row"><dt>Address</dt><dd>{{ evm?.address || "—" }}</dd></div>
          <div class="info-row"><dt>Chain</dt><dd>{{ evm?.chainId || VEX_EVM_CHAIN_ID_HEX }}</dd></div>
          <div class="info-row"><dt>Balance</dt><dd>{{ evmBalance || "—" }}</dd></div>
        </dl>
        <form class="transaction-form" @submit.prevent="handleEvmTransfer">
          <h3>EVM transfer</h3>
          <label>Recipient<input v-model="evmForm.recipient" required placeholder="0x..." autocomplete="off" /></label>
          <label>Amount (VEX)<input v-model="evmForm.amount" required inputmode="decimal" /></label>
          <button type="submit" :disabled="Boolean(busy) || !evm">Send EVM Transaction</button>
        </form>
      </section>
    </div>

    <section class="card full">
      <div class="section-heading"><div><span class="step">04</span><h2>Wallet Information</h2></div></div>
      <dl class="info-grid">
        <div class="info-row"><dt>Native connection</dt><dd>{{ native?.method || "Not connected" }}</dd></div>
        <div class="info-row"><dt>Native account</dt><dd>{{ native?.account.permissionLevel || "—" }}</dd></div>
        <div class="info-row"><dt>EVM connection</dt><dd>{{ evm?.method || "Not connected" }}</dd></div>
        <div class="info-row"><dt>EVM address</dt><dd>{{ evm?.address || "—" }}</dd></div>
      </dl>
    </section>

    <section class="card full result-card">
      <div class="section-heading"><div><span class="step">05</span><h2>Latest Result</h2></div><span class="status">{{ result ? `${result.title} · ${result.at}` : "No request yet" }}</span></div>
      <pre>{{ renderedResult() }}</pre>
    </section>
  </main>
</template>
