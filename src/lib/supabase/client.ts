import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;
const AUTH_STORAGE_MODE_KEY = "75squad.auth.storage";

type AuthStorageMode = "local" | "session";

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

function readAuthStorageMode(): AuthStorageMode {
  if (!canUseBrowserStorage()) return "local";

  try {
    const value = window.localStorage.getItem(AUTH_STORAGE_MODE_KEY);
    if (value === "session") return "session";
  } catch {
    // Ignore storage access failures and default to local storage.
  }

  return "local";
}

function getStorageForMode(mode: AuthStorageMode): Storage | undefined {
  if (!canUseBrowserStorage()) return undefined;

  try {
    return mode === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return undefined;
  }
}

function clearSupabaseTokens(storage: Storage | undefined) {
  if (!storage) return;

  const keysToRemove: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;

    if (/^sb-.*-auth-token$/i.test(key) || key === "supabase.auth.token") {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function getAuthStorageMode(): AuthStorageMode {
  return readAuthStorageMode();
}

export function setAuthStorageMode(mode: AuthStorageMode) {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(AUTH_STORAGE_MODE_KEY, mode);
  } catch {
    // Ignore storage write failures.
  }

  const oppositeStorage = getStorageForMode(mode === "local" ? "session" : "local");
  clearSupabaseTokens(oppositeStorage);
  browserClient = null;
}

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  const storageMode = readAuthStorageMode();
  const storage = getStorageForMode(storageMode);

  browserClient = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storage,
    },
  });

  return browserClient;
}
