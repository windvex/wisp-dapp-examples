# VEX EVM

VEX EVM uses standard Ethereum wallet interfaces. Wisp Android provides an EIP-1193 provider and announces it with EIP-6963. External sessions use WalletConnect v2.

## Network

| Setting | Value |
| --- | --- |
| Chain ID | `6736` |
| Chain ID hex | `0x1a50` |
| RPC | `https://api.windcrypto.com/rpc` |
| Currency | VEX, 18 decimals |
| Explorer | `https://explorer.windcrypto.com/evm` |

## Discover Wisp

Listen for `eip6963:announceProvider`, dispatch `eip6963:requestProvider`, and match `detail.info.rdns === "com.wisp.wallet"`. Remove the listener after the discovery window.

The example only falls back to `window.ethereum` when it has Wisp's marker. It never silently chooses an unrelated injected wallet. If multiple Wisp providers are announced, a production app should ask the user which provider to use.

## Connect and observe

```ts
const accounts = await provider.request({ method: "eth_requestAccounts" });
const chainId = await provider.request({ method: "eth_chainId" });

provider.on?.("accountsChanged", handleAccountsChanged);
provider.on?.("chainChanged", handleChainChanged);
provider.on?.("disconnect", handleDisconnect);
```

Remove those listeners when the component is disposed.

## Switch or add the network

First call `wallet_switchEthereumChain` with `0x1a50`. If the provider returns error code `4902`, call `wallet_addEthereumChain` with the network values above and then switch again.

Do not call network switching automatically when the page loads. Connect first and make the user's action clear.

## Balance and transfer

The example uses `viem` only for typed address/amount validation and read-only RPC calls:

```ts
const client = createPublicClient({
  transport: http("https://api.windcrypto.com/rpc"),
});

const balance = await client.getBalance({ address });
```

Sending remains a visible EIP-1193 call:

```ts
const hash = await provider.request({
  method: "eth_sendTransaction",
  params: [{ from, to, value: toHex(parseEther(amount)) }],
});
```

Validate `to` with `isAddress`, require a positive value, ensure chain `0x1a50`, and validate the returned transaction hash.

## Disconnect behavior

WalletConnect has a real session disconnect method. A normal injected EIP-1193 provider does not have one standard permission-revocation method. The example's injected Disconnect button removes listeners and clears local dApp state; the wallet remains responsible for stored permissions.
