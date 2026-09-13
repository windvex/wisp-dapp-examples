# Wisp dApp Examples

Starter projects for building Vexanium dApps with Wisp Wallet and WindStack 2.2.

Each example demonstrates the same wallet flows:

- connect Wisp Wallet on VEX Native
- restore an existing VEX Native session on page load
- read the connected account and VEX balance
- send VEX Native transactions with `@windstack/vexanium`
- connect Wisp on VEX EVM
- connect external EVM wallets with WalletConnect v2
- switch or add the VEX EVM network
- read EVM balances and send EVM transactions
- use Wisp Telegram from a normal HTTPS website when an embedded Wisp provider is unavailable

These examples use VEX mainnet. Transactions are only requested after a user action and still require wallet approval.

## Examples

| Folder | Stack |
| --- | --- |
| `react-vite` | React 19, Vite, TypeScript |
| `nextjs` | Next.js 16, React 19, App Router, TypeScript |
| `vue-vite` | Vue 3, Vite, TypeScript |
| `nuxt` | Nuxt 4, Vue 3, TypeScript |
| `sveltekit` | SvelteKit 2, Svelte 5, TypeScript |
| `vanilla-vite` | Vanilla TypeScript, Vite |

## Quick start

Choose one example:

```bash
git clone https://github.com/windvex/wisp-dapp-examples.git
cd wisp-dapp-examples/react-vite
npm install
cp .env.example .env
npm run dev
```

Use Node.js 20.19 or newer.

Run the checks inside any example folder with:

```bash
npm run check
```

## WindStack packages

All examples use the public WindStack 2.2 packages directly:

```bash
npm install @windstack/vexanium@2.2.0 @windstack/wallet-plugin-wisp@2.2.0 @windstack/evm@2.2.0
```

VEX Native transaction construction, ABI loading, authorization, signing requests, and wallet signing are handled by WindStack. Application code passes structured actions directly to the SDK.

## Configuration

React, Vue, and Vanilla TypeScript use Vite variables:

```dotenv
VITE_VEX_NATIVE_RPC=https://api.windcrypto.com
VITE_VEX_EVM_RPC=https://api.windcrypto.com/rpc
VITE_WISP_API_URL=https://api.windcrypto.com/wisp/v1
VITE_WISP_TELEGRAM_RETURN_URL=
VITE_WALLETCONNECT_PROJECT_ID=
```

Next.js uses `NEXT_PUBLIC_` variables:

```dotenv
NEXT_PUBLIC_VEX_NATIVE_RPC=https://api.windcrypto.com
NEXT_PUBLIC_VEX_EVM_RPC=https://api.windcrypto.com/rpc
NEXT_PUBLIC_WISP_API_URL=https://api.windcrypto.com/wisp/v1
NEXT_PUBLIC_WISP_TELEGRAM_RETURN_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_DAPP_URL=
```

Nuxt uses public runtime configuration:

```dotenv
NUXT_PUBLIC_VEX_NATIVE_RPC=https://api.windcrypto.com
NUXT_PUBLIC_VEX_EVM_RPC=https://api.windcrypto.com/rpc
NUXT_PUBLIC_WISP_API_URL=https://api.windcrypto.com/wisp/v1
NUXT_PUBLIC_WISP_TELEGRAM_RETURN_URL=
NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NUXT_PUBLIC_DAPP_URL=
```

SvelteKit uses public variables:

```dotenv
PUBLIC_VEX_NATIVE_RPC=https://api.windcrypto.com
PUBLIC_VEX_EVM_RPC=https://api.windcrypto.com/rpc
PUBLIC_WISP_API_URL=https://api.windcrypto.com/wisp/v1
PUBLIC_WISP_TELEGRAM_RETURN_URL=
PUBLIC_WALLETCONNECT_PROJECT_ID=
PUBLIC_DAPP_URL=
```

The Telegram return URL is optional. Set it only when the dApp itself is a Telegram Mini App and should return to a specific `https://t.me/...` Mini App link after Wisp finishes a request.

The WalletConnect project ID is only required for the external VEX EVM WalletConnect path.

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

Connect from a user action:

```ts
const account = await vex.connectOne();
```

Send structured actions:

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
```

For a multi-action transaction, keep every action in the same `actions` array:

```ts
await vex.transact({
  actions: [firstAction, secondAction, thirdAction],
});
```

WindStack keeps the actions in one transaction and sends one wallet request.

## Restore a Native session

A reload should try to restore the existing wallet session before showing a new Connect request.

```ts
import { restoreVexaniumSession, vexNative } from "@windstack/vexanium";

const restored = await restoreVexaniumSession(vex, {
  sessionId: savedSessionId,
  chainId: vexNative.chainId,
});
```

Store only the wallet-issued session ID. If the wallet reports an expired or revoked session, return to a disconnected state. Do not automatically start a new interactive connection during page startup.

## Wisp Telegram

A normal HTTPS dApp can use the WindStack Wisp Telegram transport when the Wisp Native provider is not embedded in the page.

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

Restore first during startup:

```ts
const restored = await wisp.restore();
```

Only start a new connection after a user action:

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

The transport handles the request lifecycle, persistent session, return flow, and result delivery.

## VEX EVM

VEX EVM uses standard Ethereum wallet interfaces. The examples use `@windstack/evm` for provider discovery and requests.

```ts
import { createEVMClient, discoverEVMProviders } from "@windstack/evm";

const providers = await discoverEVMProviders();
const wisp = providers.find(({ info }) => info.rdns === "com.wisp.wallet");

if (!wisp) throw new Error("Wisp Wallet was not found");

const evm = await createEVMClient({ provider: wisp.provider });
const accounts = await evm.connect();
const chainId = await evm.getChainId();
```

External EVM wallets use WalletConnect v2 and pass the resulting EIP-1193 provider to the same WindStack EVM client.

## Project files

React, Vue, SvelteKit, and Vanilla TypeScript keep wallet modules under `src/lib`. Next.js uses `lib`, while Nuxt uses `app/lib`.

- `wispNative.ts` — Native connect, restore, balance, disconnect, and transactions
- `wispEvm.ts` — Wisp EVM discovery, network switching, balance, events, and transactions
- `walletConnect.ts` — WalletConnect v2 for external EVM wallets
- `config.ts` — Vexanium network and endpoint configuration
- framework page or app files — example UI and user actions

## Wisp wallet manifest

A deployed dApp using Wisp Telegram should publish:

```text
https://your-dapp.example/wisp-wallet-manifest.json
```

Example:

```json
{
  "url": "https://your-dapp.example",
  "name": "My dApp",
  "iconUrl": "https://your-dapp.example/wisp-icon.svg"
}
```

Use the real HTTPS origin and icon URL for the deployed dApp. The manifest should be publicly readable without cookies or authentication.

Next.js, Nuxt, and SvelteKit expose the manifest through framework routes. React Vite, Vue Vite, and Vanilla Vite include static templates under `public/`; replace the placeholder origin before deployment.

## Guides

- [VEX Native](docs/native.md)
- [VEX EVM](docs/evm.md)
- [Wisp Telegram](docs/telegram.md)
- [Wisp Android](docs/android.md)
- [Troubleshooting](docs/troubleshooting.md)

## License

[MIT](LICENSE)
