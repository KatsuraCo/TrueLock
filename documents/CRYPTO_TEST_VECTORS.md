# Crypto Test Vectors (TrueLock)

Document version: 2.1
Updated: 2026-02-25

## 1. Purpose
Defines reproducible scenarios to validate critical cryptographic components.

## 2. Coverage
- AES-256-GCM encrypt/decrypt roundtrip,
- password-derived key flow,
- policy-envelope unwrap behavior,
- negative cases (wrong key, corrupted tag/ciphertext).

## 3. Reference Vector A (AEAD)
Input:
- plaintext: `"TrueLock test payload v2"`
- key length: 32 bytes
- nonce length: 12 bytes

Expected:
1. same key+nonce restores exact plaintext,
2. 1-byte ciphertext mutation fails auth,
3. 1-byte MAC mutation fails auth.

## 4. Reference Vector B (KDF)
Input:
- passphrase: `Correct-Horse-Battery-Staple-2026`
- fixed test salt: 32 bytes

Expected:
1. same passphrase+salt => deterministic key,
2. salt change => different key,
3. passphrase change => different key.

## 5. Acceptance Rule
Release candidate is accepted only if all positive vectors pass and all negative vectors fail deterministically.
