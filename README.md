# Wisp dApp Examples

Beginner-friendly React and Vue examples for connecting a dApp to Wisp Wallet on VEX Native and VEX EVM.

Both examples use TypeScript and have the same UI and wallet features. They use the current Wisp production transports: VexaniumProvider v1, the portable Wisp Telegram handoff, standard EIP-1193, and WalletConnect v2.

> These examples use VEX mainnet. They never send a transaction automatically. A transfer only starts after the user fills the form, presses **Send**, confirms the browser prompt, and approves in the wallet.

## Quick Start

### React

```bash
git clone https://github.com/windvex/wisp-dapp-examples.git
cd wisp-dapp-examples/react-vite
npm install
cp .env.example .env
npm run dev
```

### Vue

```bash
git clone https://github.com/windvex/wisp-dapp-examples.git
cd wisp-dapp-examples/vue-vite
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite. To test the Telegram native handoff, serve the page from HTTPS with a development tunnel or deploy it to an HTTPS host. Telegram cannot safely return to a plain HTTP page.

Run all checks inside either example:

```bash
npm run check
```

## Connection matrix

| Environment | VEX Native | VEX EVM |
| --- | --- | --- |
| Wisp Android DApp Browser | VexaniumProvider v1 (`window.vexanium`) | Wisp EIP-1193 / EIP-6963 |
| External mobile browser | Portable Wisp Telegram VSR handoff over HTTPS | WalletConnect v2 |
| Website opened from Telegram | Portable Wisp Telegram VSR handoff over HTTPS | WalletConnect v2 |
| Desktop browser | Injected Wisp-compatible native provider when available; otherwise portable handoff | Injected Wisp EIP-1193 when available, or WalletConnect v2 |

The two chains use different transports:

- VEX Native actions use VexaniumProvider v1 or a VSR request sent through the Wisp Telegram handoff.
- VEX EVM actions use standard EIP-1193 or WalletConnect v2.
- VEX Native is **not** mapped into a fake `eip155` namespace.
- ScatterJS and WalletConnect v1 are not used.

## Configuration

Copy `.env.example` to `.env` in the framework folder.

```dotenv
VITE_VEX_NATIVE_RPC=https://api.windcrypto.com
VITE_VEX_EVM_RPC=https://api.windcrypto.com/rpc
VITE_VEX_EVM_CHAIN_ID=6736
VITE_WISP_API_URL=https://api.windcrypto.com/wisp/v1
VITE_WALLETCONNECT_PROJECT_ID=
```

The official Wind endpoints are the defaults. A WalletConnect project ID is only required for the external EVM WalletConnect path. Create one in the WalletConnect/Reown dashboard; never commit a secret or private key.

## Important files

The React and Vue folders intentionally use the same small wallet modules:

- `src/lib/wispNative.ts` — native discovery, account, balance, VSR creation, and transfer.
- `src/lib/wispEvm.ts` — EIP-6963 discovery and visible EIP-1193 calls.
- `src/lib/wispTelegram.ts` — portable native connect/sign handoff and result polling.
- `src/lib/walletConnect.ts` — WalletConnect v2 EIP-1193 provider.
- `src/config.ts` — official endpoints and chain configuration.

## Connect Wisp Native

The client prefers Wisp deterministically by RDNS. It does not choose a random compatible wallet.

```ts
import { createVexaniumClient, vexNative } from "@windstack/vexanium";

const client = await createVexaniumClient({
  providerRdns: "com.wisp.wallet",
  discoveryTimeoutMs: 1_200,
  autoSync: true,
  dapp: {
    name: "My dApp",
    description: "My first VEX dApp",
    url: window.location.href,
  },
});

const accounts = await client.connect({
  chainId: vexNative.chainId,
  requiredCapabilities: [
    "vex.accounts",
    "vex.sessions",
    "vex.signingRequest",
  ],
});
```

The complete example automatically uses the portable Telegram path when the injected provider is unavailable and the page is served over HTTPS.

## Show the connected Native account

```ts
const accounts = await client.getAccounts();
const account = accounts[0];

console.log(account.actor);           // example: alice
console.log(account.permission);      // example: active
console.log(account.permissionLevel); // example: alice@active
```

Subscribe once so account, network, and disconnect changes update the UI:

```ts
const unsubscribe = client.subscribeSession(({ accounts, reason }) => {
  console.log(reason, accounts[0] ?? null);
});

// Call when the page/component is disposed.
unsubscribe();
```

## Read VEX Native balance

```ts
const response = await fetch(
  "https://api.windcrypto.com/v1/chain/get_currency_balance",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: "vex.token",
      account: account.actor,
      symbol: "VEX",
    }),
  },
);

const [balance = "0.0000 VEX"] = (await response.json()) as string[];
```

Always check `response.ok` and validate the response before showing it. The working modules do both.

## Send a VEX Native transaction

```ts
import { ABICache } from "@wharfkit/abicache";
import { APIClient } from "@wharfkit/antelope";
import { createSigningRequest, vexNative } from "@windstack/vexanium";

const api = new APIClient({ url: "https://api.windcrypto.com" });
const abiProvider = new ABICache(api);

const request = await createSigningRequest(
  {
    chainId: vexNative.chainId,
    broadcast: true,
    actions: [
      {
        account: "vex.token",
        name: "transfer",
        authorization: [
          { actor: account.actor, permission: account.permission },
        ],
        data: {
          from: account.actor,
          to: "recipient",
          quantity: "0.0001 VEX",
          memo: "Hello from my dApp",
        },
      },
    ],
  },
  { abiProvider, compress: true },
);

const result = await client.signSigningRequest({
  request,
  broadcast: true,
});

console.log(result.transactionId);
```

VEX uses 4 decimals. Validate the account name, positive amount, and memo length before creating the request, as shown in `wispNative.ts`.

## Call your own VEX Native smart contract

Replace only `account`, `name`, and `data`. Authorization still comes from the connected wallet account.

```ts
const action = {
  account: "yourcontract",
  name: "youraction",
  authorization: [
    { actor: account.actor, permission: account.permission },
  ],
  data: {
    owner: account.actor,
    your_field: "your value",
  },
};
```

The ABI cache fetches the contract ABI from the configured VEX Native RPC when the VSR is encoded.

## Connect VEX EVM

Wisp Android announces its provider with EIP-6963. After selecting the provider whose RDNS is `com.wisp.wallet`, connection uses standard EIP-1193:

```ts
const accounts = await provider.request({
  method: "eth_requestAccounts",
}) as string[];

const address = accounts[0];
const chainId = await provider.request({ method: "eth_chainId" });
```

Listen for `accountsChanged`, `chainChanged`, and `disconnect`. See `src/lib/wispEvm.ts` for the complete discovery and cleanup code.

## Switch to VEX EVM

```ts
const network = {
  chainId: "0x1a50",
  chainName: "VEX EVM",
  nativeCurrency: { name: "VEX", symbol: "VEX", decimals: 18 },
  rpcUrls: ["https://api.windcrypto.com/rpc"],
  blockExplorerUrls: ["https://explorer.windcrypto.com/evm"],
};

try {
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: network.chainId }],
  });
} catch (error) {
  if ((error as { code?: number }).code !== 4902) throw error;
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [network],
  });
}
```

VEX EVM chain ID is `6736` (`0x1a50`).

## Send an EVM transaction

```ts
import { parseEther, toHex } from "viem";

const hash = await provider.request({
  method: "eth_sendTransaction",
  params: [
    {
      from: address,
      to: "0xRecipientAddress",
      value: toHex(parseEther("0.000001")),
    },
  ],
});
```

Validate the recipient with `isAddress`, require a positive amount, switch to VEX EVM first, and let the wallet show its approval screen.

## Support Wisp Telegram

Do not assume `window.vexanium` exists in a normal website opened from Telegram. Native approval is a portable handoff:

```text
dApp HTTPS page
  -> POST /telegram/dapp/prepare with a connect request or encoded VSR
  -> open the returned launchUrl
  -> Wisp Telegram approval and broadcast
  -> GET /telegram/dapp/status?id=...
  -> transaction ID returned to the dApp
```

Minimal connect preparation:

```ts
const prepared = await fetch(
  "https://api.windcrypto.com/wisp/v1/telegram/dapp/prepare",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "connect",
      request: "",
      chainId: vexNative.chainId,
      name: "My dApp",
      description: "My first VEX dApp",
      origin: window.location.origin,
      url: window.location.href,
    }),
  },
).then((response) => response.json());

window.open(prepared.launchUrl, "_blank");
```

For signing, pass the encoded VSR as `request` with `kind: "sign"`, `expectedAccount`, and `expectedPermission`. Poll the same handoff ID until it is approved, rejected, failed, or expired. Never create another request just because Android temporarily suspended a fetch. The working implementation is in `src/lib/wispTelegram.ts`.

## Use WalletConnect v2

Set `VITE_WALLETCONNECT_PROJECT_ID`, then initialize the v2 EIP-1193 provider:

```ts
import EthereumProvider from "@walletconnect/ethereum-provider";

const provider = await EthereumProvider.init({
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [6736],
  methods: [
    "personal_sign",
    "eth_signTypedData",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
    "eth_sendTransaction",
  ],
  events: ["accountsChanged", "chainChanged"],
  rpcMap: { 6736: "https://api.windcrypto.com/rpc" },
  showQrModal: true,
});

await provider.connect();
const accounts = await provider.request({ method: "eth_requestAccounts" });
```

After connection, reuse the same EIP-1193 EVM functions. WalletConnect v2 here is for EVM; Native VEX continues to use VexaniumProvider or the VSR handoff.

## More guides

- [VEX Native](docs/native.md)
- [VEX EVM](docs/evm.md)
- [Wisp Telegram](docs/telegram.md)
- [Wisp Android](docs/android.md)
- [Troubleshooting](docs/troubleshooting.md)

## Security notes

- Never place private keys, wallet passwords, relay secrets, or production credentials in a dApp.
- Treat wallet account and chain events as untrusted input and validate them.
- Keep transactions user-triggered and show the recipient and amount before requesting approval.
- Use HTTPS for deployed dApps and Telegram handoffs.
- A programmatic “disconnect” for an injected EIP-1193 provider clears dApp state and listeners; only the wallet controls its permission store.

## License

[MIT](LICENSE)
