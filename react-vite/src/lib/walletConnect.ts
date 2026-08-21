import {
  APP_NAME,
  VEX_EVM_CHAIN_ID,
  VEX_EVM_RPC,
  WALLETCONNECT_PROJECT_ID,
} from "../config";
import type { Eip1193Provider } from "./wispEvm";

type WalletConnectProvider = Eip1193Provider & {
  session?: unknown;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
};

let walletConnectProvider: WalletConnectProvider | null = null;

export function isWalletConnectConfigured() {
  return Boolean(WALLETCONNECT_PROJECT_ID);
}

export async function connectWalletConnect(): Promise<Eip1193Provider> {
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
        description: "Developer example for Wisp Wallet.",
        url: window.location.origin,
        icons: [],
      },
    })) as unknown as WalletConnectProvider;
  }
  if (!walletConnectProvider.session) await walletConnectProvider.connect();
  return walletConnectProvider as unknown as Eip1193Provider;
}

export async function disconnectWalletConnect() {
  if (walletConnectProvider?.session) await walletConnectProvider.disconnect();
  walletConnectProvider = null;
}
