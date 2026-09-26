# Wisp Telegram

Configure the canonical Wisp Telegram transport once and pass it to `createWispConnector()`.

```ts
import { createWispConnector, createWispTelegramTransport } from "@windstack/wallet-plugin-wisp";

const telegram = createWispTelegramTransport({
  apiUrl: "https://api.windcrypto.com/wisp/v1",
  dapp: {
    name: "My dApp",
    origin: window.location.origin,
    url: window.location.href,
  },
});

const wisp = createWispConnector({
  appName: "My dApp",
  rpcUrl: "https://api.windcrypto.com",
  telegram,
  dapp: { name: "My dApp", url: window.location.href },
});
```

Use `wisp.restore()` during startup, `wisp.connect()` only after a user action, and `wisp.disconnect()` for disconnect. The connector chooses the provider route first and Telegram only when appropriate.

For Native transactions on the Telegram route, reuse the same `telegram.transact(await wisp.getProviderClient(), { actions })`. Do not hand-build `/telegram/dapp/*`, polling, SSE parsing, session persistence, or return navigation.
