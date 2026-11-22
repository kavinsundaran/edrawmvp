# Security Specification & Payload-First TDD — Capybara Student Accounts

## 1. Data Invariants
1. **Unique & Immutable CAPYID-XXXX**: Every newly registered student receives exactly one `CAPYID-XXXX` (`^CAPYID-[0-9]{4}$`, with legacy `EDID-XXXX` preserved read/update-only) atomically paired between `/students/{uid}` and `/edid_index/{edid}` using `getAfter(...)`. Neither `edid` nor `uid` nor `ownerUid` can ever be mutated or deleted after creation.
2. **Strict Owner & PII Isolation**: `/students/{uid}` contains PII (`email`, `fullName`, `college`, `studentDetails`) and is strictly readable and writable ONLY by `request.auth.uid == uid` with `email_verified == true`. List queries (`allow list`) on `/students` and `/edid_index` are completely forbidden (`if false`).
3. **Zero Plaintext PII in `/edid_index/{edid}`**: `/edid_index/{edid}` never stores `email`, `fullName`, or `college`. For password accounts, it stores only `encryptedEmail` (AES-GCM ciphertext keyed via PBKDF2 from `password + edid`) and `iv`, so unauthenticated `get` lookups for `CAPYID-XXXX` sign-in never expose any email address.
4. **Temporal & Key Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt` is immutable on update and `updatedAt` must equal `request.time`. All writes enforce strict `keys().hasAll(...) && keys().hasOnly(...)` and bounded field sizes.
5. **Cross-User Isolation**: A student can never read, overwrite, or mix learning progress or CAPYID records belonging to any other `uid`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Student Read**: `GET /students/userB` without auth -> `PERMISSION_DENIED`.
2. **Cross-User Student Read**: `GET /students/userB` signed in as `userA` -> `PERMISSION_DENIED`.
3. **Collection Enumeration (Students)**: `LIST /students` signed in as `userA` -> `PERMISSION_DENIED`.
4. **Collection Enumeration (CAPYIDs)**: `LIST /edid_index` signed in as `userA` or unauthenticated -> `PERMISSION_DENIED`.
5. **Unverified Email Write**: `CREATE /students/userA` with `email_verified: false` -> `PERMISSION_DENIED`.
6. **Shadow / Ghost Field Injection**: `CREATE /students/userA` adding `"isAdmin": true` -> `PERMISSION_DENIED`.
7. **CAPYID Hijack / Overwrite**: `CREATE /edid_index/CAPYID-3574` when `CAPYID-3574` already belongs to `userA`, signed in as `userB` -> `PERMISSION_DENIED`.
8. **Orphaned Student Without CAPYID Index**: `CREATE /students/userA` without a batched `/edid_index/{edid}` write -> `PERMISSION_DENIED` (blocked by `getAfter`).
9. **CAPYID Mutation Attack**: `UPDATE /students/userA` attempting to change `edid` from `CAPYID-3574` to `CAPYID-1015` -> `PERMISSION_DENIED`.
10. **Identity Spoofing on Create**: `CREATE /edid_index/CAPYID-9999` by `userA` with `ownerUid: "userB"` -> `PERMISSION_DENIED`.
11. **Timestamp Forgery**: `CREATE /students/userA` with client-supplied `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
12. **Resource Exhaustion / ID Poisoning**: `CREATE /students/userA` with `fullName` of 5000 chars or `visitedModules` array of 50 items -> `PERMISSION_DENIED`.
