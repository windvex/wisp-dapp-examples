import { env } from "$env/dynamic/public";
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

const nativeRpc = text(env.PUBLIC_VEX_NATIVE_RPC, vexNative.rpcUrl).replace(/\/+$/u, "");
const evmRpc = text(env.PUBLIC_VEX_EVM_RPC, vexEvm.rpcUrl).replace(/\/+$/u, "");
const evmChainId = vexEvm.chainId;
const evmChainIdHex = `0x${evmChainId.toString(16)}`;

export const appConfig: AppConfig = {
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
  wispApiUrl: text(env.PUBLIC_WISP_API_URL, "https://api.windcrypto.com/wisp/v1").replace(/\/+$/u, ""),
  wispTelegramReturnUrl: text(env.PUBLIC_WISP_TELEGRAM_RETURN_URL),
  walletConnectProjectId: text(env.PUBLIC_WALLETCONNECT_PROJECT_ID),
  dappUrl: text(env.PUBLIC_DAPP_URL),
};
