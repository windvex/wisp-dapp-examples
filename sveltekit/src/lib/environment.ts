import { WISP_PROVIDER_RDNS } from "@windstack/wallet-plugin-wisp";

export type RuntimeEnvironment = {
  runtime: "Wisp Android DApp Browser" | "Telegram" | "Android browser" | "Desktop browser";
  isAndroid: boolean;
  isTelegram: boolean;
  hasInjectedNative: boolean;
  hasInjectedEvm: boolean;
  isSecureContext: boolean;
};

type RuntimeWindow = Window & {
  Telegram?: { WebApp?: { initData?: string } };
  vexanium?: { providerInfo?: { rdns?: string; standard?: string } };
  ethereum?: { request?: unknown };
};

export function detectEnvironment(): RuntimeEnvironment {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      runtime: "Desktop browser",
      isAndroid: false,
      isTelegram: false,
      hasInjectedNative: false,
      hasInjectedEvm: false,
      isSecureContext: false,
    };
  }

  const runtimeWindow = window as RuntimeWindow;
  const userAgent = navigator.userAgent;
  const isAndroid = /Android/iu.test(userAgent);
  const isTelegram = Boolean(runtimeWindow.Telegram?.WebApp?.initData) || /Telegram/iu.test(userAgent);
  const hasInjectedNative =
    runtimeWindow.vexanium?.providerInfo?.standard === "VexaniumProvider" &&
    runtimeWindow.vexanium.providerInfo.rdns === WISP_PROVIDER_RDNS;
  const hasInjectedEvm =
    hasInjectedNative && typeof runtimeWindow.ethereum?.request === "function";

  const runtime = hasInjectedNative || hasInjectedEvm
    ? "Wisp Android DApp Browser"
    : isTelegram
      ? "Telegram"
      : isAndroid
        ? "Android browser"
        : "Desktop browser";

  return {
    runtime,
    isAndroid,
    isTelegram,
    hasInjectedNative,
    hasInjectedEvm,
    isSecureContext: window.isSecureContext,
  };
}
