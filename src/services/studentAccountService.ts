/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  getDoc,
  runTransaction,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { encryptEmailForEdid, decryptEmailFromEdid } from '../utils/edidCrypto';
import { LearningState, DEFAULT_LEARNING_STATE } from '../utils/learningProgress';

export interface StudentProfile {
  uid: string;
  edid: string;
  fullName: string;
  email: string;
  college: string;
  studentDetails: string;
  authProvider: 'password' | 'google';
  visitedModules: string[];
  completedModules: string[];
  problemsSolved: number;
  scansCompleted: number;
  learningSeconds: number;
  weeklyActivity: number[];
}

export interface PendingRegistrationDetails {
  fullName: string;
  college: string;
  studentDetails: string;
}

const PENDING_REG_PREFIX = 'edraw_pending_reg_';

export function savePendingRegistration(uid: string, details: PendingRegistrationDetails): void {
  try {
    localStorage.setItem(`${PENDING_REG_PREFIX}${uid}`, JSON.stringify(details));
  } catch {}
}

export function loadPendingRegistration(uid: string): PendingRegistrationDetails | null {
  try {
    const raw = localStorage.getItem(`${PENDING_REG_PREFIX}${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as PendingRegistrationDetails;
  } catch {
    return null;
  }
}

export function clearPendingRegistration(uid: string): void {
  try {
    localStorage.removeItem(`${PENDING_REG_PREFIX}${uid}`);
  } catch {}
}

/**
 * Normalizes user input such as "edid-3574" or "EDID-3574" into "EDID-3574".
 * Returns null if input is not an EDID pattern (e.g. an email address).
 */
export function normalizeEdidInput(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  const match = trimmed.match(/^EDID-(\d{4})$/);
  return match ? `EDID-${match[1]}` : null;
}

/**
 * Generates a cryptographically uniform 4-digit EDID-XXXX (1000..9999).
 */
export function generateRandomEdid(): string {
  const arr = new Uint32Array(1);
  window.crypto.getRandomValues(arr);
  const num = 1000 + (arr[0] % 9000);
  return `EDID-${num}`;
}

function mapDocToStudentProfile(data: Record<string, any>): StudentProfile {
  return {
    uid: String(data.uid || ''),
    edid: String(data.edid || ''),
    fullName: String(data.fullName || 'Student'),
    email: String(data.email || ''),
    college: String(data.college || ''),
    studentDetails: String(data.studentDetails || ''),
    authProvider: data.authProvider === 'google' ? 'google' : 'password',
    visitedModules: Array.isArray(data.visitedModules) ? data.visitedModules : [],
    completedModules: Array.isArray(data.completedModules) ? data.completedModules : [],
    problemsSolved: typeof data.problemsSolved === 'number' ? data.problemsSolved : 0,
    scansCompleted: typeof data.scansCompleted === 'number' ? data.scansCompleted : 0,
    learningSeconds: typeof data.learningSeconds === 'number' ? data.learningSeconds : 0,
    weeklyActivity:
      Array.isArray(data.weeklyActivity) && data.weeklyActivity.length === 7
        ? data.weeklyActivity
        : [0, 0, 0, 0, 0, 0, 0],
  };
}

export async function fetchStudentProfile(uid: string): Promise<StudentProfile | null> {
  const path = `students/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'students', uid));
    if (!snap.exists()) return null;
    return mapDocToStudentProfile(snap.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/**
 * Atomically allocates a globally unique EDID-XXXX and creates the student's
 * isolated profile in Firestore inside a single transaction.
 * If the student already has a profile, returns the existing profile untouched.
 */
export async function ensureStudentAccountInFirestore(params: {
  uid: string;
  email: string;
  fullName: string;
  college?: string;
  studentDetails?: string;
  authProvider: 'password' | 'google';
  passwordForEdidLock?: string;
}): Promise<{ profile: StudentProfile; isNewlyAssigned: boolean }> {
  const {
    uid,
    email,
    fullName,
    college = '',
    studentDetails = '',
    authProvider,
    passwordForEdidLock,
  } = params;

  const cleanName = fullName.trim().slice(0, 80) || 'Student';
  const cleanEmail = email.trim().toLowerCase().slice(0, 160);
  const cleanCollege = college.trim().slice(0, 120);
  const cleanDetails = studentDetails.trim().slice(0, 120);

  let isNewlyAssigned = false;

  try {
    const profile = await runTransaction(db, async (tx) => {
      const studentRef = doc(db, 'students', uid);
      const existingSnap = await tx.get(studentRef);
      if (existingSnap.exists()) {
        return mapDocToStudentProfile(existingSnap.data());
      }

      let chosenEdid: string | null = null;
      for (let attempt = 0; attempt < 25; attempt++) {
        const candidate = generateRandomEdid();
        const edidRef = doc(db, 'edid_index', candidate);
        const edidSnap = await tx.get(edidRef);
        if (!edidSnap.exists()) {
          chosenEdid = candidate;
          break;
        }
      }

      if (!chosenEdid) {
        throw new Error('Unable to allocate a unique EDID-XXXX right now. Please try again.');
      }

      let encryptedEmail = '';
      let iv = '';
      if (authProvider === 'password' && passwordForEdidLock) {
        const encrypted = await encryptEmailForEdid(cleanEmail, passwordForEdidLock, chosenEdid);
        encryptedEmail = encrypted.encryptedEmail.slice(0, 512);
        iv = encrypted.iv.slice(0, 64);
      }

      const edidRef = doc(db, 'edid_index', chosenEdid);
      tx.set(edidRef, {
        edid: chosenEdid,
        ownerUid: uid,
        authProvider,
        encryptedEmail,
        iv,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.set(studentRef, {
        uid,
        edid: chosenEdid,
        fullName: cleanName,
        email: cleanEmail,
        college: cleanCollege,
        studentDetails: cleanDetails,
        authProvider,
        visitedModules: [],
        completedModules: [],
        problemsSolved: 0,
        scansCompleted: 0,
        learningSeconds: 0,
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      isNewlyAssigned = true;

      return {
        uid,
        edid: chosenEdid,
        fullName: cleanName,
        email: cleanEmail,
        college: cleanCollege,
        studentDetails: cleanDetails,
        authProvider,
        visitedModules: [],
        completedModules: [],
        problemsSolved: 0,
        scansCompleted: 0,
        learningSeconds: 0,
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
      };
    });

    clearPendingRegistration(uid);
    return { profile, isNewlyAssigned };
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unable to allocate')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `students/${uid}`);
  }
}

/**
 * Resolves a student's email from their EDID-XXXX without exposing plaintext PII in Firestore.
 */
export async function resolveEmailForEdidSignIn(
  edid: string,
  password: string
): Promise<string> {
  const path = `edid_index/${edid}`;
  let snap;
  try {
    snap = await getDoc(doc(db, 'edid_index', edid));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  if (!snap.exists()) {
    throw new Error(`No registered student found with ${edid}. Please verify your eDraw ID.`);
  }

  const data = snap.data();
  if (data.authProvider === 'google') {
    throw new Error(
      `${edid} is linked to a Google Sign-In account. Please use "Continue with Google" below.`
    );
  }

  if (!data.encryptedEmail || !data.iv) {
    throw new Error(
      `${edid} has not completed initial email sign-in sync. Please sign in once using your registered email address and password.`
    );
  }

  const decrypted = await decryptEmailFromEdid(
    String(data.encryptedEmail),
    String(data.iv),
    password,
    edid
  );

  if (!decrypted) {
    throw new Error('Invalid eDraw ID or password.');
  }

  return decrypted;
}

/**
 * Ensures /edid_index/{edid} holds up-to-date password-encrypted email ciphertext
 * whenever a user signs in with email + password (e.g. after email verification or password reset).
 */
export async function syncEdidEncryptedEmail(
  edid: string,
  email: string,
  password: string
): Promise<void> {
  if (!edid || !email || !password) return;
  const path = `edid_index/${edid}`;
  try {
    const ref = doc(db, 'edid_index', edid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.authProvider !== 'password') return;

    const existingPlain = data.encryptedEmail && data.iv
      ? await decryptEmailFromEdid(String(data.encryptedEmail), String(data.iv), password, edid)
      : null;

    if (existingPlain === email.trim().toLowerCase()) {
      return;
    }

    const { encryptedEmail, iv } = await encryptEmailForEdid(email, password, edid);
    await updateDoc(ref, {
      encryptedEmail: encryptedEmail.slice(0, 512),
      iv: iv.slice(0, 64),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateStudentProfileDetails(
  uid: string,
  updates: { fullName: string; college: string; studentDetails: string }
): Promise<void> {
  const path = `students/${uid}`;
  try {
    await updateDoc(doc(db, 'students', uid), {
      fullName: updates.fullName.trim().slice(0, 80) || 'Student',
      college: updates.college.trim().slice(0, 120),
      studentDetails: updates.studentDetails.trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function syncLearningProgressToFirestore(
  uid: string,
  state: LearningState
): Promise<void> {
  const path = `students/${uid}`;
  try {
    const safeWeekly =
      Array.isArray(state.weeklyActivity) && state.weeklyActivity.length === 7
        ? state.weeklyActivity.map((n) => Math.max(0, Math.min(100000, Math.round(Number(n) || 0))))
        : [...DEFAULT_LEARNING_STATE.weeklyActivity];

    await updateDoc(doc(db, 'students', uid), {
      visitedModules: (state.visitedModules || []).slice(0, 10).map((s) => String(s).slice(0, 40)),
      completedModules: (state.completedModules || []).slice(0, 10).map((s) => String(s).slice(0, 40)),
      problemsSolved: Math.max(0, Math.min(1000000, Math.round(state.problemsSolved || 0))),
      scansCompleted: Math.max(0, Math.min(1000000, Math.round(state.scansCompleted || 0))),
      learningSeconds: Math.max(0, Math.min(100000000, Math.round(state.learningSeconds || 0))),
      weeklyActivity: safeWeekly,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function studentProfileToLearningState(profile: StudentProfile): LearningState {
  return {
    studentName: profile.fullName,
    visitedModules: profile.visitedModules,
    completedModules: profile.completedModules,
    problemsSolved: profile.problemsSolved,
    scansCompleted: profile.scansCompleted,
    learningSeconds: profile.learningSeconds,
    weeklyActivity: profile.weeklyActivity,
    lastUpdated: new Date().toISOString(),
  };
}
