import type { ScoredPost } from './types';
import {
  MAX_SAME_AUTHOR_IN_TOP_20,
  MAX_CONSECUTIVE_SAME_TYPE,
  MIN_FRESH_POSTS_IN_TOP_10,
  FRESH_POST_MAX_AGE_HOURS,
  NEW_CREATOR_BOOST,
  NEW_CREATOR_AGE_DAYS,
} from './constants';

/**
 * Apply diversity rules and post-LLM re-ranking adjustments.
 */
export function applyDiversityRules(
  scored: ScoredPost[],
  experimentOverrides?: Record<string, number>
): ScoredPost[] {
  if (scored.length === 0) return scored;

  let result = [...scored];

  // Apply experiment weight overrides
  if (experimentOverrides) {
    result = result.map((s) => {
      let boost = 1;
      if (experimentOverrides.diversity_weight) {
        // This would adjust scoring, but since we're post-scoring, we use it as a multiplier
        boost *= experimentOverrides.diversity_weight;
      }
      if (experimentOverrides.freshness_weight) {
        boost *= 1 + (s.features.freshness - 0.5) * experimentOverrides.freshness_weight;
      }
      return { ...s, score: s.score * boost };
    });
    result.sort((a, b) => b.score - a.score);
  }

  // New creator boost (accounts < 30 days)
  // We approximate this by checking if the post features indicate a new creator
  // In production, we'd check the account creation date
  result = result.map((s) => {
    if (s.features.follower_count_normalized < 0.01) {
      return { ...s, score: s.score * NEW_CREATOR_BOOST };
    }
    return s;
  });

  // Rule 1: Max 2 posts from same author in top 20
  result = enforceAuthorDiversity(result, 20, MAX_SAME_AUTHOR_IN_TOP_20);

  // Rule 2: No more than 3 consecutive same-type posts
  result = enforceTypeVariety(result, MAX_CONSECUTIVE_SAME_TYPE);

  // Rule 3: At least 30% of top 10 from last 6 hours
  result = enforceFreshness(result, 10, MIN_FRESH_POSTS_IN_TOP_10, FRESH_POST_MAX_AGE_HOURS);

  return result;
}

function enforceAuthorDiversity(
  posts: ScoredPost[],
  windowSize: number,
  maxPerAuthor: number
): ScoredPost[] {
  const result: ScoredPost[] = [];
  const authorCounts = new Map<string, number>();
  const deferred: ScoredPost[] = [];

  for (const post of posts) {
    if (result.length < windowSize) {
      const count = authorCounts.get(post.author_id) || 0;
      if (count >= maxPerAuthor) {
        deferred.push(post);
        continue;
      }
      authorCounts.set(post.author_id, count + 1);
    }
    result.push(post);
  }

  // Append deferred posts after the window
  if (deferred.length > 0) {
    const insertAt = Math.min(windowSize, result.length);
    result.splice(insertAt, 0, ...deferred);
  }

  return result;
}

function enforceTypeVariety(posts: ScoredPost[], maxConsecutive: number): ScoredPost[] {
  if (posts.length <= maxConsecutive) return posts;

  const result: ScoredPost[] = [posts[0]];
  let consecutiveCount = 1;
  let lastType = getPostType(posts[0]);
  const skipped: ScoredPost[] = [];

  for (let i = 1; i < posts.length; i++) {
    const currentType = getPostType(posts[i]);
    if (currentType === lastType) {
      consecutiveCount++;
      if (consecutiveCount > maxConsecutive) {
        skipped.push(posts[i]);
        continue;
      }
    } else {
      consecutiveCount = 1;
      lastType = currentType;
    }
    result.push(posts[i]);
  }

  // Interleave skipped posts
  for (const post of skipped) {
    let inserted = false;
    for (let i = 1; i < result.length; i++) {
      const prevType = getPostType(result[i - 1]);
      const nextType = getPostType(result[i]);
      const postType = getPostType(post);
      if (prevType !== postType || nextType !== postType) {
        result.splice(i, 0, post);
        inserted = true;
        break;
      }
    }
    if (!inserted) result.push(post);
  }

  return result;
}

function enforceFreshness(
  posts: ScoredPost[],
  windowSize: number,
  minFreshRatio: number,
  maxAgeHours: number
): ScoredPost[] {
  const window = posts.slice(0, windowSize);
  const rest = posts.slice(windowSize);

  const freshInWindow = window.filter((p) => p.features.age_hours <= maxAgeHours).length;
  const needed = Math.ceil(windowSize * minFreshRatio) - freshInWindow;

  if (needed <= 0) return posts;

  // Find fresh posts from the rest to promote
  const freshFromRest = rest.filter((p) => p.features.age_hours <= maxAgeHours);
  const toPromote = freshFromRest.slice(0, needed);

  if (toPromote.length === 0) return posts;

  // Remove promoted posts from rest
  const promotedIds = new Set(toPromote.map((p) => p.post_id));
  const newRest = rest.filter((p) => !promotedIds.has(p.post_id));

  // Insert fresh posts at even intervals in the window
  const result = [...window];
  const interval = Math.max(1, Math.floor(windowSize / (toPromote.length + 1)));

  for (let i = 0; i < toPromote.length; i++) {
    const insertAt = Math.min((i + 1) * interval, result.length);
    result.splice(insertAt, 0, toPromote[i]);
  }

  return [...result, ...newRest];
}

function getPostType(post: ScoredPost): string {
  if (post.features.has_poll) return 'poll';
  if (post.features.has_media) return 'media';
  return 'text';
}
