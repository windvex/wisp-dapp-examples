import type {
  VexaniumAccount,
  VexSigningRequestResult,
} from "@windstack/vexanium";

import { APP_NAME, VEX_NATIVE_CHAIN_ID, WISP_API_URL } from "../config";

const SESSION_KEY = "wisp-dapp-example:telegram-account:v1";
const SESSION_TTL_MS = 24 * 60 * 60_000;
const POLL_INTERVAL_MS = 1_500;

type HandoffResult = {
  actor?: string;
  permission?: string;
  transactionId?: string;
  error?: string;
};

type HandoffStatus = {
  id: string;
  status: "pending" | "opened" | "approved" | "rejected" | "failed";
  expiresAt: number;
  result?: HandoffResult;
};

type PreparedHandoff = {
  id: string;
  expiresAt: number;
  launchUrl: string;
};

type StoredSession = {
  account: VexaniumAccount;
  expiresAt: number;
};

class WispApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "WispApiError";
  }
}

function apiError(value: unknown, fallback: string) {
  if (value && typeof value === "object") {
    const error = (value as { error?: { message?: unknown } }).error;
    if (typeof error?.message === "string" && error.message) return error.message;
  }
  return fallback;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${WISP_API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new WispApiError(
      apiError(body, `Wisp Telegram returned ${response.status}.`),
      response.status,
    );
  }
  return body as T;
}

function toAccount(result: HandoffResult | VexaniumAccount | undefined): VexaniumAccount {
  const actor = String(result?.actor || "").trim();
  const permission = String(result?.permission || "active").trim();
  if (!/^[a-z1-5.]{1,12}$/u.test(actor) || !/^[a-z1-5.]{1,12}$/u.test(permission)) {
    throw new Error("Wisp Telegram returned an invalid VEX Native account.");
  }
  return {
    actor,
    permission,
    permissionLevel: `${actor}@${permission}`,
    chainId: VEX_NATIVE_CHAIN_ID,
  };
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Wallet request cancelled.", "AbortError"));
      },
      { once: true },
    );
  });
}

export function isWispTelegramSupported() {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

export async function waitForTelegramResult(
  prepared: PreparedHandoff,
  signal?: AbortSignal,
) {
  while (Date.now() < prepared.expiresAt) {
    if (signal?.aborted) {
      throw new DOMException("Wallet request cancelled.", "AbortError");
    }

    let status: HandoffStatus;
    try {
      status = await requestJson<HandoffStatus>(
        `/telegram/dapp/status?id=${encodeURIComponent(prepared.id)}`,
        { signal },
      );
    } catch (error) {
      if (signal?.aborted) {
        throw new DOMException("Wallet request cancelled.", "AbortError");
      }
      if (error instanceof WispApiError && error.status < 500 && error.status !== 429) {
        throw error;
      }
      // Android may suspend this page's fetch while Telegram is in front.
      // Resume the same deterministic handoff instead of preparing a duplicate.
      await sleep(POLL_INTERVAL_MS, signal);
      continue;
    }
    if (status.status === "approved") return status.result;
    if (status.status === "rejected") {
      throw new Error(status.result?.error || "Request rejected by user.");
    }
    if (status.status === "failed") {
      throw new Error(status.result?.error || "Wisp Telegram could not complete the request.");
    }
    await sleep(POLL_INTERVAL_MS, signal);
  }
  throw new Error("Wisp Telegram request expired.");
}

function metadata() {
  return {
    name: APP_NAME,
    description: "Developer example for Wisp Wallet.",
    origin: window.location.origin,
    url: window.location.href,
  };
}

async function prepare(body: Record<string, unknown>, signal?: AbortSignal) {
  if (!isWispTelegramSupported()) {
    throw new Error("Telegram native handoff requires an HTTPS page. Use an HTTPS dev tunnel or deploy the example.");
  }
  const prepared = await requestJson<PreparedHandoff>("/telegram/dapp/prepare", {
    method: "POST",
    signal,
    body: JSON.stringify({
      ...metadata(),
      chainId: VEX_NATIVE_CHAIN_ID,
      ...body,
    }),
  });
  if (!prepared.id || !prepared.launchUrl || prepared.expiresAt <= Date.now()) {
    throw new Error("Wisp Telegram returned an invalid handoff.");
  }
  const opened = window.open(prepared.launchUrl, "_blank");
  if (opened) opened.opener = null;
  else window.location.assign(prepared.launchUrl);
  return prepared;
}

export function loadTelegramNativeSession(): VexaniumAccount | null {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as StoredSession | null;
    if (!stored || stored.expiresAt <= Date.now() || stored.account.chainId !== VEX_NATIVE_CHAIN_ID) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return toAccount(stored.account);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearTelegramNativeSession() {
  localStorage.removeItem(SESSION_KEY);
}

function saveTelegramNativeSession(account: VexaniumAccount) {
  const stored: StoredSession = {
    account,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
}

export async function connectTelegramNative(signal?: AbortSignal) {
  const prepared = await prepare({ kind: "connect", request: "" }, signal);
  const account = toAccount(await waitForTelegramResult(prepared, signal));
  saveTelegramNativeSession(account);
  return account;
}

export async function signTelegramNative(
  request: string,
  account: VexaniumAccount,
  signal?: AbortSignal,
): Promise<VexSigningRequestResult> {
  const prepared = await prepare(
    {
      kind: "sign",
      request,
      expectedAccount: account.actor,
      expectedPermission: account.permission,
    },
    signal,
  );
  const result = await waitForTelegramResult(prepared, signal);
  const signer = toAccount(result);
  if (signer.permissionLevel !== account.permissionLevel) {
    throw new Error("Wisp Telegram signed with a different account.");
  }
  const transactionId = String(result?.transactionId || "").trim();
  if (!/^[0-9a-f]{64}$/u.test(transactionId)) {
    throw new Error("Wisp Telegram did not return a broadcast transaction ID.");
  }
  saveTelegramNativeSession(signer);
  return {
    transactionId,
    signatures: [],
    signer: signer.actor,
    signerPermission: signer.permission,
    broadcast: true,
    raw: { transport: "wisp-telegram", handoffId: prepared.id },
  };
}
