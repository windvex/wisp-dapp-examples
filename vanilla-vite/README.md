# Wisp dApp Example — Vanilla TypeScript + Vite

A framework-free example for integrating Wisp Wallet with WindStack 2.2 on VEX Native and VEX EVM.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Run the local validation with:

```bash
npm run check
```

## What this example covers

- restore an existing VEX Native wallet session on page load
- connect Wisp Wallet on VEX Native from a user action
- read the connected Native account and VEX balance
- send a VEX Native transfer through WindStack
- connect Wisp on VEX EVM
- connect an external EVM wallet with WalletConnect v2
- switch or add the VEX EVM network
- read an EVM balance and send an EVM transaction
- use the Wisp Telegram transport from an HTTPS page when no embedded Wisp Native provider is available

## Main files

- `src/lib/wispNative.ts` — Native connect, restore, balance, disconnect, and transactions
- `src/lib/wispEvm.ts` — Wisp EVM discovery, network switching, balance, and transactions
- `src/lib/walletConnect.ts` — WalletConnect v2 for external EVM wallets
- `src/config.ts` — Vexanium network and endpoint configuration
- `src/main.ts` — DOM event handling and wallet actions
- `public/wisp-wallet-manifest.json` — static wallet manifest template for deployment

## Configuration

```dotenv
VITE_VEX_NATIVE_RPC=https://api.windcrypto.com
VITE_VEX_EVM_RPC=https://api.windcrypto.com/rpc
VITE_WISP_API_URL=https://api.windcrypto.com/wisp/v1
VITE_WISP_TELEGRAM_RETURN_URL=
VITE_WALLETCONNECT_PROJECT_ID=
```

`VITE_WISP_TELEGRAM_RETURN_URL` is optional. Set it only when the dApp itself is a Telegram Mini App and should return to a specific Telegram Mini App link after a Wisp request.

`VITE_WALLETCONNECT_PROJECT_ID` is only required for the external EVM WalletConnect path.

Before deploying, update `public/wisp-wallet-manifest.json` with the real HTTPS origin and icon URL for your dApp.

The example uses VEX mainnet. Transaction requests are only created after the user submits a transfer form and confirms the action.
