<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from "vue";

import { createAppConfig } from "./lib/config";
import { detectEnvironment, type RuntimeEnvironment } from "./lib/environment";
import { createEvmWallet, type EvmConnection } from "./lib/wispEvm";
import { createNativeWallet, type NativeConnection } from "./lib/wispNative";
import { createWalletConnect } from "./lib/walletConnect";

useHead({
  title: "Wisp dApp Example · Nuxt",
  meta: [
    {
      name: "description",
      content: "Nuxt example for Wisp Wallet, WindStack, VEX Native, and VEX EVM.",
    },
  ],
});

const runtimeConfig = useRuntimeConfig();
const config = createAppConfig(runtimeConfig.public as Record<string, unknown>);
const nativeWallet = createNativeWallet(config);
const evmWallet = createEvmWallet(config);
const walletConnect = createWalletConnect(config);

const environment = ref<RuntimeEnvironment>({
  runtime: "Desktop browser",
  isAndroid: false,
  isTelegram: false,
  hasInjectedNative: false,
  hasInjectedEvm: false,
  isSecureContext: false,
});
const native = ref<NativeConnection | null>(null);
const restoringNative = ref(true);
const nativeBalance = ref("");
const nativeForm = reactive({ recipient: "", amount: "0.0001", memo: "Wisp example" });
const evm = ref<EvmConnection | null>(null);
const evmBalance = ref("");
const evmForm = reactive({ recipient: "", amount: "0.000001" });
const busy = ref("");
const error = ref("");
const result = ref<{ title: string; value: unknown; at: string } | null>(null);

let stopNative: () => void = () => {};
let stopEvm: () => void = () => {};

onMounted(() => {
  environment.value = detectEnvironment();
  stopNative = nativeWallet.subscribe((connection) => {
    native.value = connection;
  });
  stopEvm = evmWallet.subscribe((connection) => {
    evm.value = connection;
  });

  void nativeWallet
    .restore()
    .catch((caught) => {
      error.value = message(caught);
    })
    .finally(() => {
      restoringNative.value = false;
    });
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

async function handleConnectNative() {
  await run("Native connected", async () => {
    const connection = await nativeWallet.connect();
    native.value = connection;
    return connection;
  });
}

async function handleNativeAccount() {
  await run("Native account", nativeWallet.getAccount);
}

async function handleNativeBalance() {
  await run("Native balance", async () => {
    const balance = await nativeWallet.getBalance();
    nativeBalance.value = balance;
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
    evm.value = connection;
    return connection;
  });
}

async function handleConnectWalletConnect() {
  await run("WalletConnect connected", async () => {
    const provider = await walletConnect.connect();
    const connection = await evmWallet.connect(provider, "WalletConnect v2");
    evm.value = connection;
    return connection;
  });
}

async function handleEnsureNetwork() {
  await run("VEX EVM network ready", async () => {
    const chainId = await evmWallet.ensureNetwork();
    if (evm.value) evm.value = { ...evm.value, chainId };
    return chainId;
  });
}

async function handleEvmAddress() {
  await run("EVM address", evmWallet.getAddress);
}

async function handleEvmBalance() {
  await run("EVM balance", async () => {
    const balance = await evmWallet.getBalance();
    evmBalance.value = balance;
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
    native.value = null;
    nativeBalance.value = "";
    return "Disconnected";
  });
}

async function handleEvmDisconnect() {
  await run("EVM disconnected", async () => {
    if (evm.value?.method === "WalletConnect v2") await walletConnect.disconnect();
    evmWallet.disconnect();
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
      <span class="eyebrow">Nuxt 4 + Vue 3 + TypeScript</span>
      <h1>Wisp dApp Example</h1>
      <p>Connect Wisp Wallet, restore an existing session, read balances, and send example VEX Native or VEX EVM transactions.</p>
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
        <div class="info-row"><dt>Native RPC</dt><dd>{{ config.nativeRpc }}</dd></div>
        <div class="info-row"><dt>EVM RPC</dt><dd>{{ config.evmRpc }}</dd></div>
        <div class="info-row"><dt>Wisp API</dt><dd>{{ config.wispApiUrl }}</dd></div>
      </dl>
    </section>

    <div class="columns">
      <section class="card">
        <div class="section-heading"><div><span class="step">02</span><h2>VEX Native</h2></div><span class="status">{{ restoringNative ? "Restoring…" : native?.method || "Disconnected" }}</span></div>
        <div class="button-grid">
          <button :disabled="Boolean(busy) || restoringNative" @click="handleConnectNative">Connect Wisp Native</button>
          <button class="secondary" :disabled="Boolean(busy) || restoringNative || !native" @click="handleNativeAccount">Get Account</button>
          <button class="secondary" :disabled="Boolean(busy) || restoringNative || !native" @click="handleNativeBalance">Get VEX Balance</button>
          <button class="ghost" :disabled="Boolean(busy) || restoringNative || !native" @click="handleNativeDisconnect">Disconnect</button>
        </div>
        <p class="hint">A saved Wisp session is checked after hydration. A new connection request only starts when you press Connect.</p>
        <dl class="compact-info">
          <div class="info-row"><dt>Account</dt><dd>{{ native?.account.permissionLevel || "—" }}</dd></div>
          <div class="info-row"><dt>Chain</dt><dd>{{ native?.chainId || config.nativeChainId }}</dd></div>
          <div class="info-row"><dt>Balance</dt><dd>{{ nativeBalance || "—" }}</dd></div>
        </dl>
        <form class="transaction-form" @submit.prevent="handleNativeTransfer">
          <h3>Native transfer</h3>
          <label>Recipient<input v-model="nativeForm.recipient" required placeholder="receiver" autocomplete="off" /></label>
          <label>Amount (VEX)<input v-model="nativeForm.amount" required inputmode="decimal" /></label>
          <label>Memo<input v-model="nativeForm.memo" maxlength="256" /></label>
          <button type="submit" :disabled="Boolean(busy) || restoringNative || !native">Send Native Transaction</button>
        </form>
      </section>

      <section class="card">
        <div class="section-heading"><div><span class="step">03</span><h2>VEX EVM</h2></div><span class="status">{{ evm?.method || "Disconnected" }}</span></div>
        <div class="button-grid">
          <button :disabled="Boolean(busy)" @click="handleConnectInjectedEvm">Connect Wisp EVM</button>
          <button class="secondary" :disabled="Boolean(busy) || !walletConnect.isConfigured()" @click="handleConnectWalletConnect">Connect WalletConnect v2</button>
          <button class="secondary" :disabled="Boolean(busy) || !evm" @click="handleEnsureNetwork">Switch/Add VEX EVM Network</button>
          <button class="secondary" :disabled="Boolean(busy) || !evm" @click="handleEvmAddress">Get Address</button>
          <button class="secondary" :disabled="Boolean(busy) || !evm" @click="handleEvmBalance">Get Native VEX Balance</button>
          <button class="ghost" :disabled="Boolean(busy) || !evm" @click="handleEvmDisconnect">Disconnect</button>
        </div>
        <p v-if="!walletConnect.isConfigured()" class="hint">WalletConnect requires <code>NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code>.</p>
        <dl class="compact-info">
          <div class="info-row"><dt>Address</dt><dd>{{ evm?.address || "—" }}</dd></div>
          <div class="info-row"><dt>Chain</dt><dd>{{ evm?.chainId || config.evmChainIdHex }}</dd></div>
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
