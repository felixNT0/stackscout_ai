import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/keys/crypto";
import { resolveProviderKey, resolveAiConfig } from "@/lib/keys/store";

describe("key crypto", () => {
  it("encrypt/decrypt roundtrip", () => {
    const secret = "sk-test-super-secret-key-12345";
    const enc = encryptSecret(secret);
    expect(enc).not.toContain(secret);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("different ciphertexts for same plaintext", () => {
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same");
    expect(decryptSecret(b)).toBe("same");
  });

  it("maskSecret hides middle", () => {
    expect(maskSecret("sk-abcdefghijklmnop")).toContain("••••");
    expect(maskSecret("short")).toBe("••••••••");
  });
});

describe("key resolution fallback", () => {
  it("resolveProviderKey falls back to env/empty without user context", () => {
    const r = resolveProviderKey("jooble");
    expect(r.source).toBe("env");
  });

  it("resolveAiConfig falls back to env without user context", async () => {
    const ai = await resolveAiConfig();
    expect(["user", "env"]).toContain(ai.source);
    expect(ai.model).toBeTruthy();
  });
});
