# Wisp Telegram native handoff

A website opened inside the Telegram browser is not the Wisp Android DApp Browser. Do not assume it has `window.vexanium`.

For VEX Native, the current portable flow is:

```text
HTTPS dApp
  -> prepare one connect or signing handoff
  -> open the returned Wisp Telegram launch URL
  -> user approves or rejects in Wisp Telegram
  -> wallet signs and broadcasts an approved VSR
  -> dApp polls the same request ID and receives the result
```

## Public endpoints

Default base URL:

```text
https://api.windcrypto.com/wisp/v1
```

- `POST /telegram/dapp/prepare`
- `GET /telegram/dapp/status?id=<handoff-id>`

These dApp endpoints do not need a private server secret. The dApp sends public metadata, the canonical chain ID, and either an empty connect request or an encoded VSR.

## Connect request

Prepare with:

```ts
{
  kind: "connect",
  request: "",
  chainId: vexNative.chainId,
  name: "My dApp",
  description: "My first VEX dApp",
  origin: window.location.origin,
  url: window.location.href
}
```

After approval, validate the returned actor and permission. The example stores only that public account identity with a short expiry; it stores no signing key.

## Signing request

Build the same encoded VSR used for an injected provider, then prepare:

```ts
{
  kind: "sign",
  request: encodedVsr,
  chainId: vexNative.chainId,
  expectedAccount: account.actor,
  expectedPermission: account.permission,
  name,
  description,
  origin,
  url
}
```

On completion, verify that the signer matches the expected permission and that `transactionId` is a 64-character hexadecimal ID.

## Lifecycle rules

- Serve the dApp over HTTPS. The adapter rejects insecure origins.
- Open only the `launchUrl` returned by the server. Do not invent bot parameters.
- Create exactly one handoff for one user action.
- Keep polling the same ID after returning to the dApp.
- Android can pause network requests while Telegram is in front. A temporary fetch/5xx error is retried against the same ID, not replaced with a duplicate handoff.
- Stop on approved, rejected, failed, aborted, or expired.
- Never broadcast the same VSR from the dApp after Wisp Telegram has already broadcast it.

VEX EVM is separate: use WalletConnect v2, not the Native VSR endpoint and not a fake Native `eip155` namespace.
