import type { VexaniumAccount } from "@windstack/vexanium";
import {
  createWispConnector,
  createWispTelegramTransport,
  type WispConnector,
  type WispConnectorSnapshot,
  type WispTelegramTransport,
} from "@windstack/wallet-plugin-wisp";

import { APP_NAME, type AppConfig } from "./config";import { APP_NAME, type AppConfig } from "./config";

export type NativeConnectionMethod = "Wisp Wallet" | "Wisp Telegram";

export type NativeConnection = {
  account: VexaniumAccount;
  chainId: string;
  method: NativeConnectionMethod;
};

export type NativeTransferInput = {
  recipient: string;
  amount: string;
  memo: string;
};

type NativeListener = (connection: NativeConnection | null, reason: string) => void;

export function createNativeWallet(config: AppConfig) {
  let connector: WispConnector | null = null;
  let telegramTransport: WispTelegramTransport | null = null;

  function getTelegramTransport() {
    if (telegramTransport) return telegramTransport;
    if (typeof window === "undefined" || window.location.protocol !== "https:") return null;

    telegramTransport = createWispTelegramTransport({
      apiUrl: config.wispApiUrl,
      ...(config.wispTelegramReturnUrl
        ? { telegramReturnUrl: config.wispTelegramReturnUrl }
        : {}),
      dapp: {
        name: APP_NAME,
        description: "Wisp Wallet dApp example",
        origin: window.location.origin,
        url: window.location.href,
      },
    });
    return telegramTransport;
  }

  function getConnector() {
    if (connector) return connector;
    if (typeof window === "undefined") throw new Error("Wisp connector requires a browser runtime.");

    const telegram = getTelegramTransport();
    connector = createWispConnector({
      appName: APP_NAME,
      discoveryTimeoutMs: 1_200,
      rpcUrl: config.nativeRpc,
      dapp: {
        name: APP_NAME,
        description: "Wisp Wallet dApp example",
        url: window.location.href,
      },
      ...(telegram ? { telegram } : {}),
    });
    return connector;
  }

  function connectionFromSnapshot(snapshot: WispConnectorSnapshot): NativeConnection | null {
    if (snapshot.status !== "connected" || !snapshot.account) return null;
    return {
      account: snapshot.account,
      chainId: String(snapshot.account.chainId),
      method: snapshot.transport === "telegram" ? "Wisp Telegram" : "Wisp Wallet",
    };
  }

  async function getAccount() {
    const current = getConnector();
    const snapshot = current.getSnapshot();
    if (snapshot.status !== "connected" || !snapshot.account) {
      throw new Error("Connect Wisp Native first.");
    }

    if (snapshot.transport === "telegram") {
      const account = (await getTelegramTransport()?.getAccounts())?.[0];
      if (!account) throw new Error("No Wisp Telegram account is connected.");
      return account;
    }

    const account = (await (await current.getProviderClient()).getAccounts())[0];
    if (!account) throw new Error("No Wisp Native account is connected.");
    return account;
  }

  async function getBalance(accountName?: string) {
    const account = accountName || (await getAccount()).actor;
    const actor = validateName(account, "Account");
    const response = await fetch(`${config.nativeRpc}/v1/chain/get_currency_balance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "vex.token", account: actor, symbol: "VEX" }),
    });
    if (!response.ok) throw new Error(`VEX Native RPC returned ${response.status}.`);
    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows) || rows.some((row) => typeof row !== "string")) {
      throw new Error("VEX Native RPC returned an invalid balance response.");
    }
    return (rows[0] as string | undefined) || "0.0000 VEX";
  }

  async function sendTransfer(input: NativeTransferInput) {
    const current = getConnector();
    const snapshot = current.getSnapshot();
    if (snapshot.status !== "connected" || !snapshot.account) {
      throw new Error("Connect Wisp Native first.");
    }

    const recipient = validateName(input.recipient, "Recipient");
    const memo = input.memo.trim();
    if (new TextEncoder().encode(memo).length > 256) {
      throw new Error("Memo must be at most 256 UTF-8 bytes.");
    }

    const actions = [
      {
        account: "vex.token",
        name: "transfer",
        data: {
          from: snapshot.account.actor,
          to: recipient,
          quantity: formatNativeAmount(input.amount),
          memo,
        },
      },
    ];

    const client = await current.getProviderClient();
    if (snapshot.transport === "telegram") {
      const telegram = getTelegramTransport();
      if (!telegram) throw new Error("Wisp Telegram is unavailable on this page.");
      return telegram.transact(client, { actions });
    }

    return client.transact({ actions, broadcast: true });
  }

  return {
    async restore(): Promise<NativeConnection | null> {
      return connectionFromSnapshot(await getConnector().restore());
    },

    subscribe(listener: NativeListener) {
      const current = getConnector();
      const notify = () => {
        const snapshot = current.getSnapshot();
        listener(connectionFromSnapshot(snapshot), snapshot.status);
      };
      notify();
      return current.subscribe(notify);
    },

    async connect(): Promise<NativeConnection> {
      const connection = connectionFromSnapshot(await getConnector().connect());
      if (!connection) throw new Error("Wisp Wallet connection did not return an account.");
      return connection;
    },

    async disconnect() {
      await getConnector().disconnect();
    },

    getAccount,
    getBalance,
    sendTransfer,
  };
}
function validateName(function validateName(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[a-z1-5.]{1,12}$/u.test(normalized)) {
    throw new Error(`${label} must be a valid VEX Native account name.`);
  }
  return normalized;
}

export function formatNativeAmount(value: string) {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/u.test(normalized)) {
    throw new Error("Native amount must be positive with at most 4 decimals.");
  }
  const [whole = "0", fraction = ""] = normalized.split(".");
  const units = BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, "0"));
  if (units <= 0n) throw new Error("Native amount must be greater than zero.");
  return `${whole}.${fraction.padEnd(4, "0")} VEX`;
}
