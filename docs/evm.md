# VEX EVM

VEX EVM uses standard Ethereum wallet interfaces. `@windstack/evm` owns EIP-1193/EIP-6963 behavior; `@windstack/wallet-plugin-wisp` only supplies canonical Wisp identity.

## Find Wisp Wallet

```ts
import { createEVMClient, discoverEVMProviders } from "@windstack/evm";
import { WISP_PROVIDER_RDNS } from "@windstack/wallet-plugin-wisp";

const providers = await discoverEVMProviders();
const wisp = providers.find(({ info }) => info.rdns === WISP_PROVIDER_RDNS);
if (!wisp) throw new Error("Wisp Wallet was not found");

const evm = await createEVMClient({ provider: wisp.provider });
```

External EVM wallets use their own EIP-1193 provider, including WalletConnect v2. The same `createEVMClient()` path is used; no Wisp-specific EVM behavior is required in `@windstack/evm`.

VEX EVM chain metadata comes from `vexEvm` in `@windstack/vexanium`: chain ID `6736` (`0x1a50`). Network switching, balance reads, transaction forms, and UI lifecycle remain DApp-owned.
