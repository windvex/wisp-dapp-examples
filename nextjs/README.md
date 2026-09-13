# Next.js Example

Next.js App Router example for Wisp Wallet and WindStack 2.2.

It includes the same wallet flows as the React and Vue examples:

- VEX Native connect and session restore
- VEX Native balance and transfer
- Wisp Telegram fallback on HTTPS pages
- VEX EVM connect and network switching
- WalletConnect v2 for external EVM wallets
- VEX EVM balance and transfer

## Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local address printed by Next.js.

Run the local checks with:

```bash
npm run check
```

## Environment

```dotenv
NEXT_PUBLIC_VEX_NATIVE_RPC=https://api.windcrypto.com
NEXT_PUBLIC_VEX_EVM_RPC=https://api.windcrypto.com/rpc
NEXT_PUBLIC_WISP_API_URL=https://api.windcrypto.com/wisp/v1
NEXT_PUBLIC_WISP_TELEGRAM_RETURN_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_DAPP_URL=
```

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is only needed for WalletConnect v2.

Set `NEXT_PUBLIC_WISP_TELEGRAM_RETURN_URL` only when this dApp is a Telegram Mini App and should return to a specific `https://t.me/...` link.

For a deployed site, set `NEXT_PUBLIC_DAPP_URL` to the public HTTPS origin, for example:

```dotenv
NEXT_PUBLIC_DAPP_URL=https://app.example.com
```

The example serves its Wisp manifest at:

```text
/wisp-wallet-manifest.json
```

The manifest uses `NEXT_PUBLIC_DAPP_URL` when set and otherwise uses the request origin.

## Files

- `app/page.tsx` — wallet UI and user actions
- `app/wisp-wallet-manifest.json/route.ts` — public Wisp manifest
- `lib/wispNative.ts` — Native connect, restore, balance, disconnect, and transactions
- `lib/wispEvm.ts` — Wisp EVM discovery, network switching, balance, and transactions
- `lib/walletConnect.ts` — WalletConnect v2 for external EVM wallets
- `lib/config.ts` — Vexanium network and endpoint configuration

Wallet access runs from the client component. The manifest route runs on the Next.js server and does not contain wallet state or private data.
