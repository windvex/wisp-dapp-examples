import { vexEvm, vexNative } from "@windstack/vexanium";

export const APP_NAME = "Wisp dApp Example";

export type AppConfig = {
  nativeChainId: string;
  nativeRpc: string;
  evmChainId: number;
  evmChainIdHex: string;
  evmRpc: string;
  evmNetwork: {
    chainId: string;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: string[];
    blockExplorerUrls: string[];
  };
  wispApiUrl: string;
  wispTelegramReturnUrl: string;
  walletConnectProjectId: string;
  dappUrl: string;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function createAppConfig(publicConfig: Record<string, unknown>): AppConfig {
  const nativeRpc = text(publicConfig.vexNativeRpc, vexNative.rpcUrl).replace(/\/+$/u, "");
  const evmRpc = text(publicConfig.vexEvmRpc, vexEvm.rpcUrl).replace(/\/+$/u, "");
  const evmChainId = vexEvm.chainId;
  const evmChainIdHex = `0x${evmChainId.toString(16)}`;

  return {
    nativeChainId: vexNative.chainId,
    nativeRpc,
    evmChainId,
    evmChainIdHex,
    evmRpc,
    evmNetwork: {
      chainId: evmChainIdHex,
      chainName: vexEvm.displayName,
      nativeCurrency: { ...vexEvm.nativeCurrency },
      rpcUrls: [evmRpc],
      blockExplorerUrls: [vexEvm.explorerUrl],
    },
    wispApiUrl: text(publicConfig.wispApiUrl, "https://api.windcrypto.com/wisp/v1").replace(/\/+$/u, ""),
    wispTelegramReturnUrl: text(publicConfig.wispTelegramReturnUrl),
    walletConnectProjectId: text(publicConfig.walletConnectProjectId),
    dappUrl: text(publicConfig.dappUrl),
  };
}
