# Wisp Android

Open the dApp in Wisp Wallet's DApp Browser to use the canonical Wisp provider paths.

## VEX Native

Use `createWispConnector()` for restore/connect/disconnect rather than hardcoding Wisp RDNS or storing a second provider session ID. The connector discovers Wisp through the canonical public identity and keeps wallet session semantics in WindStack.

## VEX EVM

Use standard EIP-6963 discovery through `@windstack/evm` and compare provider metadata with `WISP_PROVIDER_RDNS` from `@windstack/wallet-plugin-wisp`. External EVM wallets continue to use the same generic EIP-1193 client path.

## Page lifecycle

- Restore before showing a new Native Connect action.
- Connect only from explicit user action.
- Keep transaction forms and DApp state local.
- Do not duplicate wallet session storage or Telegram handoff state.
- Do not send transactions automatically when the page opens.
