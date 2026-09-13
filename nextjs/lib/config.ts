import { vexEvm, vexNative } from "@windstack/vexanium";

export const APP_NAME = "Wisp dApp Example";

export const VEX_NATIVE_CHAIN_ID = vexNative.chainId;
export const VEX_NATIVE_RPC = process.env.NEXT_PUBLIC_VEX_NATIVE_RPC || vexNative.rpcUrl;
export const VEX_EVM_CHAIN_ID = vexEvm.chainId;
export const VEX_EVM_RPC = process.env.NEXT_PUBLIC_VEX_EVM_RPC || vexEvm.rpcUrl;
export const VEX_EVM_CHAIN_ID_HEX = `0x${VEX_EVM_CHAIN_ID.toString(16)}`;
export const WISP_API_URL = (
  process.env.NEXT_PUBLIC_WISP_API_URL || "https://api.windcrypto.com/wisp/v1"
).replace(/\/+$/u, "");
export const WISP_TELEGRAM_RETURN_URL = String(
  process.env.NEXT_PUBLIC_WISP_TELEGRAM_RETURN_URL || "",
).trim();
export const WALLETCONNECT_PROJECT_ID = String(
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
).trim();
export const DAPP_URL = String(process.env.NEXT_PUBLIC_DAPP_URL || "").trim();

export const VEX_EVM_NETWORK = {
  chainId: VEX_EVM_CHAIN_ID_HEX,
  chainName: vexEvm.displayName,
  nativeCurrency: { ...vexEvm.nativeCurrency },
  rpcUrls: [VEX_EVM_RPC],
  blockExplorerUrls: [vexEvm.explorerUrl],
} as const;
