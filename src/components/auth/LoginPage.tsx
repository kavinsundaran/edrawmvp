/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth, formatFirebaseAuthError } from '../../contexts/AuthContext';
import { normalizeEdidInput } from '../../services/studentAccountService';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const GoogleLogoSvg: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { signInWithEmailOrEdid, signInWithGoogle, redirectError, clearRedirectError } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const detectedEdid = normalizeEdidInput(identifier);
  const activeError = errorMsg || redirectError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    clearRedirectError();
    setResetMessage(null);
    setIsSubmitting(true);
    try {
      await signInWithEmailOrEdid(identifier, password);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    clearRedirectError();
    setResetMessage(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setResetMessage(null);
    const trimmed = identifier.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg(
        'To reset your password, enter your registered email address in the field above first.'
      );
      return;
    }
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setResetMessage(`Password reset email sent to ${trimmed}. Check your inbox.`);
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#202044] dark:text-slate-100 tracking-tight">
          Student Sign In
        </h2>
        <p className="text-sm text-[#77758F] dark:text-slate-400 mt-1.5 leading-relaxed">
          Sign in with your registered email address or CAPYID to open your dashboard.
        </p>
      </div>

      {activeError && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{activeError}</span>
        </div>
      )}

      {resetMessage && (
        <div
          role="status"
          className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{resetMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email or EDID-XXXX */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="signin-identifier"
              className="text-xs font-semibold text-[#202044] dark:text-slate-200"
            >
              Registered Email or CAPYID
            </label>
            {detectedEdid && (
              <span className="text-[11px] font-mono font-semibold text-[#7138E8] dark:text-purple-300 tabular-nums">
                {detectedEdid}
              </span>
            )}
          </div>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="signin-identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="student@college.edu or CAPYID-1000"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/20 transition-all"
              required
            />
          </div>
          <p className="text-[11px] text-[#77758F] dark:text-slate-400 mt-1.5">
            Enter your registered email address or CAPYID-XXXX
          </p>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="signin-password"
              className="text-xs font-semibold text-[#202044] dark:text-slate-200"
            >
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[11px] font-medium text-[#7138E8] dark:text-purple-300 hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/20 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#77758F] hover:text-[#202044] dark:hover:text-slate-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          className="w-full h-11 rounded-xl bg-[#7138E8] hover:bg-[#5E28D1] disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_24px_-8px_rgba(113,56,232,0.55)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#ECE8F8] dark:bg-slate-800" />
        <span className="text-xs text-[#77758F] dark:text-slate-400">or</span>
        <div className="h-px flex-1 bg-[#ECE8F8] dark:bg-slate-800" />
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting || isGoogleLoading}
        className="w-full h-11 rounded-xl bg-white dark:bg-slate-950 hover:bg-[#F8F7FC] dark:hover:bg-slate-800 border border-[#E5DFF5] dark:border-slate-700 text-sm font-semibold text-[#202044] dark:text-slate-100 transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#7138E8]" />
        ) : (
          <GoogleLogoSvg />
        )}
        <span>Continue with Google</span>
      </button>

      {/* Register Link */}
      <div className="mt-6 pt-5 border-t border-[#F0ECF9] dark:border-slate-800 text-center space-y-1.5">
        <p className="text-xs text-[#77758F] dark:text-slate-400">
          New to Capybara and need a CAPYID?
        </p>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7138E8] dark:text-purple-300 hover:underline cursor-pointer"
        >
          <span>Register as a New Student</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
