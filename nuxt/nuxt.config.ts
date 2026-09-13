export default defineNuxtConfig({
  compatibilityDate: "2026-09-01",
  devtools: { enabled: false },
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      vexNativeRpc: "https://api.windcrypto.com",
      vexEvmRpc: "https://api.windcrypto.com/rpc",
      wispApiUrl: "https://api.windcrypto.com/wisp/v1",
      wispTelegramReturnUrl: "",
      walletConnectProjectId: "",
      dappUrl: "",
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
