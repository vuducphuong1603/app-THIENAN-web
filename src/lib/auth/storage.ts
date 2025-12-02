import type { AppRole } from "@/types/auth";

const STORAGE_KEYS = {
  account: "tn-auth-account",
  session: "tn-auth-session",
  role: "tn-auth-role",
} as const;

export type StoredAccount = {
  phone: string;
  password: string;
};

export type StoredSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

type Nullable<T> = T | null | undefined;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to read ${key} from storage`, error);
    return null;
  }
}

function writeJson(key: string, value: Nullable<unknown>) {
  if (!isBrowser()) return;
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key} to storage`, error);
  }
}

export const authStorage = {
  getAccount(): StoredAccount | null {
    return readJson<StoredAccount>(STORAGE_KEYS.account);
  },
  setAccount(account: Nullable<StoredAccount>) {
    writeJson(STORAGE_KEYS.account, account);
  },
  getSession(): StoredSession | null {
    return readJson<StoredSession>(STORAGE_KEYS.session);
  },
  setSession(session: Nullable<StoredSession>) {
    writeJson(STORAGE_KEYS.session, session);
  },
  getRole(): AppRole | null {
    return readJson<AppRole>(STORAGE_KEYS.role);
  },
  setRole(role: Nullable<AppRole>) {
    writeJson(STORAGE_KEYS.role, role);
  },
  clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(STORAGE_KEYS.account);
    window.localStorage.removeItem(STORAGE_KEYS.session);
    window.localStorage.removeItem(STORAGE_KEYS.role);
  },
};

export type AuthStorage = typeof authStorage;
