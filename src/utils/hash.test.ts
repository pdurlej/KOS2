import { fnv1aHex } from "./hash";

describe("fnv1aHex", () => {
  it("returns an 8-character hex string", () => {
    const result = fnv1aHex("hello");
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is deterministic", () => {
    expect(fnv1aHex("vault-name")).toBe(fnv1aHex("vault-name"));
  });

  it("produces different hashes for different inputs", () => {
    expect(fnv1aHex("a")).not.toBe(fnv1aHex("b"));
    expect(fnv1aHex("hello")).not.toBe(fnv1aHex("world"));
  });

  it("handles empty string", () => {
    const result = fnv1aHex("");
    expect(result).toMatch(/^[0-9a-f]{8}$/);
    expect(result).toBe("811c9dc5"); // FNV-1a offset basis, no iterations
  });

  it("handles long strings", () => {
    const long = "x".repeat(10000);
    const result = fnv1aHex(long);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles unicode content", () => {
    const result = fnv1aHex("こんにちは");
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("known vector: 'foobar'", () => {
    // Verified against reference FNV-1a 32-bit implementation
    expect(fnv1aHex("foobar")).toBe("bf9cf968");
  });
});
