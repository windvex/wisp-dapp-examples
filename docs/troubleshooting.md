# Troubleshooting

## “Wisp Native provider was not found”

The page is not inside the Wisp Android DApp Browser, or provider discovery timed out. On an external browser, deploy to HTTPS and use the Wisp Telegram handoff.

## “Telegram native handoff requires an HTTPS page”

Vite's default local URL is HTTP. Use an HTTPS development tunnel or deploy the built site. Keep the configured Wisp API at `https://api.windcrypto.com/wisp/v1`.

## Telegram opened but the page briefly loses network

Android may suspend the browser while Telegram is in front. Resume polling the same handoff ID. Do not prepare a second request.

## Telegram request expired

Start a new request only after the old request is confirmed expired. Ask the user to approve or reject before the expiry time.

## WalletConnect says the project ID is missing

Create `.env` from `.env.example`, add `VITE_WALLETCONNECT_PROJECT_ID`, and restart Vite. This setting is only required for the external EVM WalletConnect v2 path.

## WalletConnect cannot pair with VEX Native

That is expected. WalletConnect v2 is used for VEX EVM. VEX Native uses VexaniumProvider v1 or the Wisp Telegram VSR handoff.

## Wrong EVM chain

Press **Switch/Add VEX EVM Network**. The expected chain is `6736` (`0x1a50`) and the RPC is `https://api.windcrypto.com/rpc`.

## `wallet_switchEthereumChain` returns 4902

The wallet does not know VEX EVM yet. Call `wallet_addEthereumChain` with the values in [evm.md](evm.md), then switch again. Other error codes should be displayed to the user rather than treated as “network missing.”

## Balance request fails

Check the configured RPC, browser network panel, and account/address format. Native balance uses `/v1/chain/get_currency_balance`; EVM balance uses `eth_getBalance` through the EVM RPC.

## The wallet rejected the request

This is a normal outcome, not an RPC failure. Keep the form intact, show a clean rejection message, and do not automatically open another approval.

## Disconnect does not revoke an injected EVM permission

EIP-1193 has no universal injected-wallet disconnect method. The example clears its own account state and listeners. Revoke the site's permission from the wallet when needed.

## Build or type errors

Use Node.js 22 or newer, then reinstall and check:

```bash
rm -rf node_modules
npm install
npm run check
```

Do not delete `.env` if it contains your local WalletConnect project ID, and never commit that file.
