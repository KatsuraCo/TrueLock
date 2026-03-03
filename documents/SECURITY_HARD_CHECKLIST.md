# Security Hard Checklist (TrueLock)

Document version: 2.1
Updated: 2026-02-25

## 1. Purpose
Release-gate checklist for security-critical changes.

## 2. Code Review
- [ ] No placeholder/stub crypto path in active flows.
- [ ] No legacy XOR fallback in production decrypt path.
- [ ] No hardcoded secrets/tokens.
- [ ] No debug bypass in production execution path.

## 3. Cryptography Review
- [ ] AES-256-GCM active for capsule payload.
- [ ] Unique nonce per operation.
- [ ] MAC/auth tag verified on every decrypt.
- [ ] KDF deterministic for same password+salt.

## 4. Policy Review
- [ ] `and` denies when any required condition fails.
- [ ] `or` allows when at least one condition succeeds.
- [ ] Time boundaries validated correctly.
- [ ] Geolocation radius enforcement confirmed.
- [ ] Visual-key mismatch denies access.

## 5. Release Discipline
- [ ] `dart analyze` clean for impacted modules.
- [ ] targeted encryption/capsule tests pass.
- [ ] checksums generated and archived.
- [ ] trust-doc version present in release notes.
