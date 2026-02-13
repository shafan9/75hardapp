import { createClient } from "@supabase/supabase-js";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const payload = parts[1] ?? "";
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function assertLooksLikeServiceRoleKey(key: string) {
  const trimmed = key.trim();

  // Supabase now supports secret keys like sb_secret_... (non-JWT). Accept them.
  if (trimmed.startsWith("sb_secret_")) {
    return;
  }

  // Reject publishable keys explicitly.
  if (trimmed.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY looks like a publishable key. Paste the Service Role (secret) key from Supabase (Project Settings -> API)."
    );
  }

  // Legacy keys are JWTs; validate role.
  const payload = decodeJwtPayload(trimmed);
  const role = payload && typeof payload.role === "string" ? payload.role : null;

  if (role !== "service_role") {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY must be the Supabase Service Role key (role: service_role). Detected role: ${
        role ?? "unknown"
      }. Paste the Service Role key from Supabase (Project Settings -> API).`
    );
  }
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing server env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  assertLooksLikeServiceRoleKey(serviceRoleKey);

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
