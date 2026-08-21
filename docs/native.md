# VEX Native

VEX Native uses the WindStack VexaniumProvider v1 interface. Wisp Android injects this provider in its DApp Browser. An external HTTPS page can use the portable Wisp Telegram VSR handoff instead.

## Packages

```bash
npm install @windstack/core @windstack/vexanium @wharfkit/abicache @wharfkit/antelope
```

`@windstack/vexanium` exports the canonical `vexNative` chain definition. Use `vexNative.chainId` instead of duplicating the chain ID in application code.

## Connect

```ts
const client = await createVexaniumClient({
  providerRdns: "com.wisp.wallet",
  discoveryTimeoutMs: 1_200,
  autoSync: true,
  dapp: { name, description, url: window.location.href },
});

const accounts = await client.connect({
  chainId: vexNative.chainId,
  requiredCapabilities: [
    "vex.accounts",
    "vex.sessions",
    "vex.signingRequest",
  ],
});
```

`providerRdns` selects Wisp deterministically. If a product lets users choose between wallets, show an explicit chooser rather than taking the first provider discovered.

## Keep state synchronized

Register one session listener and remove it when the component is disposed:

```ts
const unsubscribe = client.subscribeSession(({ accounts, reason }) => {
  const currentAccount = accounts[0] ?? null;
  console.log(reason, currentAccount);
});
```

The callback covers account updates, chain updates, and wallet disconnects. Do not add a new listener on each button click.

## Read a balance

Call `POST /v1/chain/get_currency_balance` on `https://api.windcrypto.com` with:

```json
{
  "code": "vex.token",
  "account": "alice",
  "symbol": "VEX"
}
```

The response is a string array such as `["1.2345 VEX"]`. An empty array means `0.0000 VEX`.

## Create and sign a transfer

VEX has 4 decimals. A normal transfer action is:

```ts
const action = {
  account: "vex.token",
  name: "transfer",
  authorization: [{ actor, permission }],
  data: {
    from: actor,
    to: recipient,
    quantity: "0.0001 VEX",
    memo: "My dApp transfer",
  },
};
```

Create a VSR with `createSigningRequest`, then call `client.signSigningRequest({ request, broadcast: true })`. The wallet displays and approves the real action; the result contains the broadcast transaction ID.

To call your own contract, replace `account`, `name`, and `data`. Do not change the authorization to an account the connected wallet cannot sign for.

## Validation checklist

- VEX account and permission names: 1–12 characters using `a-z`, `1-5`, and `.`.
- Amount: positive, at most 4 decimals, formatted as `0.0000 VEX`.
- Memo: at most 256 UTF-8 bytes for the example transfer.
- Chain: `vexNative.chainId`.
- Contract: `vex.token` for a standard VEX transfer.
- Treat rejection, disconnect, RPC errors, and broadcast errors as separate visible failures.

See the complete small implementation in each framework's `src/lib/wispNative.ts`.
