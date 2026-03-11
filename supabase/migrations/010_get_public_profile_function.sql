-- ============================================================
-- Function: get_public_profile
-- Returns user profile data via a single DB function call.
-- If the account is deactivated/suspended/deleted, returns
-- only minimal info (id, username, account_status).
-- No personal data is ever leaked for non-active accounts.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_profile(
    p_username text,
    p_viewer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user record;
    v_followers bigint;
    v_following bigint;
    v_projects bigint;
    v_portfolios bigint;
    v_startups_count bigint;
    v_is_following boolean := false;
    v_experiences jsonb;
    v_education jsonb;
    v_startups jsonb;
    v_is_owner boolean;
BEGIN
    -- Step 1: Fetch the user (case-insensitive username match)
    SELECT id, username, full_name, avatar_url, banner_image,
           tagline, current_city, user_type, is_verified,
           about, skills, account_status
    INTO v_user
    FROM public.users
    WHERE lower(username) = lower(p_username)
    LIMIT 1;

    -- User not found
    IF v_user IS NULL THEN
        RETURN NULL;
    END IF;

    -- Step 2: If account is NOT active, return minimal info only
    IF v_user.account_status <> 'active' THEN
        RETURN jsonb_build_object(
            'user', jsonb_build_object(
                'id', v_user.id,
                'username', v_user.username,
                'account_status', v_user.account_status
            ),
            'counts', jsonb_build_object(
                'followers', 0, 'following', 0,
                'projects', 0, 'portfolios', 0, 'startups', 0
            ),
            'experiences', '[]'::jsonb,
            'education', '[]'::jsonb,
            'startups', '[]'::jsonb,
            'viewer', jsonb_build_object('is_following', false)
        );
    END IF;

    -- Step 3: Account is active — fetch all profile data
    v_is_owner := (p_viewer_id IS NOT NULL AND p_viewer_id = v_user.id);

    -- Follower/following counts
    SELECT count(*) INTO v_followers
    FROM public.user_follows WHERE followee_id = v_user.id;

    SELECT count(*) INTO v_following
    FROM public.user_follows WHERE follower_id = v_user.id;

    -- Projects count
    SELECT count(*) INTO v_projects
    FROM public.projects WHERE owner_id = v_user.id;

    -- Portfolios count
    SELECT count(*) INTO v_portfolios
    FROM public.portfolios WHERE user_id = v_user.id;

    -- Is the viewer following this user?
    IF p_viewer_id IS NOT NULL AND p_viewer_id <> v_user.id THEN
        SELECT EXISTS(
            SELECT 1 FROM public.user_follows
            WHERE follower_id = p_viewer_id AND followee_id = v_user.id
        ) INTO v_is_following;
    END IF;

    -- Work experiences with nested positions
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', we.id,
            'user_id', we.user_id,
            'company_name', we.company_name,
            'domain', we.domain,
            'sort_order', we.sort_order,
            'positions', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'experience_id', p.experience_id,
                        'position', p.position,
                        'start_date', p.start_date,
                        'end_date', p.end_date,
                        'description', p.description,
                        'sort_order', p.sort_order
                    ) ORDER BY p.sort_order, p.start_date DESC
                )
                FROM public.positions p
                WHERE p.experience_id = we.id
            ), '[]'::jsonb)
        ) ORDER BY we.sort_order
    ), '[]'::jsonb) INTO v_experiences
    FROM public.work_experiences we WHERE we.user_id = v_user.id;

    -- Education
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ed.id,
            'institution_name', ed.institution_name,
            'institution_domain', ed.institution_domain,
            'degree', ed.degree,
            'field_of_study', ed.field_of_study,
            'start_date', ed.start_date,
            'end_date', ed.end_date,
            'description', ed.description,
            'sort_order', ed.sort_order
        ) ORDER BY ed.sort_order, ed.start_date DESC
    ), '[]'::jsonb) INTO v_education
    FROM public.education ed WHERE ed.user_id = v_user.id;

    -- Startups (respect is_published for non-owners)
    IF v_is_owner THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'brand_name', s.brand_name,
                'stage', s.stage,
                'is_actively_raising', s.is_actively_raising
            ) ORDER BY s.created_at DESC
        ), '[]'::jsonb) INTO v_startups
        FROM public.startup_profiles s WHERE s.owner_id = v_user.id;
    ELSE
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'brand_name', s.brand_name,
                'stage', s.stage,
                'is_actively_raising', s.is_actively_raising
            ) ORDER BY s.created_at DESC
        ), '[]'::jsonb) INTO v_startups
        FROM public.startup_profiles s
        WHERE s.owner_id = v_user.id AND s.is_published = true;
    END IF;

    v_startups_count := jsonb_array_length(v_startups);

    -- Build and return the full profile
    RETURN jsonb_build_object(
        'user', jsonb_build_object(
            'id', v_user.id,
            'username', v_user.username,
            'full_name', v_user.full_name,
            'avatar_url', v_user.avatar_url,
            'banner_image', v_user.banner_image,
            'cover_url', v_user.banner_image,
            'tagline', v_user.tagline,
            'current_city', v_user.current_city,
            'user_type', v_user.user_type,
            'is_verified', v_user.is_verified,
            'about', v_user.about,
            'bio', v_user.about,
            'skills', COALESCE(to_jsonb(v_user.skills), '[]'::jsonb),
            'account_status', 'active'
        ),
        'counts', jsonb_build_object(
            'followers', v_followers,
            'following', v_following,
            'projects', v_projects,
            'portfolios', v_portfolios,
            'startups', v_startups_count
        ),
        'experiences', v_experiences,
        'education', v_education,
        'startups', v_startups,
        'viewer', jsonb_build_object('is_following', v_is_following)
    );
END;
$$;
