import { config } from "@/config";
import { keyContext, type UserIntegrationKey } from "@/lib/keys/context";
import { decryptSecret } from "@/lib/keys/crypto";

/** AI provider key prefixes stored in UserApiKey.provider. */
export const AI_PROVIDERS = ["ai_openai", "ai_gemini", "ai_custom"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** Load + decrypt the current user's integration keys (cached per request). */
export async function loadUserKeys(): Promise<Map<string, UserIntegrationKey>> {
  const ctx = keyContext.getStore();
  if (ctx?.keys) return ctx.keys;
  if (ctx?.keysPromise) return ctx.keysPromise;
  if (!ctx?.userId) return new Map();

  ctx.keysPromise = (async () => {
    // Lazy-import prisma so this module stays side-effect-free in tests
    // and edge contexts without DATABASE_URL.
    const { prisma } = await import("@/lib/db");
    const rows = await prisma.userApiKey.findMany({
      where: { user_id: ctx.userId! },
    });
    const map = new Map<string, UserIntegrationKey>();
    for (const row of rows) {
      try {
        map.set(row.provider, {
          provider: row.provider,
          secret: decryptSecret(row.key_encrypted),
          config: (row.config as Record<string, unknown>) ?? {},
          is_primary: row.is_primary,
        });
      } catch {
        // Skip undecryptable rows (e.g. encryption key rotated)
      }
    }
    if (ctx) ctx.keys = map;
    return map;
  })().catch(() => {
    const empty = new Map<string, UserIntegrationKey>();
    if (ctx) ctx.keys = empty;
    return empty;
  });
  return ctx.keysPromise;
}

/** Synchronous read of already-loaded keys (call after await loadUserKeys). */
export function cachedUserKey(provider: string): UserIntegrationKey | undefined {
  return keyContext.getStore()?.keys?.get(provider);
}

export interface ResolvedAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  embeddingModel: string;
  source: "user" | "env";
}

const AI_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  ai_openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  ai_gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-3.5-flash-lite",
  },
  ai_custom: { baseUrl: "", model: "" },
};

/** Resolve AI credentials: user's primary AI key → env fallback. */
export async function resolveAiConfig(): Promise<ResolvedAiConfig> {
  const keys = await loadUserKeys();

  // Find the user's primary AI key, else first AI key present
  let aiKey: UserIntegrationKey | undefined;
  for (const p of AI_PROVIDERS) {
    const k = keys.get(p);
    if (k?.is_primary) {
      aiKey = k;
      break;
    }
  }
  if (!aiKey) {
    for (const p of AI_PROVIDERS) {
      const k = keys.get(p);
      if (k) {
        aiKey = k;
        break;
      }
    }
  }

  if (aiKey) {
    const d = AI_DEFAULTS[aiKey.provider] ?? AI_DEFAULTS.ai_custom;
    const c = aiKey.config;
    return {
      apiKey: aiKey.secret,
      baseUrl:
        (c.base_url as string) ||
        d.baseUrl ||
        config.openai.baseUrl ||
        "https://api.openai.com/v1",
      model:
        (c.model as string) ||
        d.model ||
        config.openai.model ||
        "gpt-4o-mini",
      embeddingModel:
        (c.embedding_model as string) ||
        config.openai.embeddingModel ||
        "text-embedding-3-small",
      source: "user",
    };
  }

  return {
    apiKey: config.openai.apiKey,
    baseUrl: config.openai.baseUrl || "https://api.openai.com/v1",
    model: config.openai.model || "gpt-4o-mini",
    embeddingModel: config.openai.embeddingModel || "text-embedding-3-small",
    source: "env",
  };
}

/** Map provider → env-var fallback for secrets. */
const ENV_KEY_MAP: Record<string, string> = {
  adzuna: "ADZUNA_API_KEY",
  jooble: "JOOBLE_API_KEY",
  tavily: "TAVILY_API_KEY",
  dice: "DICE_API_KEY",
  reed: "REED_API_KEY",
  usajobs: "USAJOBS_API_KEY",
  wellfound: "WELLFOUND_API_KEY",
  themuse: "THEMUSE_API_KEY",
  careerjet: "CAREERJET_AFFID",
  lever: "LEVER_API_KEY",
};

const ENV_CONFIG_MAP: Record<string, Record<string, string>> = {
  adzuna: { app_id: "ADZUNA_APP_ID" },
  careerjet: { affid: "CAREERJET_AFFID", locale: "CAREERJET_LOCALE" },
};

export interface ResolvedProviderKey {
  apiKey: string;
  config: Record<string, string>;
  source: "user" | "env";
}

/**
 * Resolve a job-provider credential: user's stored key → env fallback.
 * Call after `await loadUserKeys()` for user keys to be visible.
 */
export function resolveProviderKey(provider: string): ResolvedProviderKey {
  const uk = cachedUserKey(provider);
  if (uk) {
    const cfg: Record<string, string> = {};
    for (const [k, v] of Object.entries(uk.config)) {
      if (typeof v === "string") cfg[k] = v;
    }
    return { apiKey: uk.secret, config: cfg, source: "user" };
  }

  const envName = ENV_KEY_MAP[provider];
  const apiKey = envName ? (process.env[envName] ?? "") : "";
  const cfg: Record<string, string> = {};
  for (const [field, envVar] of Object.entries(ENV_CONFIG_MAP[provider] ?? {})) {
    const v = process.env[envVar];
    if (v) cfg[field] = v;
  }
  return { apiKey, config: cfg, source: "env" };
}
