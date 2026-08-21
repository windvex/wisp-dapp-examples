import {
  createPublicClient,
  formatEther,
  http,
  isAddress,
  isHash,
  parseEther,
  toHex,
  type Address,
  type Hash,
} from "viem";

import {
  VEX_EVM_CHAIN_ID_HEX,
  VEX_EVM_NETWORK,
  VEX_EVM_RPC,
} from "../config";

export type Eip1193Request = {
  method: string;
  params?: readonly unknown[] | Record<string, unknown>;
};

export type Eip1193Provider = {
  isWispWallet?: boolean;
  isWisp?: boolean;
  request<T = unknown>(args: Eip1193Request): Promise<T>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

export type EvmConnectionMethod = "Wisp EIP-1193" | "WalletConnect v2";

export type EvmConnection = {
  address: Address;
  chainId: string;
  method: EvmConnectionMethod;
};

type Eip6963Detail = {
  info: { rdns: string; name: string; uuid: string };
  provider: Eip1193Provider;
};

type EvmListener = (connection: EvmConnection | null, reason: string) => void;

const publicClient = createPublicClient({ transport: http(VEX_EVM_RPC) });
const listeners = new Set<EvmListener>();
let provider: Eip1193Provider | null = null;
let activeConnection: EvmConnection | null = null;
let cleanupProviderEvents: (() => void) | null = null;

function emit(reason: string) {
  for (const listener of listeners) listener(activeConnection, reason);
}

function errorCode(error: unknown) {
  return Number((error as { code?: unknown } | null)?.code);
}

function toAddress(value: unknown) {
  const address = String(value || "");
  if (!isAddress(address)) throw new Error("Wallet returned an invalid EVM address.");
  return address;
}

async function discoverInjectedWisp() {
  const found = new Map<string, Eip6963Detail>();
  const announce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963Detail>).detail;
    if (detail?.info?.rdns === "com.wisp.wallet" && detail.provider) {
      found.set(detail.info.uuid, detail);
    }
  };

  window.addEventListener("eip6963:announceProvider", announce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  window.removeEventListener("eip6963:announceProvider", announce);

  const matches = [...found.values()];
  if (matches.length > 1) {
    throw new Error("Multiple Wisp EIP-1193 providers were announced. Choose one explicitly in your production UI.");
  }
  if (matches[0]) return matches[0].provider;

  const injected = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
  if (injected?.request && (injected.isWispWallet || injected.isWisp)) return injected;
  throw new Error("Wisp EIP-1193 provider was not found. Open this page in the Wisp Android DApp Browser or use WalletConnect v2.");
}

function bindProviderEvents(nextProvider: Eip1193Provider, method: EvmConnectionMethod) {
  cleanupProviderEvents?.();

  const accountsChanged = (...args: unknown[]) => {
    const accounts = Array.isArray(args[0]) ? args[0] : [];
    const first = accounts[0];
    if (!first) activeConnection = null;
    else if (activeConnection) activeConnection = { ...activeConnection, address: toAddress(first), method };
    emit("accountsChanged");
  };
  const chainChanged = (...args: unknown[]) => {
    if (activeConnection) activeConnection = { ...activeConnection, chainId: String(args[0] || ""), method };
    emit("chainChanged");
  };
  const disconnected = () => {
    activeConnection = null;
    emit("disconnect");
  };

  nextProvider.on?.("accountsChanged", accountsChanged);
  nextProvider.on?.("chainChanged", chainChanged);
  nextProvider.on?.("disconnect", disconnected);
  cleanupProviderEvents = () => {
    nextProvider.removeListener?.("accountsChanged", accountsChanged);
    nextProvider.removeListener?.("chainChanged", chainChanged);
    nextProvider.removeListener?.("disconnect", disconnected);
  };
}

export function subscribeEvm(listener: EvmListener) {
  listeners.add(listener);
  listener(activeConnection, "current");
  return () => {
    listeners.delete(listener);
  };
}

export async function connectEvm(
  explicitProvider?: Eip1193Provider,
  method: EvmConnectionMethod = "Wisp EIP-1193",
) {
  provider = explicitProvider || (await discoverInjectedWisp());
  const accounts = await provider.request<unknown[]>({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || !accounts[0]) throw new Error("Wallet returned no EVM account.");
  const chainId = await provider.request<string>({ method: "eth_chainId" });
  activeConnection = { address: toAddress(accounts[0]), chainId: String(chainId), method };
  bindProviderEvents(provider, method);
  emit("connect");
  return activeConnection;
}

export async function ensureVexEvmNetwork() {
  if (!provider) throw new Error("Connect Wisp EVM first.");
  const currentChain = await provider.request<string>({ method: "eth_chainId" });
  if (String(currentChain).toLowerCase() === VEX_EVM_CHAIN_ID_HEX) return VEX_EVM_CHAIN_ID_HEX;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: VEX_EVM_CHAIN_ID_HEX }],
    });
  } catch (error) {
    if (errorCode(error) !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [VEX_EVM_NETWORK],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: VEX_EVM_CHAIN_ID_HEX }],
    });
  }
  return VEX_EVM_CHAIN_ID_HEX;
}

export async function getEvmAddress() {
  if (!provider) throw new Error("Connect Wisp EVM first.");
  const accounts = await provider.request<unknown[]>({ method: "eth_accounts" });
  if (!Array.isArray(accounts) || !accounts[0]) throw new Error("No EVM account is connected.");
  return toAddress(accounts[0]);
}

export async function getEvmBalance(addressInput?: string) {
  const address = addressInput ? toAddress(addressInput) : await getEvmAddress();
  const balance = await publicClient.getBalance({ address });
  return `${formatEther(balance)} VEX`;
}

export async function sendEvmTransaction(input: { recipient: string; amount: string }) {
  if (!provider || !activeConnection) throw new Error("Connect Wisp EVM first.");
  const recipient = toAddress(input.recipient.trim());
  let value: bigint;
  try {
    value = parseEther(input.amount.trim());
  } catch {
    throw new Error("EVM amount must be a valid decimal with at most 18 decimals.");
  }
  if (value <= 0n) throw new Error("EVM amount must be greater than zero.");
  await ensureVexEvmNetwork();
  const hash = await provider.request<Hash>({
    method: "eth_sendTransaction",
    params: [
      {
        from: activeConnection.address,
        to: recipient,
        value: toHex(value),
      },
    ],
  });
  if (!isHash(hash)) throw new Error("Wallet returned an invalid EVM transaction hash.");
  return hash;
}

export function disconnectEvm() {
  cleanupProviderEvents?.();
  cleanupProviderEvents = null;
  provider = null;
  activeConnection = null;
  emit("disconnect");
}
