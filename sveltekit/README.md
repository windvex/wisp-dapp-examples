# Wisp dApp Example — SvelteKit

SvelteKit example for integrating Wisp Wallet with WindStack 2.2 on VEX Native and VEX EVM.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Use Node.js 20.19 or newer.

## Validate

```bash
npm run check
```

The check command runs Svelte type diagnostics and a production SvelteKit build.

## Environment variables

```dotenv
PUBLIC_VEX_NATIVE_RPC=https://api.windcrypto.com
PUBLIC_VEX_EVM_RPC=https://api.windcrypto.com/rpc
PUBLIC_WISP_API_URL=https://api.windcrypto.com/wisp/v1
PUBLIC_WISP_TELEGRAM_RETURN_URL=
PUBLIC_WALLETCONNECT_PROJECT_ID=
PUBLIC_DAPP_URL=
```

`PUBLIC_WISP_TELEGRAM_RETURN_URL` is optional. Use it when the dApp itself is a Telegram Mini App and should return to a specific Telegram Mini App link after Wisp finishes a request.

`PUBLIC_WALLETCONNECT_PROJECT_ID` is only required for external EVM wallets through WalletConnect v2.

Set `PUBLIC_DAPP_URL` to the deployed HTTPS origin when publishing the included Wisp manifest route.

## Main files

- `src/lib/wispNative.ts` — VEX Native connect, restore, account, balance, disconnect, and transactions
- `src/lib/wispEvm.ts` — Wisp EVM discovery, network switching, balance, events, and transactions
- `src/lib/walletConnect.ts` — external EVM wallets through WalletConnect v2
- `src/lib/config.ts` — Vexanium network and endpoint configuration
- `src/routes/+page.svelte` — example UI and user actions
- `src/routes/wisp-wallet-manifest.json/+server.ts` — Wisp dApp manifest

The browser-only wallet lifecycle starts after hydration. An existing Native session is restored before a new connection is requested, and a new Connect request only starts from a user action.
