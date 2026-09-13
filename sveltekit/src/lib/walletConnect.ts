import type { EIP1193Provider } from "@windstack/evm";

import { APP_NAME, type AppConfig } from "./config";

type WalletConnectProvider = EIP1193Provider & {
  session?: unknown;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
};

export function createWalletConnect(config: AppConfig) {
  let provider: WalletConnectProvider | null = null;

  return {
    isConfigured() {
      return Boolean(config.walletConnectProjectId);
    },

    async connect(): Promise<EIP1193Provider> {
      if (!config.walletConnectProjectId) {
        throw new Error("Add PUBLIC_WALLETCONNECT_PROJECT_ID to .env before using WalletConnect v2.");
      }

      if (!provider) {
        const { default: EthereumProvider } = await import("@walletconnect/ethereum-provider");
        provider = (await EthereumProvider.init({
          projectId: config.walletConnectProjectId,
          chains: [config.evmChainId],
          methods: [
            "personal_sign",
            "eth_signTypedData",
            "eth_signTypedData_v3",
            "eth_signTypedData_v4",
            "eth_sendTransaction",
          ],
          events: ["accountsChanged", "chainChanged"],
          rpcMap: { [config.evmChainId]: config.evmRpc },
          showQrModal: true,
          metadata: {
            name: APP_NAME,
            description: "Wisp Wallet dApp example",
            url: typeof window === "undefined" ? config.dappUrl : window.location.origin,
            icons: [],
          },
        })) as unknown as WalletConnectProvider;
      }

      if (!provider.session) await provider.connect();
      return provider;
    },

    async disconnect() {
      if (provider?.session) await provider.disconnect();
      provider = null;
    },
  };
}
