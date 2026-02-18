-- Feed Engine RPC Functions

-- 1. get_feed_candidates: Pull candidate posts for ranking
CREATE OR REPLACE FUNCTION get_feed_candidates(
  p_user_id UUID,
  p_limit INT DEFAULT 200,
  p_max_age_hours INT DEFAULT 72
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  environment_id UUID,
  content TEXT,
  post_type TEXT,
  created_at TIMESTAMPTZ,
  likes_count BIGINT,
  replies_count BIGINT,
  has_media BOOLEAN,
  has_poll BOOLEAN,
  author_username TEXT,
  author_full_name TEXT,
  author_avatar_url TEXT,
  author_is_verified BOOLEAN,
  author_follower_count BIGINT,
  is_following BOOLEAN,
  is_fof BOOLEAN
) AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := now() - (p_max_age_hours || ' hours')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH
    -- Users the viewer follows
    following AS (
      SELECT followee_id FROM user_follows WHERE follower_id = p_user_id
    ),
    -- Friends-of-friends (2nd degree)
    fof AS (
      SELECT DISTINCT uf2.followee_id
      FROM user_follows uf1
      JOIN user_follows uf2 ON uf1.followee_id = uf2.follower_id
      WHERE uf1.follower_id = p_user_id
        AND uf2.followee_id != p_user_id
        AND uf2.followee_id NOT IN (SELECT followee_id FROM following)
      LIMIT 100
    ),
    -- Posts already seen by user
    seen AS (
      SELECT post_id FROM feed_seen_posts WHERE user_id = p_user_id
    ),
    -- Candidate posts
    candidates AS (
      -- Posts from followed users
      (SELECT p.id, p.author_id, 1 AS source_priority
       FROM posts p
       WHERE p.author_id IN (SELECT followee_id FROM following)
         AND p.deleted = false
         AND p.parent_post_id IS NULL
         AND p.created_at > v_cutoff
         AND p.id NOT IN (SELECT post_id FROM seen)
       ORDER BY p.created_at DESC
       LIMIT p_limit / 2)
      UNION ALL
      -- Posts from friends-of-friends
      (SELECT p.id, p.author_id, 2 AS source_priority
       FROM posts p
       WHERE p.author_id IN (SELECT followee_id FROM fof)
         AND p.deleted = false
         AND p.parent_post_id IS NULL
         AND p.created_at > v_cutoff
         AND p.id NOT IN (SELECT post_id FROM seen)
       ORDER BY p.created_at DESC
       LIMIT p_limit / 4)
      UNION ALL
      -- Trending/high-engagement posts
      (SELECT p.id, p.author_id, 3 AS source_priority
       FROM posts p
       JOIN post_features pf ON pf.post_id = p.id
       WHERE p.deleted = false
         AND p.parent_post_id IS NULL
         AND p.created_at > v_cutoff
         AND p.id NOT IN (SELECT post_id FROM seen)
         AND p.author_id != p_user_id
       ORDER BY pf.engagement_score DESC
       LIMIT p_limit / 4)
    )
  SELECT DISTINCT ON (p.id)
    p.id,
    p.author_id,
    p.environment_id,
    p.content,
    p.post_type,
    p.created_at,
    COALESCE(lc.cnt, 0) AS likes_count,
    COALESCE(rc.cnt, 0) AS replies_count,
    EXISTS(SELECT 1 FROM post_media pm WHERE pm.post_id = p.id) AS has_media,
    EXISTS(SELECT 1 FROM post_polls pp WHERE pp.post_id = p.id) AS has_poll,
    u.username AS author_username,
    u.full_name AS author_full_name,
    u.avatar_url AS author_avatar_url,
    COALESCE(u.is_verified, false) AS author_is_verified,
    COALESCE(fc.cnt, 0) AS author_follower_count,
    EXISTS(SELECT 1 FROM following f WHERE f.followee_id = p.author_id) AS is_following,
    EXISTS(SELECT 1 FROM fof ff WHERE ff.followee_id = p.author_id) AS is_fof
  FROM candidates c
  JOIN posts p ON p.id = c.id
  JOIN users u ON u.id = p.author_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt FROM post_likes WHERE post_id = p.id
  ) lc ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt FROM posts WHERE parent_post_id = p.id AND deleted = false
  ) rc ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt FROM user_follows WHERE followee_id = p.author_id
  ) fc ON true
  ORDER BY p.id, c.source_priority ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. batch_insert_feed_events: Bulk event insertion
CREATE OR REPLACE FUNCTION batch_insert_feed_events(events JSONB)
RETURNS INT AS $$
DECLARE
  inserted_count INT;
BEGIN
  INSERT INTO feed_events (user_id, session_id, post_id, author_id, event_type, metadata, position_in_feed, experiment_id, variant, created_at)
  SELECT
    (e->>'user_id')::UUID,
    e->>'session_id',
    (e->>'post_id')::UUID,
    (e->>'author_id')::UUID,
    e->>'event_type',
    COALESCE(e->'metadata', '{}')::JSONB,
    (e->>'position_in_feed')::INT,
    (e->>'experiment_id')::UUID,
    e->>'variant',
    COALESCE((e->>'created_at')::TIMESTAMPTZ, now())
  FROM jsonb_array_elements(events) AS e;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Also mark posts as seen for impression events
  INSERT INTO feed_seen_posts (user_id, post_id)
  SELECT DISTINCT
    (e->>'user_id')::UUID,
    (e->>'post_id')::UUID
  FROM jsonb_array_elements(events) AS e
  WHERE e->>'event_type' = 'impression'
  ON CONFLICT (user_id, post_id) DO NOTHING;

  -- Update session stats
  UPDATE user_sessions
  SET
    events_count = events_count + 1,
    last_active_at = now(),
    feed_depth = GREATEST(feed_depth, COALESCE((
      SELECT MAX((e->>'position_in_feed')::INT)
      FROM jsonb_array_elements(events) AS e
      WHERE e->>'session_id' = user_sessions.id
    ), feed_depth))
  WHERE id IN (
    SELECT DISTINCT e->>'session_id'
    FROM jsonb_array_elements(events) AS e
  );

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. compute_user_interest_profile: Aggregate events into interest profiles
CREATE OR REPLACE FUNCTION compute_user_interest_profile(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_topic_scores JSONB := '{}';
  v_content_type_prefs JSONB := '{}';
  v_creator_affinities JSONB := '{}';
  v_interaction_patterns JSONB := '{}';
  v_decay_factor FLOAT;
  v_event_weight FLOAT;
BEGIN
  -- Compute topic scores with time-decay weighting
  WITH event_topics AS (
    SELECT
      fe.event_type,
      fe.created_at,
      ce.topics,
      CASE fe.event_type
        WHEN 'reply' THEN 5.0
        WHEN 'share' THEN 4.0
        WHEN 'like' THEN 3.0
        WHEN 'bookmark' THEN 3.0
        WHEN 'poll_vote' THEN 2.5
        WHEN 'click' THEN 2.0
        WHEN 'profile_click' THEN 1.5
        WHEN 'expand_content' THEN 1.0
        WHEN 'dwell' THEN 0.5
        WHEN 'impression' THEN 0.1
        ELSE 0
      END AS weight,
      EXP(-EXTRACT(EPOCH FROM (now() - fe.created_at)) / (7 * 86400)) AS decay
    FROM feed_events fe
    JOIN content_embeddings ce ON ce.post_id = fe.post_id
    WHERE fe.user_id = p_user_id
      AND fe.created_at > now() - INTERVAL '30 days'
  ),
  topic_agg AS (
    SELECT
      topic,
      SUM(et.weight * et.decay) AS score
    FROM event_topics et, unnest(et.topics) AS topic
    GROUP BY topic
    ORDER BY score DESC
    LIMIT 50
  )
  SELECT COALESCE(jsonb_object_agg(topic, ROUND(score::NUMERIC, 4)), '{}')
  INTO v_topic_scores
  FROM topic_agg;

  -- Compute content type preferences
  WITH type_engagement AS (
    SELECT
      p.post_type,
      COUNT(*) FILTER (WHERE fe.event_type IN ('like', 'reply', 'share', 'bookmark', 'click')) AS engagements,
      COUNT(*) FILTER (WHERE fe.event_type = 'impression') AS impressions
    FROM feed_events fe
    JOIN posts p ON p.id = fe.post_id
    WHERE fe.user_id = p_user_id
      AND fe.created_at > now() - INTERVAL '14 days'
    GROUP BY p.post_type
  )
  SELECT COALESCE(jsonb_object_agg(
    post_type,
    CASE WHEN impressions > 0 THEN ROUND((engagements::NUMERIC / impressions), 4) ELSE 0 END
  ), '{}')
  INTO v_content_type_prefs
  FROM type_engagement;

  -- Compute creator affinities (top 50)
  WITH creator_scores AS (
    SELECT
      fe.author_id::TEXT AS creator_id,
      SUM(CASE fe.event_type
        WHEN 'reply' THEN 5.0
        WHEN 'share' THEN 4.0
        WHEN 'like' THEN 3.0
        WHEN 'bookmark' THEN 3.0
        WHEN 'click' THEN 2.0
        ELSE 0.5
      END * EXP(-EXTRACT(EPOCH FROM (now() - fe.created_at)) / (7 * 86400))) AS affinity
    FROM feed_events fe
    WHERE fe.user_id = p_user_id
      AND fe.created_at > now() - INTERVAL '30 days'
      AND fe.author_id != p_user_id
    GROUP BY fe.author_id
    ORDER BY affinity DESC
    LIMIT 50
  )
  SELECT COALESCE(jsonb_object_agg(creator_id, ROUND(affinity::NUMERIC, 4)), '{}')
  INTO v_creator_affinities
  FROM creator_scores;

  -- Compute interaction patterns
  SELECT jsonb_build_object(
    'avg_dwell_ms', COALESCE((
      SELECT AVG((metadata->>'dwell_ms')::FLOAT)
      FROM feed_events
      WHERE user_id = p_user_id AND event_type = 'dwell'
        AND created_at > now() - INTERVAL '14 days'
    ), 0),
    'avg_session_depth', COALESCE((
      SELECT AVG(feed_depth)
      FROM user_sessions
      WHERE user_id = p_user_id
        AND started_at > now() - INTERVAL '14 days'
    ), 0),
    'peak_hours', COALESCE((
      SELECT jsonb_agg(hour ORDER BY cnt DESC)
      FROM (
        SELECT EXTRACT(HOUR FROM created_at)::INT AS hour, COUNT(*) AS cnt
        FROM feed_events
        WHERE user_id = p_user_id AND created_at > now() - INTERVAL '14 days'
        GROUP BY hour
        ORDER BY cnt DESC
        LIMIT 5
      ) h
    ), '[]'),
    'preferred_post_types', COALESCE((
      SELECT jsonb_agg(post_type)
      FROM (
        SELECT p.post_type, COUNT(*) AS cnt
        FROM feed_events fe
        JOIN posts p ON p.id = fe.post_id
        WHERE fe.user_id = p_user_id
          AND fe.event_type IN ('like', 'reply', 'share')
          AND fe.created_at > now() - INTERVAL '14 days'
        GROUP BY p.post_type
        ORDER BY cnt DESC
      ) t
    ), '[]')
  )
  INTO v_interaction_patterns;

  -- Upsert the profile
  INSERT INTO user_interest_profiles (user_id, topic_scores, content_type_preferences, creator_affinities, interaction_patterns, computed_at)
  VALUES (p_user_id, v_topic_scores, v_content_type_prefs, v_creator_affinities, v_interaction_patterns, now())
  ON CONFLICT (user_id) DO UPDATE SET
    topic_scores = EXCLUDED.topic_scores,
    content_type_preferences = EXCLUDED.content_type_preferences,
    creator_affinities = EXCLUDED.creator_affinities,
    interaction_patterns = EXCLUDED.interaction_patterns,
    computed_at = EXCLUDED.computed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. compute_post_features: Calculate engagement metrics for a post
CREATE OR REPLACE FUNCTION compute_post_features(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  v_engagement_score FLOAT := 0;
  v_virality_velocity FLOAT := 0;
  v_like_rate FLOAT := 0;
  v_reply_rate FLOAT := 0;
  v_share_rate FLOAT := 0;
  v_avg_dwell FLOAT := 0;
  v_ctr FLOAT := 0;
  v_impressions BIGINT := 0;
  v_engagements BIGINT := 0;
  v_quality FLOAT := 0.5;
BEGIN
  -- Count impressions
  SELECT COUNT(*) INTO v_impressions
  FROM feed_events WHERE post_id = p_post_id AND event_type = 'impression';

  -- Count total engagements (weighted)
  SELECT
    COALESCE(SUM(CASE event_type
      WHEN 'like' THEN 3
      WHEN 'reply' THEN 5
      WHEN 'share' THEN 4
      WHEN 'bookmark' THEN 3
      WHEN 'click' THEN 1
      WHEN 'poll_vote' THEN 2
      ELSE 0
    END), 0)
  INTO v_engagements
  FROM feed_events WHERE post_id = p_post_id;

  -- Engagement score (normalized 0-1)
  v_engagement_score := LEAST(v_engagements::FLOAT / GREATEST(v_impressions, 1) * 10, 1.0);

  -- Virality velocity: engagement growth rate in last 2 hours
  SELECT COALESCE(COUNT(*)::FLOAT / 2.0, 0) INTO v_virality_velocity
  FROM feed_events
  WHERE post_id = p_post_id
    AND event_type IN ('like', 'reply', 'share')
    AND created_at > now() - INTERVAL '2 hours';

  -- Individual rates
  IF v_impressions > 0 THEN
    SELECT
      COALESCE(COUNT(*) FILTER (WHERE event_type = 'like')::FLOAT / v_impressions, 0),
      COALESCE(COUNT(*) FILTER (WHERE event_type = 'reply')::FLOAT / v_impressions, 0),
      COALESCE(COUNT(*) FILTER (WHERE event_type = 'share')::FLOAT / v_impressions, 0),
      COALESCE(COUNT(*) FILTER (WHERE event_type = 'click')::FLOAT / v_impressions, 0)
    INTO v_like_rate, v_reply_rate, v_share_rate, v_ctr
    FROM feed_events WHERE post_id = p_post_id;
  END IF;

  -- Average dwell time
  SELECT COALESCE(AVG((metadata->>'dwell_ms')::FLOAT), 0)
  INTO v_avg_dwell
  FROM feed_events
  WHERE post_id = p_post_id AND event_type = 'dwell';

  -- Content quality heuristic (based on content length, media presence)
  SELECT
    LEAST(1.0,
      0.3 * CASE WHEN LENGTH(COALESCE(p.content, '')) > 100 THEN 1 ELSE 0.5 END +
      0.3 * CASE WHEN EXISTS(SELECT 1 FROM post_media WHERE post_id = p.id) THEN 1 ELSE 0 END +
      0.2 * CASE WHEN p.post_type = 'poll' THEN 1 ELSE 0 END +
      0.2 * CASE WHEN COALESCE(u.is_verified, false) THEN 1 ELSE 0 END
    )
  INTO v_quality
  FROM posts p
  JOIN users u ON u.id = p.author_id
  WHERE p.id = p_post_id;

  -- Upsert
  INSERT INTO post_features (post_id, engagement_score, virality_velocity, like_rate, reply_rate, share_rate, avg_dwell_ms, ctr, content_quality, computed_at)
  VALUES (p_post_id, v_engagement_score, v_virality_velocity, v_like_rate, v_reply_rate, v_share_rate, v_avg_dwell, v_ctr, COALESCE(v_quality, 0.5), now())
  ON CONFLICT (post_id) DO UPDATE SET
    engagement_score = EXCLUDED.engagement_score,
    virality_velocity = EXCLUDED.virality_velocity,
    like_rate = EXCLUDED.like_rate,
    reply_rate = EXCLUDED.reply_rate,
    share_rate = EXCLUDED.share_rate,
    avg_dwell_ms = EXCLUDED.avg_dwell_ms,
    ctr = EXCLUDED.ctr,
    content_quality = EXCLUDED.content_quality,
    computed_at = EXCLUDED.computed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. update_interaction_graph: Incremental affinity update
CREATE OR REPLACE FUNCTION update_interaction_graph(
  p_user_id UUID,
  p_target_user_id UUID,
  p_event_type TEXT
)
RETURNS VOID AS $$
DECLARE
  v_weight FLOAT;
BEGIN
  -- Determine event weight
  v_weight := CASE p_event_type
    WHEN 'reply' THEN 5.0
    WHEN 'share' THEN 4.0
    WHEN 'like' THEN 3.0
    WHEN 'bookmark' THEN 3.0
    WHEN 'click' THEN 1.0
    WHEN 'profile_click' THEN 2.0
    ELSE 0.5
  END;

  INSERT INTO user_interaction_graph (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at, interaction_types)
  VALUES (
    p_user_id,
    p_target_user_id,
    1,
    v_weight,
    now(),
    jsonb_build_object(p_event_type, 1)
  )
  ON CONFLICT (user_id, target_user_id) DO UPDATE SET
    interaction_count = user_interaction_graph.interaction_count + 1,
    affinity_score = user_interaction_graph.affinity_score * 0.95 + v_weight,
    last_interaction_at = now(),
    interaction_types = jsonb_set(
      user_interaction_graph.interaction_types,
      ARRAY[p_event_type],
      to_jsonb(COALESCE((user_interaction_graph.interaction_types->>p_event_type)::INT, 0) + 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
