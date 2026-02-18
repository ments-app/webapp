-- Feed Engine Tables Migration
-- 12 tables for AI-powered personalized feed

-- 1. feed_events: Raw event tracking
CREATE TABLE IF NOT EXISTS feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  post_id UUID NOT NULL,
  author_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression', 'dwell', 'scroll_past', 'click', 'like', 'unlike',
    'reply', 'share', 'bookmark', 'poll_vote', 'profile_click', 'expand_content'
  )),
  metadata JSONB DEFAULT '{}',
  position_in_feed INT,
  experiment_id UUID,
  variant TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_events_user_id ON feed_events(user_id);
CREATE INDEX idx_feed_events_post_id ON feed_events(post_id);
CREATE INDEX idx_feed_events_session ON feed_events(session_id);
CREATE INDEX idx_feed_events_type ON feed_events(event_type);
CREATE INDEX idx_feed_events_created ON feed_events(created_at DESC);
CREATE INDEX idx_feed_events_user_type ON feed_events(user_id, event_type);
CREATE INDEX idx_feed_events_experiment ON feed_events(experiment_id, variant) WHERE experiment_id IS NOT NULL;

-- 2. user_sessions: Session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  device_type TEXT,
  events_count INT NOT NULL DEFAULT 0,
  feed_depth INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(last_active_at DESC);

-- 3. feed_seen_posts: Track which posts each user has seen
CREATE TABLE IF NOT EXISTS feed_seen_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_feed_seen_unique ON feed_seen_posts(user_id, post_id);
CREATE INDEX idx_feed_seen_user ON feed_seen_posts(user_id, seen_at DESC);

-- 4. content_embeddings: AI-extracted topics/keywords per post
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE,
  topics TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  sentiment FLOAT,
  language TEXT DEFAULT 'en',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_embeddings_post ON content_embeddings(post_id);
CREATE INDEX idx_content_embeddings_topics ON content_embeddings USING GIN(topics);

-- 5. post_features: Pre-computed engagement scores per post
CREATE TABLE IF NOT EXISTS post_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE,
  engagement_score FLOAT NOT NULL DEFAULT 0,
  virality_velocity FLOAT NOT NULL DEFAULT 0,
  like_rate FLOAT NOT NULL DEFAULT 0,
  reply_rate FLOAT NOT NULL DEFAULT 0,
  share_rate FLOAT NOT NULL DEFAULT 0,
  avg_dwell_ms FLOAT NOT NULL DEFAULT 0,
  ctr FLOAT NOT NULL DEFAULT 0,
  content_quality FLOAT NOT NULL DEFAULT 0.5,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_features_post ON post_features(post_id);
CREATE INDEX idx_post_features_engagement ON post_features(engagement_score DESC);

-- 6. user_interest_profiles: Aggregated per-user interests
CREATE TABLE IF NOT EXISTS user_interest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_scores JSONB NOT NULL DEFAULT '{}',
  content_type_preferences JSONB NOT NULL DEFAULT '{}',
  creator_affinities JSONB NOT NULL DEFAULT '{}',
  interaction_patterns JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_interest_user ON user_interest_profiles(user_id);

-- 7. user_interaction_graph: Pairwise user-to-user interaction frequency
CREATE TABLE IF NOT EXISTS user_interaction_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL,
  interaction_count INT NOT NULL DEFAULT 0,
  affinity_score FLOAT NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  interaction_types JSONB NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX idx_interaction_graph_unique ON user_interaction_graph(user_id, target_user_id);
CREATE INDEX idx_interaction_graph_user ON user_interaction_graph(user_id, affinity_score DESC);

-- 8. trending_topics: Detected trending topics with velocity
CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL UNIQUE,
  post_count INT NOT NULL DEFAULT 0,
  engagement_sum FLOAT NOT NULL DEFAULT 0,
  velocity FLOAT NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'rising' CHECK (status IN ('rising', 'trending', 'declining'))
);

CREATE INDEX idx_trending_topics_velocity ON trending_topics(velocity DESC);
CREATE INDEX idx_trending_topics_status ON trending_topics(status);

-- 9. feed_cache: Pre-computed personalized feeds
CREATE TABLE IF NOT EXISTS feed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_ids UUID[] NOT NULL DEFAULT '{}',
  scores FLOAT[] NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  version INT NOT NULL DEFAULT 1,
  experiment_id UUID,
  variant TEXT
);

CREATE INDEX idx_feed_cache_user ON feed_cache(user_id);
CREATE INDEX idx_feed_cache_expires ON feed_cache(expires_at);
CREATE INDEX idx_feed_cache_user_expires ON feed_cache(user_id, expires_at DESC);

-- 10. feed_experiments: A/B test experiment definitions
CREATE TABLE IF NOT EXISTS feed_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  variants JSONB NOT NULL DEFAULT '[]',
  targeting_rules JSONB DEFAULT '{}',
  metrics TEXT[] NOT NULL DEFAULT ARRAY['engagement_rate', 'ctr', 'avg_dwell_ms'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_feed_experiments_status ON feed_experiments(status);

-- 11. feed_experiment_assignments: User-to-experiment-variant mapping
CREATE TABLE IF NOT EXISTS feed_experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES feed_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_experiment_assignment_unique ON feed_experiment_assignments(experiment_id, user_id);
CREATE INDEX idx_experiment_assignment_user ON feed_experiment_assignments(user_id);

-- 12. feed_analytics_daily: Aggregated daily metrics
CREATE TABLE IF NOT EXISTS feed_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_impressions BIGINT NOT NULL DEFAULT 0,
  total_engagements BIGINT NOT NULL DEFAULT 0,
  engagement_rate FLOAT NOT NULL DEFAULT 0,
  avg_dwell_ms FLOAT NOT NULL DEFAULT 0,
  unique_users INT NOT NULL DEFAULT 0,
  avg_feed_depth FLOAT NOT NULL DEFAULT 0,
  content_type_breakdown JSONB NOT NULL DEFAULT '{}',
  top_posts UUID[] NOT NULL DEFAULT '{}',
  experiment_id UUID,
  variant TEXT
);

CREATE UNIQUE INDEX idx_analytics_daily_date ON feed_analytics_daily(date, experiment_id, variant);
CREATE INDEX idx_analytics_daily_date_only ON feed_analytics_daily(date DESC);

-- Enable RLS on all tables
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_seen_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interaction_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read/write their own data
CREATE POLICY "Users can insert their own events" ON feed_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read their own events" ON feed_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their sessions" ON user_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their seen posts" ON feed_seen_posts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read content embeddings" ON content_embeddings FOR SELECT USING (true);
CREATE POLICY "Service role can manage content embeddings" ON content_embeddings FOR ALL USING (true);

CREATE POLICY "Anyone can read post features" ON post_features FOR SELECT USING (true);
CREATE POLICY "Service role can manage post features" ON post_features FOR ALL USING (true);

CREATE POLICY "Users can read their own interest profile" ON user_interest_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage interest profiles" ON user_interest_profiles FOR ALL USING (true);

CREATE POLICY "Users can read their own interaction graph" ON user_interaction_graph FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage interaction graph" ON user_interaction_graph FOR ALL USING (true);

CREATE POLICY "Anyone can read trending topics" ON trending_topics FOR SELECT USING (true);
CREATE POLICY "Service role can manage trending topics" ON trending_topics FOR ALL USING (true);

CREATE POLICY "Users can manage their feed cache" ON feed_cache FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read experiments" ON feed_experiments FOR SELECT USING (true);
CREATE POLICY "Service role can manage experiments" ON feed_experiments FOR ALL USING (true);

CREATE POLICY "Users can read their own assignments" ON feed_experiment_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage assignments" ON feed_experiment_assignments FOR ALL USING (true);

CREATE POLICY "Anyone can read analytics" ON feed_analytics_daily FOR SELECT USING (true);
CREATE POLICY "Service role can manage analytics" ON feed_analytics_daily FOR ALL USING (true);
