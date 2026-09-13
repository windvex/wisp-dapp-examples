# Wisp dApp Examples

Starter projects for building Vexanium dApps with Wisp Wallet and WindStack 2.2.

The examples cover the same wallet flows:

- connect Wisp Wallet on VEX Native
- restore an existing VEX Native wallet session when the page opens
- read the connected account and VEX balance
- send a VEX Native transaction with `@windstack/vexanium`
- connect Wisp on VEX EVM
- connect an external EVM wallet with WalletConnect v2
- switch or add the VEX EVM network
- read an EVM balance and send an EVM transaction
- use Wisp Telegram from a normal HTTPS website when the Wisp provider is not embedded in the page

These examples use VEX mainnet. A transaction is only requested after the user submits the form and approves it in the wallet.

## Examples

| Folder | Stack |
| --- | --- |
| `react-vite` | React 19, Vite, TypeScript |
| `nextjs` | Next.js 16, React 19, App Router, TypeScript |
| `vue-vite` | Vue 3, Vite, TypeScript |

## Quick start

### React + Vite

```bash
git clone https://github.com/windvex/wisp-dapp-examples.git
cd wisp-dapp-examples/react-vite
npm install
cp .env.example .env
npm run dev
```

### Next.js

```bash
git clone https://github.com/windvex/wisp-dapp-examples.git
cd wisp-dapp-examples/nextjs
npm install
cp .env.example .env.local
npm run dev
```

### Vue + Vite

```bash
git clone https://github.com/windvex/wisp-dapp-examples.git
cd wisp-dapp-examples/vue-vite
npm install
cp .env.example .env
npm run dev
```

Use Node.js 20.19 or newer.

Run the local checks inside an example folder with:

```bash
npm run check
```

## Packages used

The examples use the public WindStack packages directly:

```bash
npm install @windstack/vexanium@2.2.0 @windstack/wallet-plugin-wisp@2.2.0 @windstack/evm@2.2.0
```

VEX Native transaction construction, ABI loading, authorization, signing requests, and wallet signing are handled by WindStack. The examples do not add another transaction serializer or wallet compatibility layer.

## Configuration

React and Vue use Vite environment variables:

```dotenv
VITE_VEX_NATIVE_RPC=https://api.windcrypto.com
VITE_VEX_EVM_RPC=https://api.windcrypto.com/rpc
VITE_WISP_API_URL=https://api.windcrypto.com/wisp/v1
VITE_WISP_TELEGRAM_RETURN_URL=
VITE_WALLETCONNECT_PROJECT_ID=
```

Next.js uses the same values with the `NEXT_PUBLIC_` prefix:

```dotenv
NEXT_PUBLIC_VEX_NATIVE_RPC=https://api.windcrypto.com
NEXT_PUBLIC_VEX_EVM_RPC=https://api.windcrypto.com/rpc
NEXT_PUBLIC_WISP_API_URL=https://api.windcrypto.com/wisp/v1
NEXT_PUBLIC_WISP_TELEGRAM_RETURN_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_DAPP_URL=
```

The Telegram return URL is optional. Set it only when the dApp itself is a Telegram Mini App and should return to a specific `https://t.me/...` Mini App link after Wisp finishes a request.

The WalletConnect project ID is only needed for the external VEX EVM WalletConnect path.

For the Next.js example, set `NEXT_PUBLIC_DAPP_URL` to the deployed HTTPS origin when using the included Wisp manifest route.

## VEX Native

Create one WindStack client for the page:

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

When Wisp is available in the page, connect from a user action:

```ts
const account = await vex.connectOne();
console.log(account.permissionLevel);
```

Send a transaction with structured actions:

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
        memo: "Hello from my dApp",
      },
    },
  ],
});

console.log(result);
```

For more than one action, put every action in the same `actions` array. WindStack keeps them in one transaction and sends one wallet request.

```ts
await vex.transact({
  actions: [firstAction, secondAction, thirdAction],
});
```

## Restore a Native wallet session

A page reload should check an existing wallet session before showing a new Connect request.

For a Wisp provider session, store only the wallet-issued session ID and restore it with WindStack:

```ts
import { restoreVexaniumSession, vexNative } from "@windstack/vexanium";

const restored = await restoreVexaniumSession(vex, {
  sessionId: savedSessionId,
  chainId: vexNative.chainId,
});
```

If the wallet says the session is expired or revoked, treat the dApp as disconnected. Do not automatically open a new connection request during page startup.

The complete flow is in each example's `wispNative.ts` file.

## Wisp Telegram

A normal HTTPS page can use the WindStack Wisp Telegram transport when a Wisp Native provider is not available in the page.

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

On page startup, restore first:

```ts
const restored = await wisp.restore();
```

Only call `connect()` after the user presses Connect:

```ts
const session = await wisp.connect();
```

Transactions use the same structured action format:

```ts
await wisp.transact(vex, {
  actions: [
    {
      account: "vex.token",
      name: "transfer",
      data: {
        from: session.account.actor,
        to: "receiver",
        quantity: "1.0000 VEX",
        memo: "Telegram example",
      },
    },
  ],
});
```

The transport handles the Wisp request, persistent session, return flow, and result delivery. Application code does not need to poll a request endpoint.

## VEX EVM

VEX EVM uses standard Ethereum wallet interfaces. The examples use `@windstack/evm` for provider discovery and wallet requests.

```ts
import { createEVMClient, discoverEVMProviders } from "@windstack/evm";

const providers = await discoverEVMProviders();
const wisp = providers.find(({ info }) => info.rdns === "com.wisp.wallet");

if (!wisp) throw new Error("Wisp Wallet was not found");

const evm = await createEVMClient({ provider: wisp.provider });
const accounts = await evm.connect();
const chainId = await evm.getChainId();
```

For external EVM wallets, the examples create a WalletConnect v2 provider and pass that provider to the same WindStack EVM client.

## Project files

React and Vue keep their wallet modules under `src/lib`. The Next.js example keeps the same modules under `lib` and its UI under `app`.

- `wispNative.ts` — Native connect, restore, balance, disconnect, and transactions
- `wispEvm.ts` — Wisp EVM discovery, network switching, balance, and transactions
- `walletConnect.ts` — WalletConnect v2 for external EVM wallets
- `config.ts` — Vexanium network and endpoint configuration
- `App.*` or `app/page.tsx` — example UI and user actions

## Production dApp identity

A deployed dApp using Wisp Telegram should publish its Wisp wallet manifest at:

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

Use your real HTTPS origin and icon. The manifest should be publicly readable without cookies or authentication.

The Next.js example includes a manifest route at `/wisp-wallet-manifest.json`.

## Guides

- [VEX Native](docs/native.md)
- [VEX EVM](docs/evm.md)
- [Wisp Telegram](docs/telegram.md)
- [Wisp Android](docs/android.md)
- [Troubleshooting](docs/troubleshooting.md)

## License

[MIT](LICENSE)
