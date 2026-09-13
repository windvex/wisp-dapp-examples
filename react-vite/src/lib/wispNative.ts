import {
  createVexaniumClient,
  restoreVexaniumSession,
  vexNative,
  type VexaniumAccount,
  type VexaniumClient,
} from "@windstack/vexanium";
import {
  createWispTelegramTransport,
  type WispTelegramTransport,
} from "@windstack/wallet-plugin-wisp";

import {
  APP_NAME,
  VEX_NATIVE_RPC,
  WISP_API_URL,
  WISP_TELEGRAM_RETURN_URL,
} from "../config";

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

const PROVIDER_SESSION_KEY = "wisp-dapp-example:native-session:v2";
const listeners = new Set<NativeListener>();

let clientPromise: Promise<VexaniumClient> | null = null;
let telegramTransport: WispTelegramTransport | null = null;
let activeConnection: NativeConnection | null = null;
let restorePromise: Promise<NativeConnection | null> | null = null;

function emit(reason: string) {
  for (const listener of listeners) listener(activeConnection, reason);
}

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function storage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function loadProviderSessionId() {
  const value = storage()?.getItem(PROVIDER_SESSION_KEY)?.trim() || "";
  if (!value || value.length > 512 || /[\u0000-\u001f\u007f]/u.test(value)) return "";
  return value;
}

function saveProviderSessionId(value: string) {
  if (value) storage()?.setItem(PROVIDER_SESSION_KEY, value);
}

function clearProviderSessionId() {
  storage()?.removeItem(PROVIDER_SESSION_KEY);
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = createVexaniumClient({
      providerRdns: "com.wisp.wallet",
      discoveryTimeoutMs: 1_200,
      autoSync: true,
      rpcUrl: VEX_NATIVE_RPC,
      dapp: {
        name: APP_NAME,
        description: "Wisp Wallet dApp example",
        url: window.location.href,
      },
    }).then((client) => {
      client.subscribeSession(({ accounts, reason }) => {
        const session = client.getSession();
        if (session?.walletSessionId) saveProviderSessionId(session.walletSessionId);
        if (accounts[0]) {
          activeConnection = {
            account: accounts[0],
            chainId: String(accounts[0].chainId),
            method: "Wisp Wallet",
          };
        } else if (activeConnection?.method === "Wisp Wallet") {
          activeConnection = null;
          clearProviderSessionId();
        }
        emit(reason);
      });
      return client;
    });
  }
  return clientPromise;
}

function getTelegramTransport() {
  if (telegramTransport) return telegramTransport;
  if (typeof window === "undefined" || window.location.protocol !== "https:") return null;

  telegramTransport = createWispTelegramTransport({
    apiUrl: WISP_API_URL,
    ...(WISP_TELEGRAM_RETURN_URL ? { telegramReturnUrl: WISP_TELEGRAM_RETURN_URL } : {}),
    dapp: {
      name: APP_NAME,
      description: "Wisp Wallet dApp example",
      origin: window.location.origin,
      url: window.location.href,
    },
  });
  return telegramTransport;
}

function connectionFromAccount(
  account: VexaniumAccount,
  method: NativeConnectionMethod,
): NativeConnection {
  return {
    account,
    chainId: String(account.chainId),
    method,
  };
}

async function restoreNativeSession(): Promise<NativeConnection | null> {
  const client = await getClient();

  if (client.isAvailable()) {
    const sessionId = loadProviderSessionId();
    if (!sessionId) return null;
    try {
      const restored = await restoreVexaniumSession(client, {
        sessionId,
        chainId: vexNative.chainId,
      });
      const account = restored.accounts[0];
      if (!account) return null;
      activeConnection = connectionFromAccount(account, "Wisp Wallet");
      emit("restore");
      return activeConnection;
    } catch {
      clearProviderSessionId();
      activeConnection = null;
      emit("restore");
      return null;
    }
  }

  const telegram = getTelegramTransport();
  if (!telegram) return null;
  const restored = await telegram.restore();
  if (!restored) return null;
  activeConnection = connectionFromAccount(restored.account, "Wisp Telegram");
  emit("restore");
  return activeConnection;
}

export function restoreNative() {
  if (activeConnection) return Promise.resolve(activeConnection);
  if (!restorePromise) {
    restorePromise = restoreNativeSession().finally(() => {
      restorePromise = null;
    });
  }
  return restorePromise;
}

export function subscribeNative(listener: NativeListener) {
  listeners.add(listener);
  listener(activeConnection, "current");
  return () => listeners.delete(listener);
}

export async function connectNative(): Promise<NativeConnection> {
  if (activeConnection) return activeConnection;

  const client = await getClient();
  try {
    if (client.isAvailable()) {
      const account = await client.connectOne({ chainId: vexNative.chainId });
      const sessionId = client.getSession()?.walletSessionId || "";
      if (sessionId) saveProviderSessionId(sessionId);
      activeConnection = connectionFromAccount(account, "Wisp Wallet");
      emit("connect");
      return activeConnection;
    }

    const telegram = getTelegramTransport();
    if (!telegram) {
      throw new Error("Open this page in Wisp Wallet or use an HTTPS page for Wisp Telegram.");
    }
    const session = await telegram.connect();
    activeConnection = connectionFromAccount(session.account, "Wisp Telegram");
    emit("connect");
    return activeConnection;
  } catch (error) {
    throw new Error(message(error, "Wisp Wallet connection failed."));
  }
}

export async function disconnectNative() {
  if (!activeConnection) return;

  if (activeConnection.method === "Wisp Telegram") {
    await getTelegramTransport()?.disconnect();
  } else {
    const client = await getClient();
    if (client.getSession()) await client.disconnect();
    clearProviderSessionId();
  }

  activeConnection = null;
  emit("disconnect");
}

export async function getNativeAccount() {
  if (!activeConnection) throw new Error("Connect Wisp Native first.");

  if (activeConnection.method === "Wisp Telegram") {
    const account = (await getTelegramTransport()?.getAccounts())?.[0];
    if (!account) throw new Error("No Wisp Telegram account is connected.");
    activeConnection = connectionFromAccount(account, "Wisp Telegram");
    return account;
  }

  const account = (await (await getClient()).getAccounts())[0];
  if (!account) throw new Error("No Wisp Native account is connected.");
  activeConnection = connectionFromAccount(account, "Wisp Wallet");
  return account;
}

function validateName(value: string, label: string) {
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
  const [whole, fraction = ""] = normalized.split(".");
  const units = BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, "0"));
  if (units <= 0n) throw new Error("Native amount must be greater than zero.");
  return `${whole}.${fraction.padEnd(4, "0")} VEX`;
}

export async function getNativeBalance(accountName?: string) {
  const account = accountName || (await getNativeAccount()).actor;
  const actor = validateName(account, "Account");
  const response = await fetch(`${VEX_NATIVE_RPC}/v1/chain/get_currency_balance`, {
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

export async function sendNativeTransfer(input: NativeTransferInput) {
  if (!activeConnection) throw new Error("Connect Wisp Native first.");

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
        from: activeConnection.account.actor,
        to: recipient,
        quantity: formatNativeAmount(input.amount),
        memo,
      },
    },
  ];

  const client = await getClient();
  if (activeConnection.method === "Wisp Telegram") {
    const telegram = getTelegramTransport();
    if (!telegram) throw new Error("Wisp Telegram is unavailable on this page.");
    return telegram.transact(client, { actions });
  }

  return client.transact({ actions, broadcast: true });
}
