/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FeedbackCategoryId =
  | 'ui-aesthetics'
  | 'ed-knowledge'
  | 'app-bugs'
  | 'new-ideas';

export interface FeedbackCategoryMeta {
  id: FeedbackCategoryId;
  title: string;
  shortTitle: string;
  subtitle: string;
  placeholder: string;
}

export const FEEDBACK_CATEGORIES: FeedbackCategoryMeta[] = [
  {
    id: 'ui-aesthetics',
    title: 'UI and Aesthetics',
    shortTitle: 'UI & Aesthetics',
    subtitle:
      'Share thoughts on visual design, colors, typography, dark mode, layout clarity, and responsiveness.',
    placeholder:
      'Share feedback on UI & Aesthetics (e.g., layout, colors, readability)... Type @ to mention someone.',
  },
  {
    id: 'ed-knowledge',
    title: 'Engineering Drawing Knowledge',
    shortTitle: 'ED Knowledge',
    subtitle:
      'Discuss BIS SP 46:2003 & ISO 128 conventions, projection rules, traces, loci, and conceptual doubts.',
    placeholder:
      'Share ED Knowledge feedback or questions (e.g., First-Angle conventions, HT/VT traces)... Type @ to mention someone.',
  },
  {
    id: 'app-bugs',
    title: 'App Bugs',
    shortTitle: 'App Bugs',
    subtitle:
      'Report login issues, email verification / mail delivery problems, OCR glitches, or unexpected errors.',
    placeholder:
      'Describe any bug you encountered (e.g., login issue, mail verification, solver edge case)... Type @ to mention someone.',
  },
  {
    id: 'new-ideas',
    title: 'New Ideas and Others',
    shortTitle: 'New Ideas & Others',
    subtitle:
      'Suggest new features, V3–V5 module ideas, workflow improvements, or general community feedback.',
    placeholder:
      'Share new ideas or general feedback for Capybara... Type @ to mention someone.',
  },
];

export function isValidFeedbackCategory(value: string): value is FeedbackCategoryId {
  return (
    value === 'ui-aesthetics' ||
    value === 'ed-knowledge' ||
    value === 'app-bugs' ||
    value === 'new-ideas'
  );
}

export interface FeedbackPost {
  postId: string;
  category: FeedbackCategoryId;
  authorUid: string;
  authorName: string;
  authorEdid: string;
  content: string;
  mentions: string[];
  createdAtMs: number;
  updatedAtMs: number;
}

export interface MentionCandidate {
  edid: string;
  name: string;
}
