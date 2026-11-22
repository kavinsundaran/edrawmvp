/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Palette,
  Sun,
  Moon,
  RotateCcw,
  Check,
  Copy,
  LogOut,
  IdCard,
} from 'lucide-react';
import { HP_COLOR_PRESETS, VP_COLOR_PRESETS } from '../PlaneColorPicker';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentEdid?: string;
  studentEmail?: string;
  studentCollege?: string;
  studentDetails?: string;
  onChangeStudentName: (name: string) => void;
  onSaveStudentProfile?: (updates: {
    fullName: string;
    college: string;
    studentDetails: string;
  }) => Promise<void>;
  onSignOut?: () => void;
  hpColor: string;
  vpColor: string;
  onChangeHpColor: (color: string) => void;
  onChangeVpColor: (color: string) => void;
  onResetColors: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onResetProgress: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  studentName,
  studentEdid,
  studentEmail,
  studentCollege = '',
  studentDetails = '',
  onChangeStudentName,
  onSaveStudentProfile,
  onSignOut,
  hpColor,
  vpColor,
  onChangeHpColor,
  onChangeVpColor,
  onResetColors,
  isDark,
  onToggleTheme,
  onResetProgress,
}) => {
  const [draftName, setDraftName] = useState(studentName);
  const [draftCollege, setDraftCollege] = useState(studentCollege);
  const [draftDetails, setDraftDetails] = useState(studentDetails);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedEdid, setCopiedEdid] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setDraftName(studentName);
    setDraftCollege(studentCollege);
    setDraftDetails(studentDetails);
  }, [studentName, studentCollege, studentDetails, isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    const cleanedName = draftName.trim() || 'Student';
    setIsSavingProfile(true);
    try {
      onChangeStudentName(cleanedName);
      if (onSaveStudentProfile) {
        await onSaveStudentProfile({
          fullName: cleanedName,
          college: draftCollege.trim(),
          studentDetails: draftDetails.trim(),
        });
      }
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1500);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCopyEdid = async () => {
    if (!studentEdid) return;
    try {
      await navigator.clipboard.writeText(studentEdid);
      setCopiedEdid(true);
      setTimeout(() => setCopiedEdid(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202033]/50 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-[#ECE8F8] dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0ECF9] dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-[#202033] dark:text-slate-100">
              Workspace Settings
            </h2>
            <p className="text-xs text-[#77758A] dark:text-slate-400">
              Customize your profile, drafting plane colors, and canvas theme
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#77758A] hover:text-[#202033] dark:hover:text-slate-100 hover:bg-[#F2EDFF] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Student ID Banner */}
          {studentEdid && (
            <div className="rounded-2xl bg-[#F8F7FC] dark:bg-slate-950 border border-[#E5DFF5] dark:border-slate-800 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#F1EBFF] dark:bg-purple-950/60 text-[#7138E8] dark:text-purple-300 flex items-center justify-center shrink-0">
                  <IdCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono tabular-nums text-[#7138E8] dark:text-purple-300">
                    {studentEdid}
                  </div>
                  {studentEmail && (
                    <div className="text-xs text-[#77758A] dark:text-slate-400 truncate">
                      {studentEmail}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyEdid}
                className="h-8 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#E5DFF5] dark:border-slate-700 text-xs font-semibold text-[#202033] dark:text-slate-200 hover:bg-[#F1EBFF] dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedEdid ? (
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
          )}

          {/* Student Profile */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#202033] dark:text-slate-200 flex items-center gap-2">
              <User className="w-4 h-4 text-[#7952D6]" />
              <span>Student Profile</span>
            </label>
            <div className="space-y-2.5">
              <input
                type="text"
                maxLength={80}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Full Name"
                className="w-full h-10 px-3.5 rounded-xl border border-[#E5DFF5] dark:border-slate-700 bg-[#F8F7FC] dark:bg-slate-950 text-sm text-[#202033] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#7952D6]/30 focus:border-[#7952D6]"
              />
              <input
                type="text"
                maxLength={120}
                value={draftCollege}
                onChange={(e) => setDraftCollege(e.target.value)}
                placeholder="College / Institution"
                className="w-full h-10 px-3.5 rounded-xl border border-[#E5DFF5] dark:border-slate-700 bg-[#F8F7FC] dark:bg-slate-950 text-sm text-[#202033] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#7952D6]/30 focus:border-[#7952D6]"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={120}
                  value={draftDetails}
                  onChange={(e) => setDraftDetails(e.target.value)}
                  placeholder="Department / Roll No."
                  className="flex-1 h-10 px-3.5 rounded-xl border border-[#E5DFF5] dark:border-slate-700 bg-[#F8F7FC] dark:bg-slate-950 text-sm text-[#202033] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#7952D6]/30 focus:border-[#7952D6]"
                />
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={handleSaveProfile}
                  className="h-10 px-4 rounded-xl bg-[#7952D6] hover:bg-[#6035B5] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  {savedNotice ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Theme */}
          <div className="flex items-center justify-between pt-4 border-t border-[#F0ECF9] dark:border-slate-800">
            <div>
              <div className="text-xs font-semibold text-[#202033] dark:text-slate-200">
                Workspace Theme
              </div>
              <p className="text-xs text-[#77758A] dark:text-slate-400">
                Switch between Light Studio and CAD Dark canvas
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3.5 py-2 rounded-xl bg-[#F2EDFF] dark:bg-slate-800 text-[#6035B5] dark:text-purple-300 text-xs font-semibold flex items-center gap-2 hover:bg-[#E7DDFD] dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? 'CAD Dark' : 'Light Studio'}</span>
            </button>
          </div>

          {/* Plane Colors */}
          <div className="space-y-4 pt-4 border-t border-[#F0ECF9] dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#202033] dark:text-slate-200">
                <Palette className="w-4 h-4 text-[#7952D6]" />
                <span>Reference Plane Colors (HP &amp; VP)</span>
              </div>
              <button
                type="button"
                onClick={onResetColors}
                className="text-xs text-[#77758A] hover:text-[#6035B5] dark:hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#77758A] dark:text-slate-400">Horizontal Plane (HP)</span>
                  <span className="font-mono text-[11px] text-[#202033] dark:text-slate-200 uppercase">
                    {hpColor}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {HP_COLOR_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => onChangeHpColor(p.value)}
                      className={`h-7 rounded-lg flex items-center justify-center cursor-pointer ${
                        hpColor.toLowerCase() === p.value.toLowerCase()
                          ? 'ring-2 ring-[#7952D6] ring-offset-2 dark:ring-offset-slate-900'
                          : ''
                      }`}
                      style={{ backgroundColor: p.value }}
                      title={p.label}
                    >
                      {hpColor.toLowerCase() === p.value.toLowerCase() && (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#77758A] dark:text-slate-400">Vertical Plane (VP)</span>
                  <span className="font-mono text-[11px] text-[#202033] dark:text-slate-200 uppercase">
                    {vpColor}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {VP_COLOR_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => onChangeVpColor(p.value)}
                      className={`h-7 rounded-lg flex items-center justify-center cursor-pointer ${
                        vpColor.toLowerCase() === p.value.toLowerCase()
                          ? 'ring-2 ring-[#7952D6] ring-offset-2 dark:ring-offset-slate-900'
                          : ''
                      }`}
                      style={{ backgroundColor: p.value }}
                      title={p.label}
                    >
                      {vpColor.toLowerCase() === p.value.toLowerCase() && (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Learning Progress Reset */}
          <div className="flex items-center justify-between pt-4 border-t border-[#F0ECF9] dark:border-slate-800">
            <div>
              <div className="text-xs font-semibold text-[#202033] dark:text-slate-200">
                Session Learning Log
              </div>
              <p className="text-xs text-[#77758A] dark:text-slate-400">
                Clear locally tracked problem counts and module progress
              </p>
            </div>
            <button
              type="button"
              onClick={onResetProgress}
              className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset Log
            </button>
          </div>

          {/* Sign Out */}
          {onSignOut && (
            <div className="flex items-center justify-between pt-4 border-t border-[#F0ECF9] dark:border-slate-800">
              <div>
                <div className="text-xs font-semibold text-[#202033] dark:text-slate-200">
                  Student Session
                </div>
                <p className="text-xs text-[#77758A] dark:text-slate-400">
                  Sign out to switch accounts or sign in with another CAPYID
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#F2EDFF] dark:bg-slate-800 text-[#6035B5] dark:text-purple-300 hover:bg-[#E7DDFD] dark:hover:bg-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
