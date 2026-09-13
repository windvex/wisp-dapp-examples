# Troubleshooting

## Wisp Native is not found

If the page is not running inside Wisp Wallet, a Native provider may not be available directly in the page. Use an HTTPS deployment so the example can use Wisp Telegram instead.

## Wisp Telegram requires HTTPS

A local Vite URL normally uses HTTP. Use an HTTPS development tunnel or deploy the example to an HTTPS host before testing the Telegram path.

Keep the API URL at:

```text
https://api.windcrypto.com/wisp/v1
```

unless you intentionally use another compatible Wisp endpoint.

## A saved Telegram session will not connect

The example calls `restore()` when the page opens. Wisp checks whether the saved session still belongs to the same dApp, account, chain, and permission and whether it is still valid.

If the session was expired or revoked, the dApp returns to the disconnected state. Press Connect to start a new session.

If restore fails because of a temporary network problem, fix the connection and reload the page before starting another connection request.

## Connect opens while the page is loading

Do not call `connect()` from page startup. Startup should only call `restore()`. The Connect button should become available after restore has finished.

## WalletConnect says the project ID is missing

Create `.env` from `.env.example`, add `VITE_WALLETCONNECT_PROJECT_ID`, and restart Vite.

This setting is only required for the external VEX EVM WalletConnect path.

## WalletConnect cannot connect VEX Native

WalletConnect v2 in these examples is for VEX EVM. VEX Native uses WindStack with Wisp Wallet or the Wisp Telegram transport.

## Wrong EVM chain

Use **Switch/Add VEX EVM Network** after connecting the wallet.

VEX EVM uses:

```text
Chain ID: 6736
Hex:      0x1a50
RPC:      https://api.windcrypto.com/rpc
```

## `wallet_switchEthereumChain` returns 4902

The wallet does not have VEX EVM saved yet. Add the network with `wallet_addEthereumChain`, then switch again. The example does this from `ensureVexEvmNetwork()`.

## Balance request fails

Check:

- the configured RPC URL
- the connected Native account or EVM address
- the browser network panel
- whether the selected wallet is still connected

## The wallet rejected the request

Keep the form values and show the rejection to the user. Do not automatically open another approval request.

## Disconnect does not remove an injected EVM site's permission

The example's EVM Disconnect button clears local dApp state and listeners. An injected EVM wallet remains responsible for its own site permissions. WalletConnect sessions use WalletConnect's disconnect method.

## Build or type errors

Use Node.js 20.19 or newer, then install dependencies again:

```bash
rm -rf node_modules
npm install
npm run check
```

Do not commit `.env` if it contains your WalletConnect project ID or other local settings.
