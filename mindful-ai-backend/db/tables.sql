-- DROP TABLES
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- USERS TABLE
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    profile_picture VARCHAR(255),
    total_sessions INT DEFAULT 0,
    progress_rating VARCHAR(20) CHECK (progress_rating IN ('declining', 'neutral', 'improving'))
);

-- USER_SESSIONS TABLE
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_time_minutes INT NOT NULL,
    session_rating VARCHAR(20) CHECK (session_rating IN ('challenging', 'neutral', 'positive')),
    session_summary TEXT,
    session_transcript TEXT, 
    embedding vector(1536)
);

-- Example index for faster lookups by user
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id); 