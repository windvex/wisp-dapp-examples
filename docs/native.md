# VEX Native

VEX Native examples use `createWispConnector()` from `@windstack/wallet-plugin-wisp` for the Wisp connection lifecycle and `@windstack/vexanium` for chain operations.

## Candidate installation

During the coordinated pre-release, authoritative validation injects the exact immutable WindStack 2.4.0 candidate tarballs. After publication, install the coordinated 2.4.0 packages from npm.

```bash
npm install @windstack/vexanium@2.4.0 @windstack/wallet-plugin-wisp@2.4.0
```

## Create the connector

```ts
import { createWispConnector, createWispTelegramTransport } from "@windstack/wallet-plugin-wisp";

const telegram = window.location.protocol === "https:"
  ? createWispTelegramTransport({
      apiUrl: "https://api.windcrypto.com/wisp/v1",
      dapp: {
        name: "My dApp",
        origin: window.location.origin,
        url: window.location.href,
      },
    })
  : undefined;

const wisp = createWispConnector({
  appName: "My dApp",
  rpcUrl: "https://api.windcrypto.com",
  dapp: { name: "My dApp", url: window.location.href },
  ...(telegram ? { telegram } : {}),
});
```

## Restore and connect

Call `await wisp.restore()` during startup. If no session is restored, remain disconnected. Only call `await wisp.connect()` from an explicit user action.

The connector owns provider discovery, provider-session persistence, restore, disconnect, and Telegram fallback. Do not maintain a second session key in application code.

## Transactions

For a connected provider route, obtain the Vexanium client with `await wisp.getProviderClient()` and send structured actions. For the Telegram route, the example reuses the same canonical Telegram transport for `transact()`; it does not reimplement the handoff protocol.

Input validation, balance display, transfer forms, and other DApp state remain application-owned.
