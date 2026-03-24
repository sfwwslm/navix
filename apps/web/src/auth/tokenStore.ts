import type { Claims } from "@navix/shared-ts";

const USER_ACCESS_TOKEN_KEY = "navix.web.user_access_token";
const USER_REFRESH_TOKEN_KEY = "navix.web.user_refresh_token";
const ACCOUNT_SESSIONS_KEY = "navix.web.account_sessions";

let userAccessToken: string | null = null;
let userRefreshToken: string | null = null;

export type StoredAccountSession = {
  userUuid: string;
  username: string;
  refreshToken: string;
  lastUsedAt: number;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

function readToken(key: string): string | null {
  return getStorage()?.getItem(key) ?? null;
}

function writeToken(key: string, token: string | null): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (!token) {
    storage.removeItem(key);
    return;
  }

  storage.setItem(key, token);
}

function readSessions(): StoredAccountSession[] {
  const raw = getStorage()?.getItem(ACCOUNT_SESSIONS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is StoredAccountSession => {
        if (!item || typeof item !== "object") return false;
        const record = item as Record<string, unknown>;
        return (
          typeof record.userUuid === "string" &&
          typeof record.username === "string" &&
          typeof record.refreshToken === "string" &&
          typeof record.lastUsedAt === "number"
        );
      })
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  } catch {
    return [];
  }
}

function writeSessions(sessions: StoredAccountSession[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(ACCOUNT_SESSIONS_KEY, JSON.stringify(sessions));
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return window.atob(padded);
}

export function decodeTokenClaims(token: string | null): Claims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = decodeBase64Url(parts[1]);
    return JSON.parse(payload) as Claims;
  } catch {
    return null;
  }
}

export function getUserAccessToken(): string | null {
  if (!userAccessToken) {
    userAccessToken = readToken(USER_ACCESS_TOKEN_KEY);
  }
  return userAccessToken;
}

export function setUserAccessToken(token: string): void {
  userAccessToken = token;
  writeToken(USER_ACCESS_TOKEN_KEY, token);
}

export function getUserRefreshToken(): string | null {
  if (!userRefreshToken) {
    userRefreshToken = readToken(USER_REFRESH_TOKEN_KEY);
  }
  return userRefreshToken;
}

export function setUserRefreshToken(token: string): void {
  userRefreshToken = token;
  writeToken(USER_REFRESH_TOKEN_KEY, token);
}

export function setCurrentUserSession(
  accessToken: string,
  refreshToken?: string | null,
): Claims | null {
  setUserAccessToken(accessToken);
  if (refreshToken) {
    setUserRefreshToken(refreshToken);
  }

  const claims = decodeTokenClaims(accessToken);
  if (claims && refreshToken) {
    upsertStoredAccountSession({
      userUuid: claims.sub,
      username: claims.username,
      refreshToken,
      lastUsedAt: Date.now(),
    });
  }

  return claims;
}

export function clearUserAccessToken(): void {
  userAccessToken = null;
  writeToken(USER_ACCESS_TOKEN_KEY, null);
  userRefreshToken = null;
  writeToken(USER_REFRESH_TOKEN_KEY, null);
}

export function clearAllAccessTokens(): void {
  clearUserAccessToken();
}

export function getStoredAccountSessions(): StoredAccountSession[] {
  return readSessions();
}

export function upsertStoredAccountSession(
  session: StoredAccountSession,
): StoredAccountSession[] {
  const existing = readSessions().filter(
    (item) => item.userUuid !== session.userUuid,
  );
  const next = [session, ...existing].sort(
    (a, b) => b.lastUsedAt - a.lastUsedAt,
  );
  writeSessions(next);
  return next;
}

export function removeStoredAccountSession(
  userUuid: string,
): StoredAccountSession[] {
  const next = readSessions().filter((item) => item.userUuid !== userUuid);
  writeSessions(next);
  return next;
}
