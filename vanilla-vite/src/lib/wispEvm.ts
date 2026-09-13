import {
  createEVMClient,
  discoverEVMProviders,
  getInjectedEVMProvider,
  normalizeEvmAddress,
  normalizeEvmTransactionHash,
  type EIP1193Provider,
  type EVMClient,
} from "@windstack/evm";
import { createPublicClient, formatEther, http, parseEther, toHex } from "viem";

import {
  VEX_EVM_CHAIN_ID_HEX,
  VEX_EVM_NETWORK,
  VEX_EVM_RPC,
} from "../config";

export type EvmConnectionMethod = "Wisp Wallet" | "WalletConnect v2";

export type EvmConnection = {
  address: `0x${string}`;
  chainId: string;
  method: EvmConnectionMethod;
};

type EvmListener = (connection: EvmConnection | null, reason: string) => void;

type WispMarkedProvider = EIP1193Provider & {
  isWispWallet?: boolean;
  isWisp?: boolean;
};

const publicClient = createPublicClient({ transport: http(VEX_EVM_RPC) });
const listeners = new Set<EvmListener>();

let client: EVMClient | null = null;
let activeConnection: EvmConnection | null = null;
let cleanupProviderEvents: (() => void) | null = null;

function emit(reason: string) {
  for (const listener of listeners) listener(activeConnection, reason);
}

function errorCode(error: unknown) {
  return Number((error as { code?: unknown } | null)?.code);
}

function toAddress(value: unknown): `0x${string}` {
  try {
    return normalizeEvmAddress(String(value || ""));
  } catch {
    throw new Error("Wallet returned an invalid EVM address.");
  }
}

async function discoverWispProvider() {
  const providers = await discoverEVMProviders(350);
  const matches = providers.filter(({ info }) => info.rdns === "com.wisp.wallet");

  if (matches.length > 1) {
    throw new Error("More than one Wisp provider was found. Choose the wallet explicitly in your app.");
  }

  if (matches[0]) return matches[0].provider;

  const injected = getInjectedEVMProvider() as WispMarkedProvider | null;
  if (injected?.request && (injected.isWispWallet || injected.isWisp)) return injected;

  throw new Error("Wisp EVM was not found. Open this page in Wisp Wallet or use WalletConnect v2.");
}

function bindProviderEvents(nextClient: EVMClient, method: EvmConnectionMethod) {
  cleanupProviderEvents?.();

  const accountsChanged = (accounts: string[]) => {
    const first = accounts[0];
    activeConnection = first
      ? {
          address: toAddress(first),
          chainId: activeConnection?.chainId || "",
          method,
        }
      : null;
    emit("accountsChanged");
  };

  const chainChanged = (chainId: string) => {
    if (activeConnection) activeConnection = { ...activeConnection, chainId, method };
    emit("chainChanged");
  };

  const disconnected = () => {
    activeConnection = null;
    emit("disconnect");
  };

  nextClient.on("accountsChanged", accountsChanged);
  nextClient.on("chainChanged", chainChanged);
  nextClient.on("disconnect", disconnected);

  cleanupProviderEvents = () => {
    nextClient.off("accountsChanged", accountsChanged);
    nextClient.off("chainChanged", chainChanged);
    nextClient.off("disconnect", disconnected);
  };
}

export function subscribeEvm(listener: EvmListener) {
  listeners.add(listener);
  listener(activeConnection, "current");
  return () => listeners.delete(listener);
}

export async function connectEvm(
  explicitProvider?: EIP1193Provider,
  method: EvmConnectionMethod = "Wisp Wallet",
) {
  const provider = explicitProvider || (await discoverWispProvider());
  const nextClient = await createEVMClient({ provider });
  const accounts = await nextClient.connect();
  const first = accounts[0];
  if (!first) throw new Error("Wallet returned no EVM account.");

  const chainId = await nextClient.getChainId();
  client = nextClient;
  activeConnection = { address: toAddress(first), chainId, method };
  bindProviderEvents(nextClient, method);
  emit("connect");
  return activeConnection;
}

function requireClient() {
  if (!client || !activeConnection) throw new Error("Connect Wisp EVM first.");
  return client;
}

export async function ensureVexEvmNetwork() {
  const currentClient = requireClient();
  const currentChain = await currentClient.getChainId();
  if (currentChain.toLowerCase() === VEX_EVM_CHAIN_ID_HEX) return VEX_EVM_CHAIN_ID_HEX;

  try {
    await currentClient.switchChain(VEX_EVM_CHAIN_ID_HEX);
  } catch (error) {
    if (errorCode(error) !== 4902) throw error;
    await currentClient.addChain({
      chainId: VEX_EVM_NETWORK.chainId,
      chainName: VEX_EVM_NETWORK.chainName,
      nativeCurrency: { ...VEX_EVM_NETWORK.nativeCurrency },
      rpcUrls: [...VEX_EVM_NETWORK.rpcUrls],
      blockExplorerUrls: [...VEX_EVM_NETWORK.blockExplorerUrls],
    });
    await currentClient.switchChain(VEX_EVM_CHAIN_ID_HEX);
  }

  if (activeConnection) {
    activeConnection = { ...activeConnection, chainId: VEX_EVM_CHAIN_ID_HEX };
    emit("chainChanged");
  }

  return VEX_EVM_CHAIN_ID_HEX;
}

export async function getEvmAddress() {
  const accounts = await requireClient().getAccounts();
  if (!accounts[0]) throw new Error("No EVM account is connected.");
  return toAddress(accounts[0]);
}

export async function getEvmBalance(addressInput?: string) {
  const address = addressInput ? toAddress(addressInput) : await getEvmAddress();
  const balance = await publicClient.getBalance({ address });
  return `${formatEther(balance)} VEX`;
}

export async function sendEvmTransaction(input: { recipient: string; amount: string }) {
  const currentClient = requireClient();
  const recipient = toAddress(input.recipient.trim());

  let value: bigint;
  try {
    value = parseEther(input.amount.trim());
  } catch {
    throw new Error("EVM amount must be a valid decimal with at most 18 decimals.");
  }

  if (value <= 0n) throw new Error("EVM amount must be greater than zero.");

  await ensureVexEvmNetwork();
  const hash = await currentClient.request<string>({
    method: "eth_sendTransaction",
    params: [
      {
        from: activeConnection!.address,
        to: recipient,
        value: toHex(value),
      },
    ],
  });

  return normalizeEvmTransactionHash(hash);
}

export function disconnectEvm() {
  cleanupProviderEvents?.();
  cleanupProviderEvents = null;
  client = null;
  activeConnection = null;
  emit("disconnect");
}
