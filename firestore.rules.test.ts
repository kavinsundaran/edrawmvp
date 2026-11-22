/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Security Rules Verification Spec for EDraw Student Accounts & EDID-XXXX Registry.
 * Matches the "Dirty Dozen" adversarial payloads defined in security_spec.md.
 */

export const DIRTY_DOZEN_SECURITY_CASES = [
  {
    id: 1,
    name: 'Unauthenticated Student Read',
    operation: 'GET /students/userB',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User Student Read',
    operation: 'GET /students/userB (auth: userA)',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Collection Enumeration (Students)',
    operation: 'LIST /students',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Collection Enumeration (EDIDs)',
    operation: 'LIST /edid_index',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unverified Email Write',
    operation: 'CREATE /students/userA (email_verified: false)',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow / Ghost Field Injection',
    operation: 'CREATE /students/userA (+ isAdmin: true)',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'EDID Hijack / Overwrite',
    operation: 'CREATE /edid_index/EDID-3574 (already exists)',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Orphaned Student Without EDID Index',
    operation: 'CREATE /students/userA (without batched /edid_index write)',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'EDID Mutation Attack',
    operation: 'UPDATE /students/userA (edid: EDID-1015)',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Identity Spoofing on Create',
    operation: 'CREATE /edid_index/EDID-9999 (ownerUid: userB, auth: userA)',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Timestamp Forgery',
    operation: 'CREATE /students/userA (createdAt != request.time)',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Resource Exhaustion / ID Poisoning',
    operation: 'CREATE /students/userA (fullName > 80 chars or visitedModules > 10)',
    expected: 'PERMISSION_DENIED',
  },
] as const;
