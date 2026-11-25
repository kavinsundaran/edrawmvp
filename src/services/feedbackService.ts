/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  FeedbackCategoryId,
  FeedbackPost,
  MentionCandidate,
  isValidFeedbackCategory,
} from '../types/feedback';

function timestampToMs(ts: unknown): number {
  if (ts instanceof Timestamp) {
    return ts.toMillis();
  }
  if (ts && typeof (ts as any).toMillis === 'function') {
    return (ts as any).toMillis();
  }
  return Date.now();
}

function generatePostId(): string {
  const bytes = new Uint8Array(6);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `fb_${Date.now()}_${hex}`;
}

export function sanitizeMentionsList(mentions: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of mentions) {
    const clean = String(raw || '').trim().slice(0, 80);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 10) break;
  }
  return out;
}

/**
 * Extracts mentioned CAPYID-XXXX / EDID-XXXX identifiers from feedback text.
 * Supports `@Name (CAPYID-1234)`, `@CAPYID-1234`, and `@Name` matching known participants.
 */
export function extractMentionsFromContent(
  content: string,
  candidates: MentionCandidate[]
): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const addMention = (edid: string) => {
    const upper = edid.trim().toUpperCase();
    if (!/^(CAPYID|EDID)-\d{4}$/.test(upper) || seen.has(upper)) return;
    seen.add(upper);
    found.push(upper);
  };

  // 1. Direct @CAPYID-XXXX or (CAPYID-XXXX) tokens
  const idRegex = /(?:@|\()(CAPYID-\d{4}|EDID-\d{4})\)?/gi;
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(content)) !== null) {
    addMention(match[1]);
  }

  // 2. @Name matches against known community contributors
  const lowerContent = content.toLowerCase();
  for (const candidate of candidates) {
    const cleanName = candidate.name.trim().toLowerCase();
    if (!cleanName) continue;
    if (lowerContent.includes(`@${cleanName}`)) {
      addMention(candidate.edid);
    }
  }

  return found.slice(0, 10);
}

/**
 * Real-time subscription to a single segregated feedback category board.
 * Uses a single-field equality filter (no composite index required) and sorts newest-first client-side.
 */
export function subscribeToFeedbackCategory(
  category: FeedbackCategoryId,
  onData: (posts: FeedbackPost[]) => void,
  onError: (message: string) => void
): () => void {
  const path = 'feedback_posts';
  const q = query(
    collection(db, path),
    where('category', '==', category),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const posts: FeedbackPost[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const cat = String(d.category || '');
        if (!isValidFeedbackCategory(cat)) return;
        posts.push({
          postId: String(d.postId || docSnap.id),
          category: cat,
          authorUid: String(d.authorUid || ''),
          authorName: String(d.authorName || 'Student'),
          authorEdid: String(d.authorEdid || ''),
          content: String(d.content || ''),
          mentions: Array.isArray(d.mentions) ? d.mentions.map((m) => String(m)) : [],
          createdAtMs: timestampToMs(d.createdAt),
          updatedAtMs: timestampToMs(d.updatedAt),
        });
      });
      posts.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(posts);
    },
    (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      onError(msg);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createFeedbackPost(params: {
  category: FeedbackCategoryId;
  authorUid: string;
  authorName: string;
  authorEdid: string;
  content: string;
  mentions: string[];
}): Promise<string> {
  const postId = generatePostId();
  const path = `feedback_posts/${postId}`;
  const cleanContent = params.content.trim().slice(0, 2000);
  const cleanAuthorName = params.authorName.trim().slice(0, 80) || 'Student';
  const cleanMentions = sanitizeMentionsList(params.mentions);

  if (!cleanContent) {
    throw new Error('Please write your feedback before posting.');
  }

  try {
    await setDoc(doc(db, 'feedback_posts', postId), {
      postId,
      category: params.category,
      authorUid: params.authorUid,
      authorName: cleanAuthorName,
      authorEdid: params.authorEdid,
      content: cleanContent,
      mentions: cleanMentions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return postId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateFeedbackPost(
  postId: string,
  params: { content: string; mentions: string[] }
): Promise<void> {
  const path = `feedback_posts/${postId}`;
  const cleanContent = params.content.trim().slice(0, 2000);
  if (!cleanContent) {
    throw new Error('Feedback content cannot be empty.');
  }

  try {
    await updateDoc(doc(db, 'feedback_posts', postId), {
      content: cleanContent,
      mentions: sanitizeMentionsList(params.mentions),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteFeedbackPost(postId: string): Promise<void> {
  const path = `feedback_posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'feedback_posts', postId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
