# Wisp Android

Open the dApp in Wisp Wallet's DApp Browser to use Wisp directly for both VEX Native and VEX EVM.

## VEX Native

Create the WindStack client with Wisp's RDNS:

```ts
const vex = await createVexaniumClient({
  providerRdns: "com.wisp.wallet",
  rpcUrl: "https://api.windcrypto.com",
  dapp: {
    name: "My dApp",
    url: window.location.href,
  },
});
```

Connect only after the user presses Connect:

```ts
const account = await vex.connectOne();
```

After a successful connection, save `vex.getSession()?.walletSessionId`. On a later page load, use `restoreVexaniumSession()` before offering a new connection.

Transactions can be sent directly with `vex.transact()`.

## VEX EVM

Wisp exposes a standard EVM provider. Find it with EIP-6963 and create a WindStack EVM client:

```ts
const providers = await discoverEVMProviders();
const wisp = providers.find(({ info }) => info.rdns === "com.wisp.wallet");

if (!wisp) throw new Error("Wisp Wallet was not found");

const evm = await createEVMClient({ provider: wisp.provider });
const accounts = await evm.connect();
```

The Wisp Android path does not require a WalletConnect project ID.

## Page lifecycle

- Check an existing Native session before showing Connect.
- Connect only from a user action.
- Register account, chain, and disconnect listeners once.
- Remove listeners when the page is disposed.
- Keep transaction forms intact when the app is backgrounded.
- Disable transaction buttons while another wallet request is pending.
- Never send a transaction automatically when the page opens.

If the dApp is opened in a normal HTTPS browser instead, VEX Native can use the [Wisp Telegram](telegram.md) transport and VEX EVM can use WalletConnect v2.
