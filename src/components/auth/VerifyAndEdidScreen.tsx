/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MailCheck,
  RefreshCw,
  ArrowRight,
  Copy,
  Check,
  LogOut,
  AlertCircle,
  Loader2,
  IdCard,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const VerifyEmailCard: React.FC = () => {
  const {
    firebaseUser,
    checkEmailVerificationAndActivate,
    resendVerificationEmail,
    signOutStudent,
  } = useAuth();

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckVerified = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setIsChecking(true);
    try {
      const verified = await checkEmailVerificationAndActivate();
      if (!verified) {
        setErrorMsg(
          'Your email is not verified yet. Please click the verification link in your inbox (check spam if needed), then click this button again.'
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to verify email status.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setIsResending(true);
    try {
      await resendVerificationEmail();
      setStatusMsg('A fresh verification link has been sent to your email address.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="w-12 h-12 rounded-2xl bg-[#F1EBFF] dark:bg-purple-950/60 text-[#7138E8] dark:text-purple-300 flex items-center justify-center">
        <MailCheck className="w-6 h-6" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#202044] dark:text-slate-100 tracking-tight">
          Verify Your Email Address
        </h2>
        <p className="text-sm text-[#77758F] dark:text-slate-400 mt-1.5 leading-relaxed">
          We sent a verification link to{' '}
          <span className="font-semibold text-[#202044] dark:text-slate-200">
            {firebaseUser?.email}
          </span>
          . Verify your email once to generate your unique{' '}
          <span className="font-mono font-semibold text-[#7138E8] dark:text-purple-300">
            EDID-XXXX
          </span>{' '}
          identifier.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div
          role="status"
          className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300"
        >
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{statusMsg}</span>
        </div>
      )}

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleCheckVerified}
          disabled={isChecking}
          className="w-full h-11 rounded-xl bg-[#7138E8] hover:bg-[#5E28D1] disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying &amp; Generating EDID...</span>
            </>
          ) : (
            <>
              <span>I&apos;ve Verified My Email — Get eDraw ID</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="w-full h-10 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 hover:bg-[#F1EBFF] dark:hover:bg-slate-800 border border-[#E5DFF5] dark:border-slate-700 text-xs font-semibold text-[#202044] dark:text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isResending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>Resend Verification Email</span>
        </button>
      </div>

      <div className="pt-4 border-t border-[#F0ECF9] dark:border-slate-800 flex justify-center">
        <button
          type="button"
          onClick={signOutStudent}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#77758F] hover:text-[#202044] dark:hover:text-slate-200 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out and return to Sign In</span>
        </button>
      </div>
    </div>
  );
};

export const IssuedEdidWelcomeCard: React.FC = () => {
  const { newlyIssuedProfile, dismissNewlyIssuedProfile, updateStudentDetails } = useAuth();
  const [copied, setCopied] = useState(false);
  const [college, setCollege] = useState(newlyIssuedProfile?.college || '');
  const [studentDetails, setStudentDetails] = useState(newlyIssuedProfile?.studentDetails || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!newlyIssuedProfile) return null;

  const needsAcademicDetails =
    !newlyIssuedProfile.college && !newlyIssuedProfile.studentDetails;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(newlyIssuedProfile.edid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (college.trim() && college.trim() !== newlyIssuedProfile.college) ||
      (studentDetails.trim() && studentDetails.trim() !== newlyIssuedProfile.studentDetails)
    ) {
      setIsSaving(true);
      try {
        await updateStudentDetails({
          fullName: newlyIssuedProfile.fullName,
          college: college.trim(),
          studentDetails: studentDetails.trim(),
        });
      } finally {
        setIsSaving(false);
      }
    }
    dismissNewlyIssuedProfile();
  };

  return (
    <form onSubmit={handleContinue} className="space-y-5">
      <div className="w-12 h-12 rounded-2xl bg-[#F1EBFF] dark:bg-purple-950/60 text-[#7138E8] dark:text-purple-300 flex items-center justify-center">
        <IdCard className="w-6 h-6" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#202044] dark:text-slate-100 tracking-tight">
          Your eDraw ID is Ready
        </h2>
        <p className="text-sm text-[#77758F] dark:text-slate-400 mt-1.5 leading-relaxed">
          Save this unique student identifier. You can sign in anytime using either{' '}
          <span className="font-mono font-semibold text-[#7138E8] dark:text-purple-300">
            {newlyIssuedProfile.edid}
          </span>{' '}
          or{' '}
          <span className="font-medium text-[#202044] dark:text-slate-200">
            {newlyIssuedProfile.email}
          </span>
          .
        </p>
      </div>

      {/* Prominent EDID-XXXX Card */}
      <div className="rounded-2xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-800 p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium text-[#77758F] dark:text-slate-400">
            Unique Student eDraw ID
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#7138E8] dark:text-purple-300 mt-0.5">
            {newlyIssuedProfile.edid}
          </div>
          <div className="text-xs text-[#77758F] dark:text-slate-400 mt-1">
            {newlyIssuedProfile.fullName} · {newlyIssuedProfile.email}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#E5DFF5] dark:border-slate-700 text-xs font-semibold text-[#202044] dark:text-slate-200 hover:bg-[#F1EBFF] dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy ID</span>
            </>
          )}
        </button>
      </div>

      {needsAcademicDetails && (
        <div className="space-y-3 pt-1">
          <div className="text-xs font-medium text-[#77758F] dark:text-slate-400">
            Optional: Add your academic details before entering the studio
          </div>
          <div className="relative">
            <Building2 className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              maxLength={120}
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="College / Institution (optional)"
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] focus:outline-none focus:border-[#7138E8]"
            />
          </div>
          <div className="relative">
            <GraduationCap className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              maxLength={120}
              value={studentDetails}
              onChange={(e) => setStudentDetails(e.target.value)}
              placeholder="Department / Roll No. (optional)"
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] focus:outline-none focus:border-[#7138E8]"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full h-11 rounded-xl bg-[#7138E8] hover:bg-[#5E28D1] disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <span>Enter Studio Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
