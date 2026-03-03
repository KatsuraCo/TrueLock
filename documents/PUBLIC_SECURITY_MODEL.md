# Public Security Model (TrueLock)

Document version: 2.1
Updated: 2026-02-25

## 1. Security Goal
TrueLock protects capsule content through client-side encryption and deterministic local enforcement of access conditions.

## 2. Threat Model
### In scope
- passive interception of capsule files in transit,
- unauthorized open attempts,
- encrypted payload tampering,
- operational misconfiguration.

### Out of scope
- fully compromised endpoint/device,
- social engineering outside app controls,
- legal/jurisdictional guarantees beyond technical controls.

## 3. Cryptographic Baseline
- AEAD: AES-256-GCM,
- unique nonce per operation,
- mandatory auth-tag verification before plaintext use,
- KDF for condition-key derivation (including password flow).

## 4. Privacy and Integrity Principles
- header exposes only minimal non-secret operational fields,
- message/attachments/internal fields remain in encrypted payload,
- payload manipulation must trigger deterministic decrypt rejection.

## 5. In-App Viewer Memory Policy
- trust target: RAM-only rendering for in-app viewing.
- current technical exception: video playback may require temporary local file paths on selected runtime stacks.
- this is an implementation compatibility exception, not an access-control bypass.
- temporary media artifacts must be deleted when the viewer closes.

## 6. Model Limitations
- does not replace endpoint hardening,
- does not fully prevent screenshots/screen recording/coerced disclosure,
- geo and visual conditions raise control level but are not absolute anti-forensics guarantees.
