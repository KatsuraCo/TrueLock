# Release Verification (TrueLock)

Document version: 2.1
Updated: 2026-02-25

## 1. Objective
Provide reproducible verification for release binaries and trust documents.

## 2. Artifacts to Verify
- Android APK,
- Windows executable/package,
- trust document set.

## 3. Mandatory Release Metadata
- app version and build number,
- SHA-256 for each artifact,
- publication timestamp,
- trust-doc version.

## 4. Checksum Verification (PowerShell)
```powershell
Get-FileHash .\TrueLock.exe -Algorithm SHA256
Get-FileHash .\app-release.apk -Algorithm SHA256
```

## 5. Failure Policy
On any checksum/signature mismatch:
1. stop distribution immediately,
2. revoke affected artifact,
3. publish corrected artifact with new checksum and note.
