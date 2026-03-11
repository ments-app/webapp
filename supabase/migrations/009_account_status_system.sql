-- ============================================================
-- Migration: Account Status & Soft-Delete System
-- Replaces is_suspended with a proper account lifecycle model
-- Supports: active, deactivated, suspended, deleted
-- ============================================================

-- 1. Add account_status column with CHECK constraint
ALTER TABLE public.users
ADD COLUMN account_status text NOT NULL DEFAULT 'active',
ADD COLUMN status_reason text,
ADD COLUMN status_changed_at timestamp with time zone DEFAULT now(),
ADD COLUMN status_changed_by uuid;

ALTER TABLE public.users
ADD CONSTRAINT users_account_status_check
CHECK (account_status IN ('active', 'deactivated', 'suspended', 'deleted'));

-- 2. Migrate existing suspension data to new status system
UPDATE public.users
SET
    account_status = 'suspended',
    status_reason = suspended_reason,
    status_changed_at = suspended_at
WHERE is_suspended = true;

-- 3. Drop old suspension columns (data already migrated above)
ALTER TABLE public.users
DROP COLUMN is_suspended,
DROP COLUMN suspended_at,
DROP COLUMN suspended_reason;

-- 4. Index for fast auth-time lookups
CREATE INDEX IF NOT EXISTS idx_users_account_status
ON public.users (account_status);

-- ============================================================
-- RPC: soft_delete_user
-- Called when a user permanently deletes their account.
-- - Hashes PII (email) with SHA-256
-- - Nullifies personal fields
-- - Frees the original username
-- - Hard-deletes all messages and conversations
-- ============================================================
CREATE OR REPLACE FUNCTION public.soft_delete_user(
    p_user_id uuid,
    p_reason text DEFAULT 'User requested permanent deletion'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hashed_email text;
    v_deleted_username text;
BEGIN
    -- Verify the user exists and is not already deleted
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_user_id AND account_status <> 'deleted'
    ) THEN
        RAISE EXCEPTION 'User not found or already deleted';
    END IF;

    -- Hash the email for audit trail (irreversible)
    SELECT encode(extensions.digest(email, 'sha256'), 'hex')
    INTO v_hashed_email
    FROM public.users
    WHERE id = p_user_id;

    -- Generate a unique deleted username to free the original
    v_deleted_username := 'deleted_' || left(p_user_id::text, 8);

    -- Scrub PII and update account status
    UPDATE public.users
    SET
        account_status   = 'deleted',
        status_reason    = p_reason,
        status_changed_at = now(),
        status_changed_by = p_user_id,
        email            = v_hashed_email,
        username         = v_deleted_username,
        full_name        = 'Deleted User',
        about            = NULL,
        current_city     = NULL,
        tagline          = NULL,
        avatar_url       = NULL,
        banner_image     = NULL,
        fcm_token        = NULL,
        linkedin         = NULL,
        skills           = '{}',
        looking_for      = '{}',
        is_verified      = false,
        primary_interest = 'exploring',
        investor_status  = 'none',
        investor_verified_at = NULL
    WHERE id = p_user_id;

    -- Hard-delete all messages sent by this user
    DELETE FROM public.messages
    WHERE sender_id = p_user_id;

    -- Hard-delete conversations where user is a participant
    DELETE FROM public.conversations
    WHERE user1_id = p_user_id OR user2_id = p_user_id;

    RETURN true;
END;
$$;

-- ============================================================
-- RPC: deactivate_user
-- User voluntarily hides their account. Data is preserved.
-- ============================================================
CREATE OR REPLACE FUNCTION public.deactivate_user(
    p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET
        account_status    = 'deactivated',
        status_reason     = 'User requested deactivation',
        status_changed_at = now(),
        status_changed_by = p_user_id
    WHERE id = p_user_id
      AND account_status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or account is not active';
    END IF;

    RETURN true;
END;
$$;

-- ============================================================
-- RPC: reactivate_user
-- Restores a deactivated account back to active.
-- Only works for deactivated accounts (not deleted/suspended).
-- ============================================================
CREATE OR REPLACE FUNCTION public.reactivate_user(
    p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET
        account_status    = 'active',
        status_reason     = 'Account reactivated by user',
        status_changed_at = now(),
        status_changed_by = p_user_id
    WHERE id = p_user_id
      AND account_status = 'deactivated';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or account is not deactivated';
    END IF;

    RETURN true;
END;
$$;
