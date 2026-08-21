# Wisp Android DApp Browser

Open the HTTPS dApp URL in Wisp Wallet's DApp Browser to use both injected transports directly.

## VEX Native

Wisp injects VexaniumProvider v1 and announces its provider identity as `com.wisp.wallet`. Use the WindStack client with that preferred RDNS:

```ts
const client = await createVexaniumClient({
  providerRdns: "com.wisp.wallet",
  autoSync: true,
  dapp: { name, description, url: window.location.href },
});
```

Connect to `vexNative.chainId`. Do not use ScatterJS and do not translate Native actions into EVM RPC methods.

## VEX EVM

Wisp exposes a standard EIP-1193 provider and announces it through EIP-6963 with the same RDNS. Use `eth_requestAccounts`, `eth_accounts`, `eth_chainId`, `wallet_switchEthereumChain`, `wallet_addEthereumChain`, and `eth_sendTransaction`.

The injected path does not need a WalletConnect project ID.

## WebView lifecycle

- Register provider listeners once when the app mounts.
- Remove listeners when it unmounts.
- React to account, chain, and disconnect events instead of keeping stale state.
- Disable action buttons while one wallet request is pending.
- Do not send on page load or reconnect.
- Preserve form state if Android backgrounds and restores the page.

If the page is opened in the Telegram browser instead, use the portable handoff described in [telegram.md](telegram.md); the Telegram browser is not expected to expose Wisp's injected objects.
