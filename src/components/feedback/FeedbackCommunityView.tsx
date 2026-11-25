/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Palette,
  Compass,
  Bug,
  Lightbulb,
  Send,
  AtSign,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  MessageSquare,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  FEEDBACK_CATEGORIES,
  FeedbackCategoryId,
  FeedbackPost,
  MentionCandidate,
  isValidFeedbackCategory,
} from '../../types/feedback';
import {
  createFeedbackPost,
  deleteFeedbackPost,
  extractMentionsFromContent,
  subscribeToFeedbackCategory,
  updateFeedbackPost,
} from '../../services/feedbackService';

interface FeedbackCommunityViewProps {
  currentUid: string;
  studentName: string;
  studentEdid: string;
  isDark?: boolean;
}

function resolveInitialCategoryFromLocation(): FeedbackCategoryId {
  if (typeof window === 'undefined') return 'ui-aesthetics';
  const hash = window.location.hash.toLowerCase();
  const match = hash.match(/feedback\/([a-z\-]+)/);
  if (match && isValidFeedbackCategory(match[1])) {
    return match[1];
  }
  return 'ui-aesthetics';
}

function getCategoryIcon(id: FeedbackCategoryId, className = 'w-4 h-4') {
  switch (id) {
    case 'ui-aesthetics':
      return <Palette className={className} />;
    case 'ed-knowledge':
      return <Compass className={className} />;
    case 'app-bugs':
      return <Bug className={className} />;
    case 'new-ideas':
      return <Lightbulb className={className} />;
  }
}

function formatRelativeTime(ms: number): string {
  const diff = Math.max(0, Date.now() - ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function getInitials(name: string): string {
  return (
    (name || 'S')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || 'S'
  );
}

/**
 * Renders feedback text with highlighted @mention tokens (`@Name (CAPYID-1234)` or `@CAPYID-1234`).
 */
function renderContentWithMentions(content: string): React.ReactNode {
  const tokenRegex = /(@[A-Za-z0-9_.\- ]{1,40}\((?:CAPYID|EDID)-\d{4}\)|@(?:CAPYID|EDID)-\d{4})/gi;
  const parts = content.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (
      /^@[A-Za-z0-9_.\- ]{1,40}\((?:CAPYID|EDID)-\d{4}\)$/i.test(part) ||
      /^@(?:CAPYID|EDID)-\d{4}$/i.test(part)
    ) {
      return (
        <span
          key={idx}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-[#F1EBFF] dark:bg-purple-950/70 text-[#6035B5] dark:text-purple-200 border border-[#DFD3FA] dark:border-purple-800/70 font-semibold text-[12px]"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const FeedbackCommunityView: React.FC<FeedbackCommunityViewProps> = ({
  currentUid,
  studentName,
  studentEdid,
}) => {
  const [activeCategory, setActiveCategory] = useState<FeedbackCategoryId>(() =>
    resolveInitialCategoryFromLocation()
  );

  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Composer state
  const [draft, setDraft] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Column filter state
  const [feedFilter, setFeedFilter] = useState<'all' | 'mentions'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIdx, setMentionStartIdx] = useState<number>(-1);
  const [mentionHighlightIdx, setMentionHighlightIdx] = useState<number>(0);

  // Inline edit & delete states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const composerCardRef = useRef<HTMLDivElement>(null);

  const activeCategoryMeta = useMemo(
    () => FEEDBACK_CATEGORIES.find((c) => c.id === activeCategory) || FEEDBACK_CATEGORIES[0],
    [activeCategory]
  );

  // Sync URL hash sub-tab if user navigates via browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const match = hash.match(/feedback\/([a-z\-]+)/);
      if (match && isValidFeedbackCategory(match[1])) {
        setActiveCategory(match[1]);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSelectTab = useCallback((catId: FeedbackCategoryId) => {
    setActiveCategory(catId);
    setFeedFilter('all');
    setSearchQuery('');
    setSubmitError(null);
    setEditingPostId(null);
    setConfirmDeleteId(null);
    setMentionQuery(null);
    try {
      window.location.hash = `feedback/${catId}`;
    } catch {}
  }, []);

  // Subscribe to Firestore posts ONLY for the selected segregated category column
  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    setPosts([]);

    const unsubscribe = subscribeToFeedbackCategory(
      activeCategory,
      (incomingPosts) => {
        setPosts(incomingPosts);
        setIsLoading(false);
        setLoadError(null);
      },
      (errMsg) => {
        setIsLoading(false);
        if (errMsg.toLowerCase().includes('permission')) {
          setLoadError(
            'Unable to load community feedback yet. Please ensure the updated Firestore security rules are deployed and your email is verified.'
          );
        } else {
          setLoadError(errMsg || 'Unable to load feedback for this column right now.');
        }
      }
    );

    return () => unsubscribe();
  }, [activeCategory]);

  // Unique community participants seen in this column for tagging & @mention autocomplete
  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    const map = new Map<string, MentionCandidate>();
    for (const p of posts) {
      if (!p.authorEdid) continue;
      if (!map.has(p.authorEdid)) {
        map.set(p.authorEdid, {
          edid: p.authorEdid,
          name: p.authorName || 'Student',
        });
      }
    }
    return Array.from(map.values());
  }, [posts]);

  const filteredAutocomplete = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.trim().toLowerCase();
    return mentionCandidates
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.edid.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [mentionQuery, mentionCandidates]);

  const insertMentionIntoDraft = useCallback(
    (candidate: MentionCandidate, replaceFromAt = false) => {
      const token = `@${candidate.name.replace(/[()@]/g, '').trim()} (${candidate.edid}) `;

      if (replaceFromAt && mentionStartIdx >= 0 && composerRef.current) {
        const cursor = composerRef.current.selectionStart ?? draft.length;
        const before = draft.slice(0, mentionStartIdx);
        const after = draft.slice(cursor);
        const nextVal = `${before}${token}${after}`;
        setDraft(nextVal.slice(0, 2000));
        setMentionQuery(null);
        setMentionStartIdx(-1);
        window.requestAnimationFrame(() => {
          if (composerRef.current) {
            const nextPos = Math.min(2000, before.length + token.length);
            composerRef.current.focus();
            composerRef.current.setSelectionRange(nextPos, nextPos);
          }
        });
        return;
      }

      setDraft((prev) => {
        const needsSpace = prev.length > 0 && !/\s$/.test(prev);
        return `${prev}${needsSpace ? ' ' : ''}${token}`.slice(0, 2000);
      });
      setMentionQuery(null);
      setMentionStartIdx(-1);

      composerCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      window.setTimeout(() => {
        composerRef.current?.focus();
      }, 120);
    },
    [draft, mentionStartIdx]
  );

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setDraft(val);
    if (submitError) setSubmitError(null);

    // Detect active @mention token right before cursor
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/(?:^|\s)@([A-Za-z0-9_\-]*)$/);
    if (atMatch) {
      const queryStr = atMatch[1] || '';
      const atIdx = textBeforeCursor.lastIndexOf('@');
      setMentionQuery(queryStr);
      setMentionStartIdx(atIdx);
      setMentionHighlightIdx(0);
    } else {
      setMentionQuery(null);
      setMentionStartIdx(-1);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredAutocomplete.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlightIdx((prev) => (prev + 1) % filteredAutocomplete.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlightIdx((prev) =>
          (prev - 1 + filteredAutocomplete.length) % filteredAutocomplete.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const picked = filteredAutocomplete[mentionHighlightIdx] || filteredAutocomplete[0];
        if (picked) insertMentionIntoDraft(picked, true);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean) {
      setSubmitError('Please write your feedback before posting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const mentions = extractMentionsFromContent(clean, mentionCandidates);
      await createFeedbackPost({
        category: activeCategory,
        authorUid: currentUid,
        authorName: studentName,
        authorEdid: studentEdid,
        content: clean,
        mentions,
      });
      setDraft('');
      setMentionQuery(null);
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err || '');
      if (rawMsg.toLowerCase().includes('permission')) {
        setSubmitError(
          'Unable to submit feedback due to Firestore permissions. Please ensure updated rules are deployed and your email is verified.'
        );
      } else {
        setSubmitError(rawMsg || 'Failed to post feedback. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (postId: string) => {
    const clean = editDraft.trim();
    if (!clean) return;
    setIsSavingEdit(true);
    try {
      const mentions = extractMentionsFromContent(clean, mentionCandidates);
      await updateFeedbackPost(postId, { content: clean, mentions });
      setEditingPostId(null);
      setEditDraft('');
    } catch (err) {
      console.error('Failed to update feedback:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async (postId: string) => {
    setIsDeletingId(postId);
    try {
      await deleteFeedbackPost(postId);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  const mentionsMeCount = useMemo(
    () =>
      posts.filter(
        (p) =>
          p.mentions.includes(studentEdid.toUpperCase()) ||
          p.content.toUpperCase().includes(studentEdid.toUpperCase())
      ).length,
    [posts, studentEdid]
  );

  const visiblePosts = useMemo(() => {
    let list = posts;
    if (feedFilter === 'mentions') {
      list = list.filter(
        (p) =>
          p.mentions.includes(studentEdid.toUpperCase()) ||
          p.content.toUpperCase().includes(studentEdid.toUpperCase())
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.authorEdid.toLowerCase().includes(q)
      );
    }
    return list;
  }, [posts, feedFilter, searchQuery, studentEdid]);

  return (
    <div className="px-4 sm:px-7 py-6 sm:py-7 flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Segregated 4-Option Tab Bar */}
      <section aria-label="Feedback categories">
        <div
          role="tablist"
          aria-label="Feedback Community Categories"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {FEEDBACK_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => handleSelectTab(cat.id)}
                className={`group text-left rounded-2xl p-3.5 border transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? 'bg-[#7138E8] border-[#7138E8] text-white shadow-[0_12px_28px_-10px_rgba(113,56,232,0.55)]'
                    : 'bg-[#FAF9FE] dark:bg-slate-800/70 border-[#E5DFF5] dark:border-slate-700 text-[#202044] dark:text-slate-100 hover:border-[#7138E8]/60 hover:bg-[#F3EEFF] dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F1EBFF] dark:bg-purple-950/60 text-[#7138E8] dark:text-purple-300'
                  }`}
                >
                  {getCategoryIcon(cat.id, 'w-4 h-4')}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold leading-snug">
                    {cat.title}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 leading-snug ${
                      isSelected
                        ? 'text-white/80'
                        : 'text-[#77758F] dark:text-slate-400'
                    }`}
                  >
                    {cat.shortTitle} Column
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Category Segregated Column */}
      <section
        role="tabpanel"
        aria-label={`${activeCategoryMeta.title} column`}
        className="flex flex-col gap-5"
      >
        {/* Active Column Header Banner */}
        <div className="rounded-[22px] bg-gradient-to-br from-[#F8F6FE] to-[#F1EBFF]/70 dark:from-slate-800/80 dark:to-slate-900 border border-[#E5DFF5] dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#7138E8] text-white flex items-center justify-center shrink-0 shadow-xs">
              {getCategoryIcon(activeCategoryMeta.id, 'w-5 h-5')}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#202033] dark:text-slate-100">
                  {activeCategoryMeta.title}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-white dark:bg-slate-800 text-[#6035B5] dark:text-purple-300 border border-[#DFD3FA] dark:border-slate-700">
                  {posts.length} {posts.length === 1 ? 'comment' : 'comments'}
                </span>
              </div>
              <p className="text-xs text-[#77758A] dark:text-slate-400 mt-1 leading-relaxed">
                {activeCategoryMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Filter Pills inside Active Column */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFeedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                feedFilter === 'all'
                  ? 'bg-[#7138E8] text-white'
                  : 'bg-white dark:bg-slate-800 text-[#6035B5] dark:text-slate-300 border border-[#E5DFF5] dark:border-slate-700 hover:bg-[#F2EDFF]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFeedFilter('mentions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                feedFilter === 'mentions'
                  ? 'bg-[#7138E8] text-white'
                  : 'bg-white dark:bg-slate-800 text-[#6035B5] dark:text-slate-300 border border-[#E5DFF5] dark:border-slate-700 hover:bg-[#F2EDFF]'
              }`}
            >
              <AtSign className="w-3.5 h-3.5" />
              <span>Mentions ({mentionsMeCount})</span>
            </button>
          </div>
        </div>

        {/* Write Feedback Composer for Active Column */}
        <div
          ref={composerCardRef}
          className="rounded-[22px] bg-white dark:bg-slate-900 border border-[#ECE8F8] dark:border-slate-800 shadow-[0_10px_30px_-12px_rgba(96,53,181,0.08)] p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#202033] dark:text-slate-100">
              <span>Posting to {activeCategoryMeta.shortTitle} as</span>
              <span className="px-2 py-0.5 rounded-lg bg-[#F1EBFF] dark:bg-purple-950/60 text-[#6035B5] dark:text-purple-200 font-bold">
                {studentName}
              </span>
              <span className="font-mono text-[11px] text-[#77758A] dark:text-slate-400">
                {studentEdid}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#77758A] dark:text-slate-400">
              {draft.length} / 2000
            </span>
          </div>

          <form onSubmit={handleSubmitFeedback} className="relative">
            <textarea
              ref={composerRef}
              value={draft}
              onChange={handleDraftChange}
              onKeyDown={handleComposerKeyDown}
              maxLength={2000}
              rows={3}
              placeholder={activeCategoryMeta.placeholder}
              aria-label={`Write feedback for ${activeCategoryMeta.title}`}
              className="w-full rounded-2xl bg-[#F8F7FC] dark:bg-slate-800/80 border border-[#E5DFF5] dark:border-slate-700 px-4 py-3 text-sm text-[#202044] dark:text-slate-100 placeholder:text-[#77758F] dark:placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/15 transition-all resize-y min-h-[92px]"
            />

            {/* @Mention Autocomplete Popover */}
            {mentionQuery !== null && filteredAutocomplete.length > 0 && (
              <div className="mt-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#DFD3FA] dark:border-slate-700 shadow-xl py-1.5 z-30">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#77758F] dark:text-slate-400">
                  Tag &amp; Mention Contributor
                </div>
                {filteredAutocomplete.map((candidate, idx) => {
                  const isHighlighted = idx === mentionHighlightIdx;
                  return (
                    <button
                      key={candidate.edid}
                      type="button"
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        insertMentionIntoDraft(candidate, true);
                      }}
                      className={`w-full px-3.5 py-2 flex items-center justify-between gap-3 text-left text-xs transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-[#F1EBFF] dark:bg-purple-950/60 text-[#6035B5] dark:text-purple-200'
                          : 'hover:bg-[#F8F7FC] dark:hover:bg-slate-800 text-[#202044] dark:text-slate-100'
                      }`}
                    >
                      <span className="font-semibold truncate">{candidate.name}</span>
                      <span className="font-mono text-[11px] text-[#77758F] dark:text-slate-400 shrink-0">
                        {candidate.edid}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Tag Contributors Bar */}
            {mentionCandidates.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#77758A] dark:text-slate-400 flex items-center gap-1 mr-1">
                  <AtSign className="w-3 h-3 text-[#7138E8]" />
                  <span>Quick tag:</span>
                </span>
                {mentionCandidates.slice(0, 6).map((c) => (
                  <button
                    key={c.edid}
                    type="button"
                    onClick={() => insertMentionIntoDraft(c, false)}
                    className="px-2 py-0.5 rounded-lg bg-[#F8F7FC] dark:bg-slate-800 hover:bg-[#F1EBFF] dark:hover:bg-purple-950/50 border border-[#E5DFF5] dark:border-slate-700 text-[11px] font-medium text-[#6035B5] dark:text-purple-300 transition-colors cursor-pointer"
                  >
                    @{c.name} <span className="font-mono opacity-75">({c.edid})</span>
                  </button>
                ))}
              </div>
            )}

            {submitError && (
              <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-[#77758A] dark:text-slate-400">
                Type <span className="font-mono font-semibold">@</span> or click <span className="font-semibold">@Mention</span> on any comment below to tag someone.
              </p>

              <button
                type="submit"
                disabled={isSubmitting || !draft.trim()}
                className="px-4 py-2 rounded-xl bg-[#7138E8] hover:bg-[#5E28CF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Post Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Column Search & Comments Feed */}
        <div className="flex flex-col gap-3">
          {posts.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-[#77758F] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Filter ${activeCategoryMeta.shortTitle} comments by text, author, or CAPYID...`}
                aria-label={`Search ${activeCategoryMeta.title} comments`}
                className="w-full h-9 pl-9 pr-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E8E2F5] dark:border-slate-800 text-xs text-[#202044] dark:text-slate-100 placeholder:text-[#77758F] dark:placeholder:text-slate-400 focus:outline-none focus:border-[#7138E8] focus:ring-2 focus:ring-[#7138E8]/15"
              />
            </div>
          )}

          {loadError ? (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Community board unavailable</div>
                <p className="mt-0.5 opacity-90">{loadError}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="rounded-[22px] bg-white dark:bg-slate-900 border border-[#ECE8F8] dark:border-slate-800 p-8 flex flex-col items-center justify-center gap-2 text-xs text-[#77758A] dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-[#7138E8]" />
              <span>Loading {activeCategoryMeta.title} feedback...</span>
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-[22px] bg-white dark:bg-slate-900 border border-dashed border-[#DFD6F7] dark:border-slate-800 p-8 text-center flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#F1EBFF] dark:bg-purple-950/60 text-[#7138E8] dark:text-purple-300 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-sm font-bold text-[#202033] dark:text-slate-100">
                {feedFilter === 'mentions'
                  ? 'No mentions for you in this column yet'
                  : searchQuery
                  ? 'No matching feedback comments'
                  : `No feedback in ${activeCategoryMeta.shortTitle} yet`}
              </div>
              <p className="text-xs text-[#77758A] dark:text-slate-400 max-w-md">
                {feedFilter === 'mentions'
                  ? 'When someone tags your name or CAPYID in this column, it will appear here.'
                  : 'Be the first student to share feedback in this dedicated column!'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {visiblePosts.map((post) => {
                const isOwn = post.authorUid === currentUid;
                const mentionsMe =
                  post.mentions.includes(studentEdid.toUpperCase()) ||
                  post.content.toUpperCase().includes(studentEdid.toUpperCase());
                const isEdited = post.updatedAtMs - post.createdAtMs > 5000;

                return (
                  <article
                    key={post.postId}
                    className={`rounded-[20px] bg-white dark:bg-slate-900 border p-4 sm:p-5 transition-colors ${
                      mentionsMe
                        ? 'border-[#BFA5F8] dark:border-purple-700 shadow-[0_10px_28px_-14px_rgba(113,56,232,0.22)]'
                        : 'border-[#ECE8F8] dark:border-slate-800 shadow-[0_8px_24px_-14px_rgba(96,53,181,0.08)]'
                    }`}
                  >
                    {/* Author Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7138E8] to-[#9565F5] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {getInitials(post.authorName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-[#202033] dark:text-slate-100 truncate">
                              {post.authorName}
                            </span>
                            {isOwn && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F1EBFF] dark:bg-purple-950/60 text-[#6035B5] dark:text-purple-200">
                                You
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-[#77758A] dark:text-slate-400">
                              {post.authorEdid}
                            </span>
                            {mentionsMe && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Mentioned you</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#77758A] dark:text-slate-400">
                            {formatRelativeTime(post.createdAtMs)}
                            {isEdited ? ' · edited' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Comment Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            insertMentionIntoDraft(
                              { name: post.authorName, edid: post.authorEdid },
                              false
                            )
                          }
                          title={`Tag and mention ${post.authorName} (${post.authorEdid})`}
                          className="px-2.5 py-1 rounded-lg bg-[#F8F7FC] dark:bg-slate-800 hover:bg-[#F1EBFF] dark:hover:bg-purple-950/60 border border-[#E5DFF5] dark:border-slate-700 text-[11px] font-semibold text-[#6035B5] dark:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <AtSign className="w-3 h-3" />
                          <span>Mention</span>
                        </button>

                        {isOwn && editingPostId !== post.postId && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPostId(post.postId);
                                setEditDraft(post.content);
                                setConfirmDeleteId(null);
                              }}
                              title="Edit your feedback"
                              aria-label="Edit your feedback"
                              className="p-1.5 rounded-lg text-[#77758A] hover:text-[#6035B5] hover:bg-[#F1EBFF] dark:text-slate-400 dark:hover:text-purple-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {confirmDeleteId === post.postId ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isDeletingId === post.postId}
                                  onClick={() => handleConfirmDelete(post.postId)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                                >
                                  {isDeletingId === post.postId ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(post.postId)}
                                title="Delete your feedback"
                                aria-label="Delete your feedback"
                                className="p-1.5 rounded-lg text-[#77758A] hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Content or Inline Edit */}
                    {editingPostId === post.postId ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          maxLength={2000}
                          rows={3}
                          className="w-full rounded-xl bg-[#F8F7FC] dark:bg-slate-800 border border-[#DFD3FA] dark:border-slate-700 px-3 py-2 text-sm text-[#202044] dark:text-slate-100 focus:outline-none focus:border-[#7138E8]"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPostId(null);
                              setEditDraft('');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[#E5DFF5] dark:border-slate-700 text-xs font-semibold text-[#77758A] dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSavingEdit || !editDraft.trim()}
                            onClick={() => handleSaveEdit(post.postId)}
                            className="px-3 py-1.5 rounded-lg bg-[#7138E8] hover:bg-[#5E28CF] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSavingEdit ? 'Saving...' : 'Save'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-[13px] sm:text-sm text-[#202044] dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                        {renderContentWithMentions(post.content)}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
