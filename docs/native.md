# VEX Native

VEX Native dApps use `@windstack/vexanium` for wallet connection and transactions.

## Install

```bash
npm install @windstack/vexanium@2.2.0 @windstack/wallet-plugin-wisp@2.2.0
```

## Create the client

```ts
import { createVexaniumClient } from "@windstack/vexanium";

const vex = await createVexaniumClient({
  providerRdns: "com.wisp.wallet",
  rpcUrl: "https://api.windcrypto.com",
  dapp: {
    name: "My dApp",
    url: window.location.href,
  },
});
```

`providerRdns` selects Wisp when more than one compatible Native wallet is available.

## Connect

Connect only after the user presses a Connect button:

```ts
const account = await vex.connectOne();
console.log(account.actor);
console.log(account.permission);
```

## Restore after reload

Save the wallet session ID after a successful connection:

```ts
const sessionId = vex.getSession()?.walletSessionId;
```

On the next page load, restore that session before showing a new Connect request:

```ts
import { restoreVexaniumSession, vexNative } from "@windstack/vexanium";

const restored = await restoreVexaniumSession(vex, {
  sessionId,
  chainId: vexNative.chainId,
});
```

If restore fails because the session is no longer valid, clear the saved session ID and show the disconnected state. Do not call Connect automatically from page startup.

## Read a balance

A VEX balance can be read from the Native RPC:

```ts
const response = await fetch(
  "https://api.windcrypto.com/v1/chain/get_currency_balance",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: "vex.token",
      account: account.actor,
      symbol: "VEX",
    }),
  },
);

const [balance = "0.0000 VEX"] = await response.json();
```

Check `response.ok` and validate the response before showing it. The example module includes those checks.

## Send a transaction

Use structured actions with `transact()`:

```ts
const result = await vex.transact({
  actions: [
    {
      account: "vex.token",
      name: "transfer",
      data: {
        from: account.actor,
        to: "receiver",
        quantity: "1.0000 VEX",
        memo: "Example transfer",
      },
    },
  ],
});
```

When `authorization` is omitted, WindStack uses the connected wallet permission.

## Multiple actions

Put every action in one array:

```ts
await vex.transact({
  actions: [firstAction, secondAction, thirdAction],
});
```

The wallet receives one transaction containing all actions.

## Call another contract

Change the contract, action name, and data:

```ts
await vex.transact({
  actions: [
    {
      account: "yourcontract",
      name: "youraction",
      data: {
        owner: account.actor,
        value: "example",
      },
    },
  ],
});
```

WindStack loads the contract ABI through the configured Vexanium RPC.

## Input checks used by the example

- VEX account names use `a-z`, `1-5`, and `.` with a maximum of 12 characters.
- VEX amounts use 4 decimals.
- Transfer amounts must be greater than zero.
- The example limits the transfer memo to 256 UTF-8 bytes.

See `react-vite/src/lib/wispNative.ts` or `vue-vite/src/lib/wispNative.ts` for the complete example.
