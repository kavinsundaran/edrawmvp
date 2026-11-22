/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  StudentProfile,
  PendingRegistrationDetails,
  fetchStudentProfile,
  ensureStudentAccountInFirestore,
  normalizeEdidInput,
  resolveEmailForEdidSignIn,
  syncEdidEncryptedEmail,
  savePendingRegistration,
  loadPendingRegistration,
  updateStudentProfileDetails,
} from '../services/studentAccountService';

interface RegisterPayload {
  fullName: string;
  email: string;
  college: string;
  studentDetails: string;
  password: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  studentProfile: StudentProfile | null;
  isAuthReady: boolean;
  needsEmailVerification: boolean;
  newlyIssuedProfile: StudentProfile | null;
  dismissNewlyIssuedProfile: () => void;
  signInWithEmailOrEdid: (identifier: string, password: string) => Promise<void>;
  registerWithEmail: (payload: RegisterPayload) => Promise<void>;
  signInWithGoogle: (optionalDetails?: Partial<PendingRegistrationDetails>) => Promise<void>;
  checkEmailVerificationAndActivate: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  signOutStudent: () => Promise<void>;
  updateStudentDetails: (updates: {
    fullName: string;
    college: string;
    studentDetails: string;
  }) => Promise<void>;
  refreshStudentProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function formatFirebaseAuthError(err: unknown): string {
  const code = (err as any)?.code || '';
  const msg = err instanceof Error ? err.message : String(err || '');

  if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
    return 'Email/Password sign-in is not enabled in Firebase Console yet. Enable Email/Password under Authentication → Sign-in method, or use Continue with Google.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in with your email or CAPYID-XXXX.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Invalid email, CAPYID, or password. If you registered with Google, click "Continue with Google" below.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address or CAPYID-XXXX.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Use at least 8 characters with letters and numbers.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in popup was closed before completing.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Sign-in popup was blocked by your browser. Please allow popups and try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts detected. Please wait a moment and try again.';
  }
  if (msg.startsWith('{') && msg.includes('operationType')) {
    return 'Database access error. Please ensure your email is verified and try again.';
  }
  return msg || 'Authentication failed. Please try again.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState<boolean>(false);
  const [newlyIssuedProfile, setNewlyIssuedProfile] = useState<StudentProfile | null>(null);

  const pendingPasswordRef = useRef<string | null>(null);
  const pendingGoogleDetailsRef = useRef<Partial<PendingRegistrationDetails> | null>(null);
  const isRegisteringRef = useRef<boolean>(false);

  const hydrateVerifiedUser = useCallback(async (user: User) => {
    const existing = await fetchStudentProfile(user.uid);
    if (existing) {
      if (pendingPasswordRef.current && user.email) {
        await syncEdidEncryptedEmail(existing.edid, user.email, pendingPasswordRef.current).catch(
          () => {}
        );
        pendingPasswordRef.current = null;
      }
      setStudentProfile(existing);
      setNeedsEmailVerification(false);
      return;
    }

    const savedPending = loadPendingRegistration(user.uid);
    const googlePending = pendingGoogleDetailsRef.current;
    pendingGoogleDetailsRef.current = null;

    const isGoogle = user.providerData.some((p) => p.providerId === 'google.com');
    const fallbackName =
      savedPending?.fullName ||
      googlePending?.fullName ||
      user.displayName ||
      (user.email ? user.email.split('@')[0] : 'Student');

    const { profile, isNewlyAssigned } = await ensureStudentAccountInFirestore({
      uid: user.uid,
      email: user.email || '',
      fullName: fallbackName,
      college: savedPending?.college || googlePending?.college || '',
      studentDetails: savedPending?.studentDetails || googlePending?.studentDetails || '',
      authProvider: isGoogle ? 'google' : 'password',
      passwordForEdidLock: pendingPasswordRef.current || undefined,
    });

    pendingPasswordRef.current = null;
    setStudentProfile(profile);
    setNeedsEmailVerification(false);
    if (isNewlyAssigned) {
      setNewlyIssuedProfile(profile);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isRegisteringRef.current) {
        return;
      }

      if (!user) {
        setFirebaseUser(null);
        setStudentProfile(null);
        setNeedsEmailVerification(false);
        setNewlyIssuedProfile(null);
        setIsAuthReady(true);
        return;
      }

      setFirebaseUser(user);

      if (!user.emailVerified) {
        setStudentProfile(null);
        setNeedsEmailVerification(true);
        setIsAuthReady(true);
        return;
      }

      try {
        await hydrateVerifiedUser(user);
      } catch (err) {
        console.error('Error hydrating verified user:', err);
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [hydrateVerifiedUser]);

  const signInWithEmailOrEdid = useCallback(async (identifier: string, password: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      throw new Error('Please enter your registered email address or CAPYID.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    let emailToUse = trimmed;
    const edid = normalizeEdidInput(trimmed);
    if (edid) {
      emailToUse = await resolveEmailForEdidSignIn(edid, password);
    } else if (!trimmed.includes('@')) {
      throw new Error('Enter a valid email address or a CAPYID formatted as CAPYID-XXXX.');
    }

    pendingPasswordRef.current = password;
    try {
      const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
      if (!cred.user.emailVerified) {
        setFirebaseUser(cred.user);
        setNeedsEmailVerification(true);
      }
    } catch (err) {
      pendingPasswordRef.current = null;
      throw new Error(formatFirebaseAuthError(err));
    }
  }, []);

  const registerWithEmail = useCallback(async (payload: RegisterPayload) => {
    const cleanName = payload.fullName.trim();
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanCollege = payload.college.trim();
    const cleanDetails = payload.studentDetails.trim();

    if (!cleanName) throw new Error('Please enter your full name.');
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (payload.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!/[A-Za-z]/.test(payload.password) || !/[0-9]/.test(payload.password)) {
      throw new Error('Password must include both letters and numbers.');
    }

    isRegisteringRef.current = true;
    pendingPasswordRef.current = payload.password;

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, payload.password);
      await updateProfile(cred.user, { displayName: cleanName });
      savePendingRegistration(cred.user.uid, {
        fullName: cleanName,
        college: cleanCollege,
        studentDetails: cleanDetails,
      });

      if (!cred.user.emailVerified) {
        await sendEmailVerification(cred.user);
        setFirebaseUser(cred.user);
        setStudentProfile(null);
        setNeedsEmailVerification(true);
      } else {
        setFirebaseUser(cred.user);
        await hydrateVerifiedUser(cred.user);
      }
    } catch (err) {
      pendingPasswordRef.current = null;
      throw new Error(formatFirebaseAuthError(err));
    } finally {
      isRegisteringRef.current = false;
    }
  }, [hydrateVerifiedUser]);

  const signInWithGoogle = useCallback(
    async (optionalDetails?: Partial<PendingRegistrationDetails>) => {
      pendingGoogleDetailsRef.current = optionalDetails || null;
      try {
        const cred = await signInWithPopup(auth, googleProvider);
        if (cred.user && cred.user.emailVerified) {
          await hydrateVerifiedUser(cred.user);
        }
      } catch (err) {
        pendingGoogleDetailsRef.current = null;
        throw new Error(formatFirebaseAuthError(err));
      }
    },
    [hydrateVerifiedUser]
  );

  const checkEmailVerificationAndActivate = useCallback(async (): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;
    await user.reload();
    await user.getIdToken(true);
    const refreshed = auth.currentUser;
    if (refreshed && refreshed.emailVerified) {
      setFirebaseUser(refreshed);
      await hydrateVerifiedUser(refreshed);
      return true;
    }
    return false;
  }, [hydrateVerifiedUser]);

  const resendVerificationEmail = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No active registration session found.');
    try {
      await sendEmailVerification(user);
    } catch (err) {
      throw new Error(formatFirebaseAuthError(err));
    }
  }, []);

  const signOutStudent = useCallback(async () => {
    pendingPasswordRef.current = null;
    pendingGoogleDetailsRef.current = null;
    await signOut(auth);
    setFirebaseUser(null);
    setStudentProfile(null);
    setNeedsEmailVerification(false);
    setNewlyIssuedProfile(null);
  }, []);

  const updateStudentDetails = useCallback(
    async (updates: { fullName: string; college: string; studentDetails: string }) => {
      if (!firebaseUser) return;
      await updateStudentProfileDetails(firebaseUser.uid, updates);
      setStudentProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: updates.fullName.trim().slice(0, 80) || prev.fullName,
              college: updates.college.trim().slice(0, 120),
              studentDetails: updates.studentDetails.trim().slice(0, 120),
            }
          : prev
      );
    },
    [firebaseUser]
  );

  const refreshStudentProfile = useCallback(async () => {
    if (!firebaseUser) return;
    const latest = await fetchStudentProfile(firebaseUser.uid);
    if (latest) setStudentProfile(latest);
  }, [firebaseUser]);

  const dismissNewlyIssuedProfile = useCallback(() => {
    setNewlyIssuedProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        studentProfile,
        isAuthReady,
        needsEmailVerification,
        newlyIssuedProfile,
        dismissNewlyIssuedProfile,
        signInWithEmailOrEdid,
        registerWithEmail,
        signInWithGoogle,
        checkEmailVerificationAndActivate,
        resendVerificationEmail,
        signOutStudent,
        updateStudentDetails,
        refreshStudentProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
