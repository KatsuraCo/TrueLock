# Public Policy Rules (TrueLock)

Document version: 2.1
Updated: 2026-02-25

## 1. Objective
This document defines how access conditions are evaluated when opening a capsule.

## 2. Supported Conditions
- Password (`password`)
- Time window (`time`)
- Geolocation (`geolocation`)
- Visual key (`image`)

## 3. Policy Mode
- `and`: all configured conditions must be satisfied.
- `or`: at least one configured condition must be satisfied.

## 4. Condition Semantics
- Password: derive condition key from input + envelope salt, then attempt unwrap.
- Time: validate `now` against `notBefore` and optional `notAfter`.
- Geolocation: require distance to target <= `radiusMeters`.
- Visual: normalize visual input, derive visual condition key, then verify envelope.

## 5. Security Invariants
- Only successful envelope unwrap counts as condition success.
- Partial condition success must not bypass `mode` semantics.
- Payload tampering must fail authentication/integrity checks.

## 6. Viewer Storage Exception Note
- `password/time/geolocation/image` policy checks are independent from viewer storage mode.
- RAM-only rendering remains the preferred in-app posture.
- Current known exception: video preview may require a temporary local file on some platforms/stacks.
- This exception does not weaken policy enforcement; all configured conditions remain mandatory per `mode`.

## 7. Change Governance
Any policy-logic change requires:
1. document update,
2. test/regression update,
3. release note update in Security Trust Pack.
