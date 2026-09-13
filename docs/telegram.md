# Wisp Telegram

Use the Wisp Telegram transport when a VEX Native dApp runs on a normal HTTPS website and Wisp is not available directly in the page.

## Install

```bash
npm install @windstack/vexanium@2.2.0 @windstack/wallet-plugin-wisp@2.2.0
```

## Create the transport

```ts
import { createWispTelegramTransport } from "@windstack/wallet-plugin-wisp";

const wisp = createWispTelegramTransport({
  apiUrl: "https://api.windcrypto.com/wisp/v1",
  dapp: {
    name: "My dApp",
    origin: window.location.origin,
    url: window.location.href,
  },
});
```

The page must use HTTPS.

If your dApp is itself a Telegram Mini App, you can also provide a return link:

```ts
const wisp = createWispTelegramTransport({
  apiUrl: "https://api.windcrypto.com/wisp/v1",
  telegramReturnUrl: "https://t.me/your_bot/your_app",
  dapp: {
    name: "My dApp",
    origin: window.location.origin,
    url: window.location.href,
  },
});
```

## Restore first

Check for an existing wallet session when the page starts:

```ts
const restored = await wisp.restore();

if (restored) {
  console.log(restored.account.permissionLevel);
}
```

A saved local session value is not treated as connected until Wisp confirms it.

## Connect from a user action

If no session was restored, wait for the user to press Connect:

```ts
async function connectWallet() {
  const session = await wisp.connect();
  console.log(session.account.permissionLevel);
}
```

Do not call `connect()` automatically because `restore()` returned `null`.

## Send a Native transaction

Create a Vexanium client for transaction and ABI access:

```ts
import { createVexaniumClient } from "@windstack/vexanium";

const vex = await createVexaniumClient({
  rpcUrl: "https://api.windcrypto.com",
  dapp: {
    name: "My dApp",
    url: window.location.href,
  },
});
```

Then send structured actions through the connected Wisp Telegram session:

```ts
const account = (await wisp.getAccounts())[0];

const result = await wisp.transact(vex, {
  actions: [
    {
      account: "vex.token",
      name: "transfer",
      data: {
        from: account.actor,
        to: "receiver",
        quantity: "1.0000 VEX",
        memo: "Wisp Telegram example",
      },
    },
  ],
});

console.log(result.transactionId);
```

The same call accepts multiple actions in one transaction.

## Disconnect

```ts
await wisp.disconnect();
```

This clears the local connection and asks Wisp to revoke the wallet session.

## dApp manifest

A deployed dApp should expose:

```text
https://your-dapp.example/wisp-wallet-manifest.json
```

Example:

```json
{
  "url": "https://your-dapp.example",
  "name": "My dApp",
  "iconUrl": "https://your-dapp.example/icon-180.png"
}
```

Use the same HTTPS origin as the dApp. The file should be publicly readable without cookies, login, or Telegram credentials.

The complete React and Vue examples use this transport from `src/lib/wispNative.ts`.
