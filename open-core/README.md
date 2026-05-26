# TrueLock Open Core

This directory contains an auditable Dart reference codec for the TrueLock
password-capsule path.

## Included

- `CFCAPS1` v2 file header parsing and creation.
- `CFCPLD1` encrypted payload encoding and decoding.
- AES-256-GCM payload encryption and password envelope unwrapping.
- Argon2id password derivation with the production profile documented in the
  public trust pack: 65536 KB memory, 3 iterations, parallelism 4, 32-byte key.
- Positive and negative compatibility tests.

The format specification remains available in
[`../documents/PUBLIC_CAPSULE_FORMAT.md`](../documents/PUBLIC_CAPSULE_FORMAT.md).

## Boundary

This public codec implements password-based v2 capsules only. TrueLock policy
modules for time, location, visual conditions, creator workflows, licensing,
release signing, and integrity enforcement are not included in this package.
It contains no user secrets or production credentials.

## Verify

```sh
dart pub get
dart analyze
dart test
```

## License

This directory is licensed under the Apache License, Version 2.0. Other files
in the TrueLock repository are not relicensed unless their own notice says so.
