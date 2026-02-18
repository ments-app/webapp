import type { PostFeatureVector, ScoredPost } from './types';
import { RANKING_WEIGHTS } from './constants';

/**
 * Deterministic Tier 1 scoring with configurable weights.
 * Returns scored posts sorted by score descending.
 */
export function scorePostsDeterministic(
  features: PostFeatureVector[],
  weightOverrides?: Partial<typeof RANKING_WEIGHTS>
): ScoredPost[] {
  const weights = { ...RANKING_WEIGHTS, ...weightOverrides };

  return features
    .map((f) => {
      const score =
        f.engagement_score * weights.engagement +
        f.virality_velocity * weights.virality +
        (f.is_following ? 1 : 0) * weights.following +
        (f.is_fof ? 1 : 0) * weights.fof +
        f.interaction_affinity * weights.interaction_affinity +
        f.creator_affinity * weights.creator_affinity +
        f.topic_overlap_score * weights.topic_overlap +
        f.freshness * weights.freshness +
        f.content_type_preference * weights.content_type +
        (f.has_media ? 1 : 0) * weights.media;

      return {
        post_id: f.post_id,
        author_id: f.author_id,
        score,
        tier1_score: score,
        features: f,
      } as ScoredPost;
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Quick-score a small set of posts (for real-time injection).
 * Uses only Tier 1 deterministic scoring.
 */
export function quickScore(
  features: PostFeatureVector[],
  weightOverrides?: Partial<typeof RANKING_WEIGHTS>
): ScoredPost[] {
  return scorePostsDeterministic(features, weightOverrides);
}
