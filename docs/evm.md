# VEX EVM

VEX EVM uses standard Ethereum wallet interfaces. The examples use `@windstack/evm` for provider discovery, account access, network switching, and wallet requests.

## Install

```bash
npm install @windstack/evm@2.2.0 @windstack/vexanium@2.2.0 viem
```

## Network

| Setting | Value |
| --- | --- |
| Chain ID | `6736` |
| Chain ID hex | `0x1a50` |
| RPC | `https://api.windcrypto.com/rpc` |
| Currency | VEX, 18 decimals |

The example reads the VEX EVM metadata from `@windstack/vexanium` instead of duplicating it in application code.

## Find Wisp Wallet

Wisp announces its EVM provider with EIP-6963. Select the provider whose RDNS is `com.wisp.wallet`:

```ts
import { createEVMClient, discoverEVMProviders } from "@windstack/evm";

const providers = await discoverEVMProviders();
const wisp = providers.find(({ info }) => info.rdns === "com.wisp.wallet");

if (!wisp) throw new Error("Wisp Wallet was not found");

const evm = await createEVMClient({ provider: wisp.provider });
```

If your app supports more than one wallet, show the available wallets to the user instead of choosing one silently.

## Connect

```ts
const accounts = await evm.connect();
const address = accounts[0];
const chainId = await evm.getChainId();
```

Listen for wallet changes once and remove the listeners when the page is disposed:

```ts
const onAccountsChanged = (accounts: string[]) => {
  console.log(accounts);
};

const onChainChanged = (chainId: string) => {
  console.log(chainId);
};

evm.on("accountsChanged", onAccountsChanged);
evm.on("chainChanged", onChainChanged);

// later
evm.off("accountsChanged", onAccountsChanged);
evm.off("chainChanged", onChainChanged);
```

## Switch or add VEX EVM

```ts
try {
  await evm.switchChain("0x1a50");
} catch (error) {
  if ((error as { code?: number }).code !== 4902) throw error;

  await evm.addChain({
    chainId: "0x1a50",
    chainName: "VEX EVM",
    nativeCurrency: {
      name: "VEX",
      symbol: "VEX",
      decimals: 18,
    },
    rpcUrls: ["https://api.windcrypto.com/rpc"],
  });

  await evm.switchChain("0x1a50");
}
```

Do not switch networks automatically when the page loads. Let the user connect first.

## Read a balance

The examples use `viem` for read-only balance access:

```ts
const publicClient = createPublicClient({
  transport: http("https://api.windcrypto.com/rpc"),
});

const balance = await publicClient.getBalance({ address });
```

## Send a transaction

```ts
const hash = await evm.request<string>({
  method: "eth_sendTransaction",
  params: [
    {
      from: address,
      to: recipient,
      value: toHex(parseEther("0.001")),
    },
  ],
});
```

Validate the recipient, amount, active chain, and returned transaction hash before showing success.

## WalletConnect v2

For a browser without Wisp's injected EVM provider, create a WalletConnect v2 provider and pass it to the same WindStack client:

```ts
const evm = await createEVMClient({ provider: walletConnectProvider });
const accounts = await evm.connect();
```

`VITE_WALLETCONNECT_PROJECT_ID` is required for that path.

See `react-vite/src/lib/wispEvm.ts` or `vue-vite/src/lib/wispEvm.ts` for the complete example.
