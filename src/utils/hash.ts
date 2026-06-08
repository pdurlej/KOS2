/**
 * Lightweight synchronous hash utilities — no external dependencies.
 *
 * All use-cases in this codebase are non-security: cache keys, change-detection
 * fingerprints, and deduplication IDs. A fast non-cryptographic hash is fine.
 * Using the Web Crypto API would require async, which would ripple into every
 * call site. FNV-1a is a well-known, collision-resistant-enough choice for these
 * purposes and runs in constant time proportional to input length.
 *
 * NOTE: Changing the hash function causes cache misses for ephemeral caches and
 * forces a one-time vector-store reindex for persistent indexes (the plugin
 * automatically prompts users to rebuild when the index key changes).
 */

/**
 * Compute a 32-bit FNV-1a hash and return it as a zero-padded 8-char hex string.
 *
 * Suitable for: cache keys, change-detection fingerprints, deduplication IDs.
 * NOT suitable for: password hashing, HMACs, or any security-sensitive use.
 *
 * @param input - The string to hash.
 * @returns An 8-character lowercase hex string (e.g. `"6e726974"`).
 */
export function fnv1aHex(input: string): string {
  // FNV-1a 32-bit, offset basis 2166136261, prime 16777619
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Math.imul performs 32-bit integer multiplication without precision loss
    hash = Math.imul(hash, 0x01000193);
  }
  // >>> 0 converts to unsigned 32-bit integer before hex conversion
  return (hash >>> 0).toString(16).padStart(8, "0");
}
