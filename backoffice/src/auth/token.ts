// The token lives in sessionStorage: it survives a reload and is gone when the tab closes.
const KEY = 'backoffice.token';

export function readToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // Storage blocked: the session lasts until the page is reloaded.
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}

// Expiry time in ms from the JWT's exp claim. The signature is checked by the API, not here.
export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isExpired(token: string, now = Date.now()): boolean {
  const exp = tokenExpiry(token);
  return exp === null || exp <= now;
}
