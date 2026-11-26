import { AsyncLocalStorage } from "async_hooks";

/**
 * Per-request context carrying the authenticated user's ID and their
 * decrypted integration keys. Set once in getCurrentUser() — every
 * downstream AI call and job-provider search in the same request
 * automatically resolves the user's own keys.
 */
export interface UserIntegrationKey {
  provider: string;
  secret: string; // decrypted API key / token
  config: Record<string, unknown>; // base_url, model, app_id, etc.
  is_primary: boolean;
}

export interface KeyContext {
  userId?: string;
  keys?: Map<string, UserIntegrationKey>;
  keysPromise?: Promise<Map<string, UserIntegrationKey>>;
}

export const keyContext = new AsyncLocalStorage<KeyContext>();

/** Set the user context for the remainder of this async execution. */
export function setKeyContextUser(userId: string): void {
  const store = keyContext.getStore();
  if (store) {
    store.userId = userId;
  } else {
    keyContext.enterWith({ userId });
  }
}
