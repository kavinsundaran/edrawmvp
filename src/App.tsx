/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppRoute } from './types/modules';
import { AppHeader } from './components/navigation/AppHeader';
import { AppSidebar, SidebarSectionId } from './components/navigation/AppSidebar';
import { SettingsModal } from './components/navigation/SettingsModal';
import { DashboardView } from './components/navigation/DashboardView';
import { PointsModule } from './modules/points/PointsModule';
import { LinesModule } from './modules/lines/LinesModule';
import { QuestionToGraphicsGenerator } from './components/questionGenerator/QuestionToGraphicsGenerator';
import { FeedbackCommunityView } from './components/feedback/FeedbackCommunityView';
import { ScanQuestionModal } from './components/ScanQuestionModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthLayout } from './components/auth/AuthLayout';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import {
  VerifyEmailCard,
  IssuedEdidWelcomeCard,
} from './components/auth/VerifyAndEdidScreen';
import {
  studentProfileToLearningState,
  syncLearningProgressToFirestore,
} from './services/studentAccountService';
import {
  LearningState,
  DEFAULT_LEARNING_STATE,
  saveLearningState,
  getTodayWeekdayIndex,
} from './utils/learningProgress';

/**
 * Resilient route resolution supporting:
 * - Direct paths: /projection-of-points, /projection-of-lines, /dashboard, /
 * - Hash routes: #points, #lines, #projection-of-points, #projection-of-lines, #dashboard
 * - Sandboxed iframes without pushState permissions
 */
export const resolveRoute = (input?: string): AppRoute => {
  const target = (
    input ||
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.hash}`
      : '')
  ).toLowerCase();

  if (target.includes('feedback') || target.includes('community')) {
    return '/feedback-community';
  }
  if (target.includes('generator') || target.includes('question') || target.includes('ai')) {
    return '/question-generator';
  }
  if (target.includes('line')) return '/projection-of-lines';
  if (target.includes('point')) return '/projection-of-points';
  return '/dashboard';
};

const AppShell: React.FC = () => {
  const {
    firebaseUser,
    studentProfile,
    isAuthReady,
    needsEmailVerification,
    newlyIssuedProfile,
    signOutStudent,
    updateStudentDetails,
  } = useAuth();

  // Auth screen toggle ('login' | 'register')
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() => {
    if (typeof window !== 'undefined') {
      const target = `${window.location.pathname}${window.location.hash}`.toLowerCase();
      if (target.includes('register') || target.includes('signup')) {
        return 'register';
      }
    }
    return 'login';
  });

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isGlobalScanOpen, setIsGlobalScanOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('edraw_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('edraw_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Plane Colors state (HP & VP) shared across all modules
  const [hpColor, setHpColor] = useState<string>('#2563eb');
  const [vpColor, setVpColor] = useState<string>('#dc2626');

  const handleResetColors = () => {
    setHpColor('#2563eb');
    setVpColor('#dc2626');
  };

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => resolveRoute());
  const [dashboardAnchor, setDashboardAnchor] = useState<'dashboard' | 'roadmap' | 'progress'>('dashboard');

  // Strict per-student isolated learning state hydrated from Firestore studentProfile
  const [learningState, setLearningState] = useState<LearningState>(DEFAULT_LEARNING_STATE);
  const syncTimerRef = useRef<number | null>(null);
  const activeUid = studentProfile?.uid || null;

  useEffect(() => {
    if (!studentProfile) {
      setLearningState(DEFAULT_LEARNING_STATE);
      return;
    }
    const hydrated = studentProfileToLearningState(studentProfile);
    saveLearningState(hydrated, studentProfile.uid);
    setLearningState(hydrated);
  }, [studentProfile?.uid]);

  const scheduleFirestoreSync = useCallback((uid: string, nextState: LearningState) => {
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = window.setTimeout(() => {
      syncLearningProgressToFirestore(uid, nextState).catch((err) => {
        console.error('Failed to sync learning progress:', err);
      });
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const updateLearning = useCallback(
    (updater: (prev: LearningState) => LearningState) => {
      setLearningState((prev) => {
        const next = saveLearningState(updater(prev), activeUid);
        if (activeUid) {
          scheduleFirestoreSync(activeUid, next);
        }
        return next;
      });
    },
    [activeUid, scheduleFirestoreSync]
  );

  // Track module visits automatically on route change when signed in
  useEffect(() => {
    if (!activeUid) return;
    const visitedId =
      currentRoute === '/projection-of-points'
        ? 'points'
        : currentRoute === '/projection-of-lines'
        ? 'lines'
        : currentRoute === '/question-generator'
        ? 'generator'
        : null;

    if (visitedId) {
      updateLearning((prev) => {
        if (prev.visitedModules.includes(visitedId)) return prev;
        return {
          ...prev,
          visitedModules: [...prev.visitedModules, visitedId],
        };
      });
    }
  }, [currentRoute, activeUid, updateLearning]);

  // Track active studio duration cleanly while authenticated user works in any module
  useEffect(() => {
    if (!activeUid) return;
    if (currentRoute === '/dashboard' || currentRoute === '/') return;
    const interval = window.setInterval(() => {
      updateLearning((prev) => ({
        ...prev,
        learningSeconds: prev.learningSeconds + 15,
      }));
    }, 15000);
    return () => window.clearInterval(interval);
  }, [currentRoute, activeUid, updateLearning]);

  // Listen to both popstate and hashchange events for maximum sandbox/iframe compatibility
  useEffect(() => {
    const handleRouteSync = () => {
      setCurrentRoute(resolveRoute());
    };

    window.addEventListener('popstate', handleRouteSync);
    window.addEventListener('hashchange', handleRouteSync);

    return () => {
      window.removeEventListener('popstate', handleRouteSync);
      window.removeEventListener('hashchange', handleRouteSync);
    };
  }, []);

  const navigateTo = useCallback((route: AppRoute) => {
    const resolved = resolveRoute(route);
    setCurrentRoute(resolved);
    if (resolved !== '/dashboard') {
      setDashboardAnchor('dashboard');
    }

    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ route: resolved }, '', resolved);
      } catch {
        // Fallback for sandboxed iframes without pushState permissions
      }
      try {
        const currentHash = window.location.hash.replace(/^#/, '');
        const hashTag =
          resolved === '/feedback-community'
            ? currentHash.startsWith('feedback/')
              ? currentHash
              : 'feedback'
            : resolved === '/question-generator'
            ? 'generator'
            : resolved === '/projection-of-lines'
            ? 'lines'
            : resolved === '/projection-of-points'
            ? 'points'
            : 'dashboard';
        if (currentHash !== hashTag) {
          window.location.hash = hashTag;
        }
      } catch {}
    }
  }, []);

  const scrollToDashboardSection = useCallback((sectionId: string) => {
    window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  }, []);

  const handleSelectSidebarSection = useCallback(
    (section: SidebarSectionId, route?: AppRoute) => {
      if (section === 'roadmap') {
        setDashboardAnchor('roadmap');
        navigateTo('/dashboard');
        scrollToDashboardSection('syllabus-roadmap');
        return;
      }
      if (section === 'progress') {
        setDashboardAnchor('progress');
        navigateTo('/dashboard');
        scrollToDashboardSection('learning-analytics');
        return;
      }
      if (section === 'dashboard') {
        setDashboardAnchor('dashboard');
        navigateTo('/dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (route) {
        navigateTo(route);
      }
    },
    [navigateTo, scrollToDashboardSection]
  );

  const activeSidebarSection: SidebarSectionId = isSettingsOpen
    ? 'settings'
    : currentRoute === '/feedback-community'
    ? 'feedback'
    : currentRoute === '/projection-of-points'
    ? 'points'
    : currentRoute === '/projection-of-lines'
    ? 'lines'
    : currentRoute === '/question-generator'
    ? 'generator'
    : dashboardAnchor;

  const handleRecordProblemSolved = useCallback(() => {
    const todayIdx = getTodayWeekdayIndex();
    updateLearning((prev) => {
      const nextWeekly = [...prev.weeklyActivity];
      nextWeekly[todayIdx] = (nextWeekly[todayIdx] || 0) + 1;
      return {
        ...prev,
        problemsSolved: prev.problemsSolved + 1,
        scansCompleted: prev.scansCompleted + 1,
        weeklyActivity: nextWeekly,
      };
    });
  }, [updateLearning]);

  const handleToggleModuleComplete = useCallback(
    (moduleId: string) => {
      updateLearning((prev) => {
        const exists = prev.completedModules.includes(moduleId);
        return {
          ...prev,
          completedModules: exists
            ? prev.completedModules.filter((id) => id !== moduleId)
            : [...prev.completedModules, moduleId],
        };
      });
    },
    [updateLearning]
  );

  const [pendingScannedLine, setPendingScannedLine] = useState<any>(null);
  const [pendingScannedPoint, setPendingScannedPoint] = useState<any>(null);

  // 1. Auth Loading Splash
  if (!isAuthReady) {
    return (
      <div
        className={`min-h-screen font-['Space_Grotesk',sans-serif] flex items-center justify-center ${
          isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-[#F8F7FC] text-[#202044]'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7138E8] animate-pulse" />
          <p className="text-sm font-medium text-[#77758F] dark:text-slate-400">
            Loading Capybara...
          </p>
        </div>
      </div>
    );
  }

  // 2. Email Verification Pending Screen
  if (needsEmailVerification) {
    return (
      <AuthLayout isDark={isDark} onToggleTheme={() => setIsDark(!isDark)}>
        <VerifyEmailCard />
      </AuthLayout>
    );
  }

  // 3. Unauthenticated Gate -> Login or Registration Page
  if (!firebaseUser || !studentProfile) {
    return (
      <AuthLayout isDark={isDark} onToggleTheme={() => setIsDark(!isDark)}>
        {authMode === 'register' ? (
          <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />
        ) : (
          <LoginPage onSwitchToRegister={() => setAuthMode('register')} />
        )}
      </AuthLayout>
    );
  }

  // 4. Newly Registered Student -> Display Unique EDID-XXXX Confirmation Card
  if (newlyIssuedProfile) {
    return (
      <AuthLayout isDark={isDark} onToggleTheme={() => setIsDark(!isDark)}>
        <IssuedEdidWelcomeCard />
      </AuthLayout>
    );
  }

  // 5. Authenticated Student Studio Workspace
  return (
    <div
      className={`min-h-screen font-['Space_Grotesk',sans-serif] ${
        isDark
          ? 'dark bg-slate-950 text-slate-100'
          : 'bg-[#F8F7FC] text-[#202044]'
      } transition-colors duration-200`}
    >
      <div className="max-w-[1600px] mx-auto min-h-screen flex">
        {/* Vertical Purple Gradient Sidebar */}
        <AppSidebar
          activeSection={activeSidebarSection}
          onSelectSection={handleSelectSidebarSection}
          onOpenScanModal={() => setIsGlobalScanOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
        />

        {/* Rounded Main Workspace Shell */}
        <div className="flex-1 min-w-0 p-2 sm:p-3 lg:p-4 flex flex-col">
          <div className="flex-1 rounded-[26px] bg-white dark:bg-slate-900 border border-[#ECE8F8] dark:border-slate-800 shadow-[0_20px_60px_-15px_rgba(96,53,181,0.08)] flex flex-col justify-between overflow-x-hidden">
            <div>
              {/* Workspace Top Header */}
              <AppHeader
                currentRoute={currentRoute}
                onNavigate={navigateTo}
                onSelectSection={handleSelectSidebarSection}
                studentName={learningState.studentName || studentProfile.fullName}
                studentEdid={studentProfile.edid}
                hpColor={hpColor}
                vpColor={vpColor}
                onChangeHpColor={setHpColor}
                onChangeVpColor={setVpColor}
                onResetColors={handleResetColors}
                isDark={isDark}
                onToggleTheme={() => setIsDark(!isDark)}
                onOpenScanModal={() => setIsGlobalScanOpen(true)}
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onSignOut={signOutStudent}
              />

              {/* Dynamic Route View protected by ErrorBoundary */}
              <main>
                <ErrorBoundary
                  fallbackTitle="Module Interface Error"
                  onReset={() => navigateTo('/dashboard')}
                >
                  {currentRoute === '/question-generator' ? (
                    <QuestionToGraphicsGenerator
                      hpColor={hpColor}
                      vpColor={vpColor}
                      isDark={isDark}
                      onNavigateToLineModule={(scannedLn) => {
                        setPendingScannedLine(scannedLn);
                        handleRecordProblemSolved();
                        navigateTo('/projection-of-lines');
                      }}
                    />
                  ) : currentRoute === '/projection-of-points' ? (
                    <PointsModule
                      hpColor={hpColor}
                      vpColor={vpColor}
                      onChangeHpColor={setHpColor}
                      onChangeVpColor={setVpColor}
                      isDark={isDark}
                      initialPointInput={pendingScannedPoint || undefined}
                    />
                  ) : currentRoute === '/feedback-community' ? (
                    <FeedbackCommunityView
                      currentUid={studentProfile.uid}
                      studentName={learningState.studentName || studentProfile.fullName}
                      studentEdid={studentProfile.edid}
                      isDark={isDark}
                    />
                  ) : currentRoute === '/projection-of-lines' ? (
                    <LinesModule
                      hpColor={hpColor}
                      vpColor={vpColor}
                      onChangeHpColor={setHpColor}
                      onChangeVpColor={setVpColor}
                      isDark={isDark}
                      initialLineInput={pendingScannedLine || undefined}
                    />
                  ) : (
                    <DashboardView
                      onNavigate={navigateTo}
                      onOpenScanModal={() => setIsGlobalScanOpen(true)}
                      hpColor={hpColor}
                      vpColor={vpColor}
                      isDark={isDark}
                      learningState={learningState}
                      onToggleModuleComplete={handleToggleModuleComplete}
                      onScrollToSection={scrollToDashboardSection}
                    />
                  )}
                </ErrorBoundary>
              </main>
            </div>

            {/* Clean Educational Standards Footer */}
            <footer className="mt-6 border-t border-[#F0ECF9] dark:border-slate-800 py-4 px-5 sm:px-7 text-xs text-[#77758A] dark:text-slate-400">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#202033] dark:text-slate-200">
                    Capybara Engineering Graphics
                  </span>
                  <span>·</span>
                  <span>{studentProfile.edid}</span>
                  <span>·</span>
                  <span>V1 Points · V2 Straight Lines</span>
                </div>
                <div className="text-center sm:text-right">
                  Adheres to BIS SP 46:2003 &amp; ISO 128 Standard Engineering Drawing Conventions
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* Global Multimodal Scan Question Parser Modal */}
      <ScanQuestionModal
        isOpen={isGlobalScanOpen}
        onClose={() => setIsGlobalScanOpen(false)}
        isDark={isDark}
        onApplyPoint={(scannedPt) => {
          setPendingScannedPoint(scannedPt);
          handleRecordProblemSolved();
          navigateTo('/projection-of-points');
        }}
        onApplyLine={(scannedLn) => {
          setPendingScannedLine(scannedLn);
          handleRecordProblemSolved();
          navigateTo('/projection-of-lines');
        }}
      />

      {/* Workspace Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        studentName={learningState.studentName || studentProfile.fullName}
        studentEdid={studentProfile.edid}
        studentEmail={studentProfile.email}
        studentCollege={studentProfile.college}
        studentDetails={studentProfile.studentDetails}
        onChangeStudentName={(name) =>
          updateLearning((prev) => ({ ...prev, studentName: name }))
        }
        onSaveStudentProfile={updateStudentDetails}
        onSignOut={signOutStudent}
        hpColor={hpColor}
        vpColor={vpColor}
        onChangeHpColor={setHpColor}
        onChangeVpColor={setVpColor}
        onResetColors={handleResetColors}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onResetProgress={() =>
          updateLearning((prev) => ({
            ...DEFAULT_LEARNING_STATE,
            studentName: prev.studentName,
          }))
        }
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
