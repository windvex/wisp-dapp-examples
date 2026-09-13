import type { EIP1193Provider } from "@windstack/evm";

import {
  APP_NAME,
  VEX_EVM_CHAIN_ID,
  VEX_EVM_RPC,
  WALLETCONNECT_PROJECT_ID,
} from "../config";

type WalletConnectProvider = EIP1193Provider & {
  session?: unknown;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
};

let walletConnectProvider: WalletConnectProvider | null = null;

export function isWalletConnectConfigured() {
  return Boolean(WALLETCONNECT_PROJECT_ID);
}

export async function connectWalletConnect(): Promise<EIP1193Provider> {
  if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("Add VITE_WALLETCONNECT_PROJECT_ID to .env before using WalletConnect v2.");
  }

  if (!walletConnectProvider) {
    const { default: EthereumProvider } = await import("@walletconnect/ethereum-provider");
    walletConnectProvider = (await EthereumProvider.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [VEX_EVM_CHAIN_ID],
      methods: [
        "personal_sign",
        "eth_signTypedData",
        "eth_signTypedData_v3",
        "eth_signTypedData_v4",
        "eth_sendTransaction",
      ],
      events: ["accountsChanged", "chainChanged"],
      rpcMap: { [VEX_EVM_CHAIN_ID]: VEX_EVM_RPC },
      showQrModal: true,
      metadata: {
        name: APP_NAME,
        description: "Wisp Wallet dApp example",
        url: window.location.origin,
        icons: [],
      },
    })) as unknown as WalletConnectProvider;
  }

  if (!walletConnectProvider.session) await walletConnectProvider.connect();
  return walletConnectProvider;
}

export async function disconnectWalletConnect() {
  if (walletConnectProvider?.session) await walletConnectProvider.disconnect();
  walletConnectProvider = null;
}
