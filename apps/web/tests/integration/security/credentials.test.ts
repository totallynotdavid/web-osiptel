import { describe, expect, it } from "vitest";

import { decrypt, encrypt } from "~/lib/crypto/credentials";

describe("credentials encryption integration", () => {
  it("round-trips plaintext and rejects tampered ciphertext", () => {
    const encrypted = encrypt("proxy-password");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    expect(decrypt(encrypted)).toBe("proxy-password");

    const [iv, tag, cipher] = parts;
    const tampered = `${iv}:${tag}:${cipher.slice(0, -2)}AA`;
    expect(() => decrypt(tampered)).toThrow(/.+/);
    expect(() => decrypt("bad-format")).toThrow("Invalid encrypted credential format");
  });
});
