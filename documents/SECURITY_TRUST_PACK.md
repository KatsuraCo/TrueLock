# Security Trust Pack (TrueLock)

Document version: 2.1
Updated: 2026-02-25

## 1. Role of This Pack
Security Trust Pack is the public, verifiable documentation baseline for TrueLock security guarantees and release discipline.

## 2. Included Documents
1. Public Capsule Format
2. Public Policy Rules
3. Public Security Model
4. Crypto Test Vectors
5. Release Verification
6. Security Hard Checklist
7. Security Trust Pack

## 3. Governing Principles
- transparency over marketing claims,
- explicit security boundaries,
- reproducible verification,
- documented known limitations.

## 4. RAM-only Target and Video Exception
- target state: in-app viewer operates RAM-only where supported.
- known exception: video playback may require temporary local files on selected stacks.
- this exception must remain explicit in trust docs and release notes until removed.
- temporary media artifacts must be deleted on viewer close.

## 5. Governance Requirements
Any security-impacting change requires:
1. code update,
2. trust-doc update,
3. test/regression update,
4. refreshed release verification.
