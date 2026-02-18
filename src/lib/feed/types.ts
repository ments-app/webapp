// Feed Engine Types

export type FeedEventType =
  | 'impression'
  | 'dwell'
  | 'scroll_past'
  | 'click'
  | 'like'
  | 'unlike'
  | 'reply'
  | 'share'
  | 'bookmark'
  | 'poll_vote'
  | 'profile_click'
  | 'expand_content';

export interface FeedEvent {
  id?: string;
  user_id: string;
  session_id: string;
  post_id: string;
  author_id: string;
  event_type: FeedEventType;
  metadata?: Record<string, unknown>;
  position_in_feed?: number;
  experiment_id?: string | null;
  variant?: string | null;
  created_at?: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  started_at: string;
  last_active_at: string;
  ended_at?: string | null;
  device_type?: string;
  events_count: number;
  feed_depth: number;
}

export interface ContentEmbedding {
  id?: string;
  post_id: string;
  topics: string[];
  keywords: string[];
  sentiment?: number;
  language?: string;
  computed_at: string;
}

export interface PostFeatureVector {
  post_id: string;
  author_id: string;
  // Engagement features
  engagement_score: number;
  virality_velocity: number;
  likes_normalized: number;
  replies_normalized: number;
  // Social features
  is_following: boolean;
  is_fof: boolean;
  interaction_affinity: number;
  creator_affinity: number;
  // Content features
  topic_overlap_score: number;
  content_type_preference: number;
  keyword_match: number;
  // Freshness
  freshness: number;
  age_hours: number;
  // Author features
  is_verified: boolean;
  follower_count_normalized: number;
  // Richness
  has_media: boolean;
  has_poll: boolean;
  content_quality: number;
}

export interface PostFeatures {
  id?: string;
  post_id: string;
  engagement_score: number;
  virality_velocity: number;
  like_rate: number;
  reply_rate: number;
  share_rate: number;
  avg_dwell_ms: number;
  ctr: number;
  content_quality: number;
  computed_at: string;
}

export interface UserInterestProfile {
  id?: string;
  user_id: string;
  topic_scores: Record<string, number>;
  content_type_preferences: Record<string, number>;
  creator_affinities: Record<string, number>;
  interaction_patterns: {
    avg_dwell_ms: number;
    avg_session_depth: number;
    peak_hours: number[];
    preferred_post_types: string[];
  };
  computed_at: string;
}

export interface UserInteractionGraph {
  id?: string;
  user_id: string;
  target_user_id: string;
  interaction_count: number;
  affinity_score: number;
  last_interaction_at: string;
  interaction_types: Record<string, number>;
}

export interface TrendingTopic {
  id?: string;
  topic: string;
  post_count: number;
  engagement_sum: number;
  velocity: number;
  first_seen_at: string;
  last_seen_at: string;
  status: 'rising' | 'trending' | 'declining';
}

export interface FeedCacheEntry {
  id?: string;
  user_id: string;
  post_ids: string[];
  scores: number[];
  computed_at: string;
  expires_at: string;
  version: number;
  experiment_id?: string | null;
  variant?: string | null;
}

export interface FeedExperiment {
  id?: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'ended';
  variants: ExperimentVariant[];
  targeting_rules?: Record<string, unknown>;
  metrics: string[];
  created_at?: string;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  config: Record<string, number>;
}

export interface FeedExperimentAssignment {
  id?: string;
  experiment_id: string;
  user_id: string;
  variant_id: string;
  assigned_at: string;
}

export interface FeedAnalyticsDaily {
  id?: string;
  date: string;
  total_impressions: number;
  total_engagements: number;
  engagement_rate: number;
  avg_dwell_ms: number;
  unique_users: number;
  avg_feed_depth: number;
  content_type_breakdown: Record<string, number>;
  top_posts: string[];
  experiment_id?: string | null;
  variant?: string | null;
}

export interface ScoredPost {
  post_id: string;
  author_id: string;
  score: number;
  tier1_score: number;
  tier2_score?: number;
  features: PostFeatureVector;
  post_data?: Record<string, unknown>;
}

export interface FeedResponse {
  posts: ScoredPost[];
  cursor?: string;
  has_more: boolean;
  source: 'cache' | 'pipeline' | 'fallback';
  experiment_id?: string | null;
  variant?: string | null;
  computed_at: string;
}

export interface FeedRefreshRequest {
  force?: boolean;
}

export interface ExperimentResults {
  experiment: FeedExperiment;
  variants: VariantResult[];
  is_significant: boolean;
  confidence_level: number;
  winner?: string;
}

export interface VariantResult {
  variant_id: string;
  variant_name: string;
  sample_size: number;
  metrics: Record<string, MetricResult>;
}

export interface MetricResult {
  value: number;
  ci_lower: number;
  ci_upper: number;
  relative_change?: number;
  p_value?: number;
  is_significant: boolean;
}
