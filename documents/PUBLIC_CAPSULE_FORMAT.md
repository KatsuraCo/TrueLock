# Public Capsule Format (TrueLock)

Document version: 2.1
Updated: 2026-02-25
Applies to capsule container: `CFCAPS1` (v2), with backward compatibility for v1.

## 1. Purpose and Scope
This document defines the public and verifiable `.cfcaps` file format used by TrueLock Secure Message Capsule. It covers container structure, visible metadata, encrypted boundaries, and compatibility behavior.

This document does not disclose private keys, user secrets, or confidential key-derivation material.

## 2. File Layout
A `.cfcaps` file contains two parts:
1. UTF-8 header line: `CFCAPS1 {json}\n`
2. Binary encrypted body: `[nonce(12)][mac(16)][cipherText(...)]`

Where:
- `CFCAPS1` is container magic,
- `json` contains public metadata,
- `nonce/mac/cipherText` is AES-256-GCM output for payload bytes.

## 3. Header JSON (v2)
Required fields:
- `v`
- `suite`
- `mode`
- `envelopes`
- `createdAt`
- `title`
- `showUnlockTimer`
- `wm`
- `wmv`

## 4. Public vs Encrypted Data
Public (header):
- container/version metadata,
- policy mode,
- minimal non-secret condition parameters,
- title and capsule creation time.

Encrypted (payload):
- message body,
- attachments,
- recipient instruction,
- internal protected fields.

## 5. Policy Envelopes
Supported condition envelope keys:
- `password`
- `time`
- `geolocation`
- `image`

Each envelope carries encrypted payload-key material (`nonce`, `mac`, `cipherText`).

## 6. Compatibility and Failure Behavior
- v2 parser accepts v2 and legacy v1 password-only capsules.
- Missing mandatory v2 fields => `invalid_capsule_format`.
- Corrupted envelope or auth tag => deterministic decryption failure.

## 7. Security Requirements
- AES-256-GCM with unique nonce per encryption operation.
- Authentication must be verified before plaintext use.
- Header metadata must stay limited to non-secret operational fields.
