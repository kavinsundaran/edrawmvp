/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  Mail,
  Building2,
  GraduationCap,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleLogoSvg } from './LoginPage';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { registerWithEmail, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [studentDetails, setStudentDetails] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMsg('Password must be at least 8 characters and include both letters and numbers.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter the same password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerWithEmail({
        fullName,
        email,
        college,
        studentDetails,
        password,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setErrorMsg(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle({
        fullName: fullName.trim() || undefined,
        college: college.trim() || undefined,
        studentDetails: studentDetails.trim() || undefined,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google registration failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-[#202044] dark:text-slate-100 tracking-tight">
          Register Student
        </h2>
        <p className="text-sm text-[#77758F] dark:text-slate-400 mt-1.5 leading-relaxed">
          Register your email once to save your account immediately and receive your unique{' '}
          <span className="font-semibold text-[#7138E8] dark:text-purple-300 font-mono">
            EDID-XXXX
          </span>{' '}
          student identifier.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Full Name */}
        <div>
          <label
            htmlFor="reg-fullname"
            className="block text-xs font-semibold text-[#202044] dark:text-slate-200 mb-1"
          >
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reg-fullname"
              type="text"
              maxLength={80}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Arjun Menon"
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/20 transition-all"
              required
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label
            htmlFor="reg-email"
            className="block text-xs font-semibold text-[#202044] dark:text-slate-200 mb-1"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reg-email"
              type="email"
              maxLength={160}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@college.edu or name@gmail.com"
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/20 transition-all"
              required
            />
          </div>
        </div>

        {/* College / Institution */}
        <div>
          <label
            htmlFor="reg-college"
            className="block text-xs font-semibold text-[#202044] dark:text-slate-200 mb-1"
          >
            College / Institution
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reg-college"
              type="text"
              maxLength={120}
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="e.g. Madras Institute of Technology"
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/20 transition-all"
            />
          </div>
        </div>

        {/* Student Details */}
        <div>
          <label
            htmlFor="reg-details"
            className="block text-xs font-semibold text-[#202044] dark:text-slate-200 mb-1"
          >
            Student Details <span className="font-normal text-[#77758F] dark:text-slate-400">(Department / Roll No.)</span>
          </label>
          <div className="relative">
            <GraduationCap className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reg-details"
              type="text"
              maxLength={120}
              value={studentDetails}
              onChange={(e) => setStudentDetails(e.target.value)}
              placeholder="e.g. Mechanical Engineering · Roll 24ME108"
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/20 transition-all"
            />
          </div>
        </div>

        {/* Set Password */}
        <div>
          <label
            htmlFor="reg-password"
            className="block text-xs font-semibold text-[#202044] dark:text-slate-200 mb-1"
          >
            Set Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters with letters & numbers"
              className="w-full h-10 pl-10 pr-11 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/20 transition-all"
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

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="reg-confirm-password"
            className="block text-xs font-semibold text-[#202044] dark:text-slate-200 mb-1"
          >
            Confirm Password
          </label>
          <div className="relative">
            <ShieldCheck className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reg-confirm-password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full h-10 pl-10 pr-11 rounded-xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-700 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#9693AA] dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/20 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#77758F] hover:text-[#202044] dark:hover:text-slate-200 cursor-pointer"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          className="w-full h-11 mt-1 rounded-xl bg-[#7138E8] hover:bg-[#5E28D1] disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_24px_-8px_rgba(113,56,232,0.55)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Student Account...</span>
            </>
          ) : (
            <>
              <span>Register &amp; Get eDraw ID</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#ECE8F8] dark:bg-slate-800" />
        <span className="text-xs text-[#77758F] dark:text-slate-400">or register with Google</span>
        <div className="h-px flex-1 bg-[#ECE8F8] dark:bg-slate-800" />
      </div>

      {/* Google Registration */}
      <button
        type="button"
        onClick={handleGoogleRegister}
        disabled={isSubmitting || isGoogleLoading}
        className="w-full h-10 rounded-xl bg-white dark:bg-slate-950 hover:bg-[#F8F7FC] dark:hover:bg-slate-800 border border-[#E5DFF5] dark:border-slate-700 text-sm font-semibold text-[#202044] dark:text-slate-100 transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#7138E8]" />
        ) : (
          <GoogleLogoSvg />
        )}
        <span>Continue with Google</span>
      </button>

      {/* Sign In Switch */}
      <div className="mt-5 pt-4 border-t border-[#F0ECF9] dark:border-slate-800 text-center">
        <span className="text-xs text-[#77758F] dark:text-slate-400">
          Already have an eDraw ID?{' '}
        </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-xs font-semibold text-[#7138E8] dark:text-purple-300 hover:underline cursor-pointer"
        >
          Sign In →
        </button>
      </div>
    </div>
  );
};
