# Nuxt Wisp dApp Example

Nuxt 4 example for connecting Wisp Wallet with WindStack 2.2 on VEX Native and VEX EVM.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Use Node.js 20.19 or newer.

Validate the example with:

```bash
npm run check
```

## Environment variables

```dotenv
NUXT_PUBLIC_VEX_NATIVE_RPC=https://api.windcrypto.com
NUXT_PUBLIC_VEX_EVM_RPC=https://api.windcrypto.com/rpc
NUXT_PUBLIC_WISP_API_URL=https://api.windcrypto.com/wisp/v1
NUXT_PUBLIC_WISP_TELEGRAM_RETURN_URL=
NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NUXT_PUBLIC_DAPP_URL=
```

`NUXT_PUBLIC_WISP_TELEGRAM_RETURN_URL` is optional and is only needed when the dApp itself is a Telegram Mini App that should return to a specific Mini App URL.

`NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is required only for the external VEX EVM WalletConnect path.

Set `NUXT_PUBLIC_DAPP_URL` to the deployed HTTPS origin when publishing the included wallet manifest route.

## Nuxt client boundary

Nuxt renders pages on the server, but wallet providers only exist in the browser. The example therefore creates the wallet adapters during setup but does provider detection, session restore, and event subscription from `onMounted()`.

Do not access injected wallet globals during server rendering and do not start a new wallet connection automatically during hydration.

## VEX Native

The Native adapter is in `app/lib/wispNative.ts`.

It uses:

- `createVexaniumClient()` for the injected Wisp provider
- `restoreVexaniumSession()` for an existing wallet-issued session
- `createWispTelegramTransport()` when the injected provider is not available on an HTTPS page
- `client.transact()` for structured VEX Native actions

Multiple actions belong in one `actions` array. WindStack keeps them in one transaction and one wallet signing flow.

## VEX EVM

The EVM adapter is in `app/lib/wispEvm.ts`.

It uses `@windstack/evm` for EIP-6963 discovery, EIP-1193 requests, account events, chain switching, and network registration. The Wisp provider is selected by its RDNS: `com.wisp.wallet`.

External EVM wallets can use WalletConnect v2 through `app/lib/walletConnect.ts`.

## Wisp manifest

The example publishes:

```text
/wisp-wallet-manifest.json
```

from `server/routes/wisp-wallet-manifest.json.ts`.

The route uses `NUXT_PUBLIC_DAPP_URL` when configured, otherwise it derives the current request origin. The icon is served from `/wisp-icon.svg`.

## Main files

```text
app/app.vue                         UI and user actions
app/lib/config.ts                  Vexanium and runtime configuration
app/lib/wispNative.ts              Native connect, restore, balance, and transactions
app/lib/wispEvm.ts                 EVM connect, network, balance, and transactions
app/lib/walletConnect.ts           WalletConnect v2
app/lib/environment.ts             browser environment detection
server/routes/wisp-wallet-manifest.json.ts
```
