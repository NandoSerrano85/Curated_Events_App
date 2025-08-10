-- Rollback users table migration

-- Drop indexes
DROP INDEX IF EXISTS idx_user_sessions_is_active;
DROP INDEX IF EXISTS idx_user_sessions_expires_at;
DROP INDEX IF EXISTS idx_user_sessions_session_token;
DROP INDEX IF EXISTS idx_user_sessions_user_id;

DROP INDEX IF EXISTS idx_user_preferences_user_id;

DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_users_email;

-- Drop tables
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS users;

-- Drop types
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS user_status;