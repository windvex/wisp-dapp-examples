import { ABICache } from "@wharfkit/abicache";
import { APIClient, type AnyAction } from "@wharfkit/antelope";
import { WISP_ERROR_CODES, isWispProviderError } from "@windstack/core";
import {
  createSigningRequest,
  createVexaniumClient,
  vexNative,
  type VexaniumAccount,
  type VexaniumClient,
  type VexSigningRequestResult,
} from "@windstack/vexanium";

import { APP_NAME, VEX_NATIVE_RPC } from "../config";
import {
  clearTelegramNativeSession,
  connectTelegramNative,
  isWispTelegramSupported,
  loadTelegramNativeSession,
  signTelegramNative,
} from "./wispTelegram";

export type NativeConnectionMethod = "VexaniumProvider v1" | "Wisp Telegram handoff";

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

const apiClient = new APIClient({ url: VEX_NATIVE_RPC });
const abiProvider = new ABICache(apiClient);
const listeners = new Set<NativeListener>();

let clientPromise: Promise<VexaniumClient> | null = null;
let unsubscribeClient: (() => void) | null = null;
let activeConnection: NativeConnection | null = null;

function emit(reason: string) {
  for (const listener of listeners) listener(activeConnection, reason);
}

function providerError(error: unknown) {
  if (isWispProviderError(error)) {
    const code = (error as { code?: number }).code;
    if (code === WISP_ERROR_CODES.USER_REJECTED) return new Error("Request rejected by user.");
    if (code === WISP_ERROR_CODES.REQUEST_PENDING) return new Error("Another wallet request is already pending.");
    if (code === WISP_ERROR_CODES.DISCONNECTED) return new Error("Wisp Native provider is disconnected.");
  }
  return error instanceof Error ? error : new Error("Wisp Native request failed.");
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = createVexaniumClient({
      providerRdns: "com.wisp.wallet",
      discoveryTimeoutMs: 1_200,
      autoSync: true,
      dapp: {
        name: APP_NAME,
        description: "Developer example for Wisp Wallet.",
        url: window.location.href,
      },
    }).then((client) => {
      unsubscribeClient = client.subscribeSession(({ accounts, reason }) => {
        if (accounts[0]) {
          activeConnection = {
            account: accounts[0],
            chainId: String(accounts[0].chainId),
            method: "VexaniumProvider v1",
          };
        } else if (activeConnection?.method === "VexaniumProvider v1") {
          activeConnection = null;
        }
        emit(reason);
      });
      return client;
    });
  }
  return clientPromise;
}

function requireAccount() {
  const account = activeConnection?.account || loadTelegramNativeSession();
  if (!account) throw new Error("Connect Wisp Native first.");
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

export function subscribeNative(listener: NativeListener) {
  listeners.add(listener);
  listener(activeConnection, "current");
  return () => {
    listeners.delete(listener);
  };
}

export async function connectNative(): Promise<NativeConnection> {
  try {
    const client = await getClient();
    if (client.isAvailable()) {
      const accounts = await client.connect({
        chainId: vexNative.chainId,
        requiredCapabilities: ["vex.accounts", "vex.sessions", "vex.signingRequest"],
      });
      if (!accounts[0]) throw new Error("Wisp returned no VEX Native account.");
      clearTelegramNativeSession();
      activeConnection = {
        account: accounts[0],
        chainId: String(accounts[0].chainId),
        method: "VexaniumProvider v1",
      };
      emit("connect");
      return activeConnection;
    }

    const saved = loadTelegramNativeSession();
    const account = saved || (isWispTelegramSupported() ? await connectTelegramNative() : null);
    if (!account) {
      throw new Error(
        "No injected Wisp provider was found. Portable Wisp Telegram handoff requires HTTPS.",
      );
    }
    activeConnection = {
      account,
      chainId: String(account.chainId),
      method: "Wisp Telegram handoff",
    };
    emit(saved ? "restore" : "connect");
    return activeConnection;
  } catch (error) {
    throw providerError(error);
  }
}

export async function disconnectNative() {
  const client = await getClient();
  if (client.isAvailable() && client.getSession()) {
    await client.disconnect().catch(() => undefined);
  }
  clearTelegramNativeSession();
  activeConnection = null;
  emit("disconnect");
}

export async function getNativeAccount() {
  const client = await getClient();
  if (client.isAvailable()) {
    const accounts = await client.getAccounts().catch(() => []);
    if (accounts[0]) {
      activeConnection = {
        account: accounts[0],
        chainId: String(accounts[0].chainId),
        method: "VexaniumProvider v1",
      };
      return accounts[0];
    }
  }
  return requireAccount();
}

export async function getNativeBalance(accountName?: string) {
  const actor = validateName(accountName || requireAccount().actor, "Account");
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

export async function sendNativeTransfer(
  input: NativeTransferInput,
): Promise<VexSigningRequestResult> {
  const account = requireAccount();
  const recipient = validateName(input.recipient, "Recipient");
  const memo = input.memo.trim();
  if (new TextEncoder().encode(memo).length > 256) {
    throw new Error("Memo must be at most 256 UTF-8 bytes.");
  }

  const action: AnyAction = {
    account: "vex.token",
    name: "transfer",
    authorization: [{ actor: account.actor, permission: account.permission }],
    data: {
      from: account.actor,
      to: recipient,
      quantity: formatNativeAmount(input.amount),
      memo,
    },
  };
  // To call another contract, replace account, name, and data in the action above.
  const request = await createSigningRequest(
    { chainId: vexNative.chainId, broadcast: true, actions: [action] },
    { abiProvider, compress: true },
  );

  if (activeConnection?.method === "VexaniumProvider v1") {
    const client = await getClient();
    return client.signSigningRequest({ request, broadcast: true });
  }
  return signTelegramNative(request, account);
}

export function disposeNative() {
  unsubscribeClient?.();
  unsubscribeClient = null;
  void clientPromise?.then((client) => client.destroy());
  clientPromise = null;
  listeners.clear();
}
