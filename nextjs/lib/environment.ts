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
  ethereum?: { isWispWallet?: boolean; isWisp?: boolean };
  __WISP_WALLET_INJECTED__?: boolean;
};

export function detectEnvironment(): RuntimeEnvironment {
  const runtimeWindow = window as RuntimeWindow;
  const userAgent = navigator.userAgent;
  const isAndroid = /Android/iu.test(userAgent);
  const isTelegram = Boolean(runtimeWindow.Telegram?.WebApp?.initData) || /Telegram/iu.test(userAgent);
  const hasInjectedNative =
    runtimeWindow.vexanium?.providerInfo?.standard === "VexaniumProvider" &&
    runtimeWindow.vexanium.providerInfo.rdns === "com.wisp.wallet";
  const hasInjectedEvm = Boolean(
    runtimeWindow.ethereum?.isWispWallet ||
      runtimeWindow.ethereum?.isWisp ||
      runtimeWindow.__WISP_WALLET_INJECTED__,
  );

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
