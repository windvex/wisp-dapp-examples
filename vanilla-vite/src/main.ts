import "./style.css";

import {
  VEX_EVM_CHAIN_ID_HEX,
  VEX_EVM_RPC,
  VEX_NATIVE_CHAIN_ID,
  VEX_NATIVE_RPC,
  WISP_API_URL,
} from "./config";
import { detectEnvironment } from "./lib/environment";
import {
  connectWalletConnect,
  disconnectWalletConnect,
  isWalletConnectConfigured,
} from "./lib/walletConnect";
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

function node<T extends Element>(selector: string) {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing element: ${selector}`);
  return value;
}

const errorBox = node<HTMLDivElement>("#error");
const busyBox = node<HTMLDivElement>("#busy");
const resultBox = node<HTMLPreElement>("#result");

const runtimeValue = node<HTMLElement>("#runtime-value");
const secureValue = node<HTMLElement>("#secure-value");
const nativeProviderValue = node<HTMLElement>("#native-provider-value");
const evmProviderValue = node<HTMLElement>("#evm-provider-value");
const nativeRpcValue = node<HTMLElement>("#native-rpc-value");
const evmRpcValue = node<HTMLElement>("#evm-rpc-value");
const wispApiValue = node<HTMLElement>("#wisp-api-value");

const nativeMethodValue = node<HTMLElement>("#native-method-value");
const nativeAccountValue = node<HTMLElement>("#native-account-value");
const nativeChainValue = node<HTMLElement>("#native-chain-value");
const nativeBalanceValue = node<HTMLElement>("#native-balance-value");

const evmMethodValue = node<HTMLElement>("#evm-method-value");
const evmAddressValue = node<HTMLElement>("#evm-address-value");
const evmChainValue = node<HTMLElement>("#evm-chain-value");
const evmBalanceValue = node<HTMLElement>("#evm-balance-value");

const connectNativeButton = node<HTMLButtonElement>("#connect-native");
const getNativeAccountButton = node<HTMLButtonElement>("#get-native-account");
const getNativeBalanceButton = node<HTMLButtonElement>("#get-native-balance");
const disconnectNativeButton = node<HTMLButtonElement>("#disconnect-native");
const connectWispEvmButton = node<HTMLButtonElement>("#connect-wisp-evm");
const connectWalletConnectButton = node<HTMLButtonElement>("#connect-walletconnect");
const ensureNetworkButton = node<HTMLButtonElement>("#ensure-network");
const getEvmAddressButton = node<HTMLButtonElement>("#get-evm-address");
const getEvmBalanceButton = node<HTMLButtonElement>("#get-evm-balance");
const disconnectEvmButton = node<HTMLButtonElement>("#disconnect-evm");

const nativeForm = node<HTMLFormElement>("#native-transfer-form");
const nativeRecipient = node<HTMLInputElement>("#native-recipient");
const nativeAmount = node<HTMLInputElement>("#native-amount");
const nativeMemo = node<HTMLInputElement>("#native-memo");
const evmForm = node<HTMLFormElement>("#evm-transfer-form");
const evmRecipient = node<HTMLInputElement>("#evm-recipient");
const evmAmount = node<HTMLInputElement>("#evm-amount");

let nativeConnection: NativeConnection | null = null;
let evmConnection: EvmConnection | null = null;
let nativeBalance = "";
let evmBalance = "";
let busy = false;
let restoringNative = true;

function stringify(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item: unknown) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected request failure.";
}

function showError(value = "") {
  errorBox.textContent = value;
  errorBox.hidden = !value;
}

function showBusy(label = "") {
  busyBox.textContent = label ? `Waiting: ${label}` : "";
  busyBox.hidden = !label;
}

function showResult(title: string, value: unknown) {
  resultBox.textContent = stringify({
    title,
    value,
    at: new Date().toISOString(),
  });
}

function render() {
  nativeMethodValue.textContent = restoringNative
    ? "Restoring…"
    : nativeConnection?.method || "Disconnected";
  nativeAccountValue.textContent = nativeConnection?.account.permissionLevel || "—";
  nativeChainValue.textContent = nativeConnection?.chainId || VEX_NATIVE_CHAIN_ID;
  nativeBalanceValue.textContent = nativeBalance || "—";

  evmMethodValue.textContent = evmConnection?.method || "Disconnected";
  evmAddressValue.textContent = evmConnection?.address || "—";
  evmChainValue.textContent = evmConnection?.chainId || VEX_EVM_CHAIN_ID_HEX;
  evmBalanceValue.textContent = evmBalance || "—";

  const nativeDisabled = busy || restoringNative;
  connectNativeButton.disabled = nativeDisabled || Boolean(nativeConnection);
  getNativeAccountButton.disabled = nativeDisabled || !nativeConnection;
  getNativeBalanceButton.disabled = nativeDisabled || !nativeConnection;
  disconnectNativeButton.disabled = nativeDisabled || !nativeConnection;
  nativeForm.querySelectorAll("button, input").forEach((element) => {
    (element as HTMLButtonElement | HTMLInputElement).disabled = nativeDisabled || !nativeConnection;
  });

  connectWispEvmButton.disabled = busy || Boolean(evmConnection);
  connectWalletConnectButton.disabled = busy || Boolean(evmConnection) || !isWalletConnectConfigured();
  ensureNetworkButton.disabled = busy || !evmConnection;
  getEvmAddressButton.disabled = busy || !evmConnection;
  getEvmBalanceButton.disabled = busy || !evmConnection;
  disconnectEvmButton.disabled = busy || !evmConnection;
  evmForm.querySelectorAll("button, input").forEach((element) => {
    (element as HTMLButtonElement | HTMLInputElement).disabled = busy || !evmConnection;
  });
}

async function run<T>(label: string, operation: () => Promise<T>) {
  if (busy) return undefined;

  busy = true;
  showError();
  showBusy(label);
  render();

  try {
    const value = await operation();
    showResult(label, value);
    return value;
  } catch (error) {
    showError(message(error));
    return undefined;
  } finally {
    busy = false;
    showBusy();
    render();
  }
}

const environment = detectEnvironment();
runtimeValue.textContent = environment.runtime;
secureValue.textContent = environment.isSecureContext ? "Yes" : "No — Wisp Telegram requires HTTPS";
nativeProviderValue.textContent = environment.hasInjectedNative ? "Available" : "Not detected";
evmProviderValue.textContent = environment.hasInjectedEvm ? "Available" : "Not detected";
nativeRpcValue.textContent = VEX_NATIVE_RPC;
evmRpcValue.textContent = VEX_EVM_RPC;
wispApiValue.textContent = WISP_API_URL;

subscribeNative((connection) => {
  nativeConnection = connection;
  render();
});

subscribeEvm((connection) => {
  evmConnection = connection;
  render();
});

connectNativeButton.addEventListener("click", () => {
  void run("Native connected", connectNative);
});

getNativeAccountButton.addEventListener("click", () => {
  void run("Native account", getNativeAccount);
});

getNativeBalanceButton.addEventListener("click", () => {
  void run("Native balance", async () => {
    nativeBalance = await getNativeBalance();
    return nativeBalance;
  });
});

disconnectNativeButton.addEventListener("click", () => {
  void run("Native disconnected", async () => {
    await disconnectNative();
    nativeBalance = "";
    return "Disconnected";
  });
});

nativeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!window.confirm("Request this real VEX Native mainnet transfer in Wisp Wallet?")) return;

  void run("Native transaction", () =>
    sendNativeTransfer({
      recipient: nativeRecipient.value,
      amount: nativeAmount.value,
      memo: nativeMemo.value,
    }),
  );
});

connectWispEvmButton.addEventListener("click", () => {
  void run("Wisp EVM connected", () => connectEvm());
});

connectWalletConnectButton.addEventListener("click", () => {
  void run("WalletConnect connected", async () => {
    const provider = await connectWalletConnect();
    return connectEvm(provider, "WalletConnect v2");
  });
});

ensureNetworkButton.addEventListener("click", () => {
  void run("VEX EVM network ready", ensureVexEvmNetwork);
});

getEvmAddressButton.addEventListener("click", () => {
  void run("EVM address", getEvmAddress);
});

getEvmBalanceButton.addEventListener("click", () => {
  void run("EVM balance", async () => {
    evmBalance = await getEvmBalance();
    return evmBalance;
  });
});

disconnectEvmButton.addEventListener("click", () => {
  void run("EVM disconnected", async () => {
    if (evmConnection?.method === "WalletConnect v2") await disconnectWalletConnect();
    disconnectEvm();
    evmBalance = "";
    return "Disconnected";
  });
});

evmForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!window.confirm("Request this real VEX EVM mainnet transfer in Wisp Wallet?")) return;

  void run("EVM transaction", async () => ({
    transactionHash: await sendEvmTransaction({
      recipient: evmRecipient.value,
      amount: evmAmount.value,
    }),
  }));
});

render();
void restoreNative()
  .catch((error) => showError(message(error)))
  .finally(() => {
    restoringNative = false;
    render();
  });
