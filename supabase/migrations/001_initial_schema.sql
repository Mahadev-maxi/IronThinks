-- ==============================================================================
-- 001_initial_schema.sql
-- Production Schema for Gemini Agentic Multilingual Voice & Multimodal Platform
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (Mirrors and extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    preferred_language VARCHAR(10) DEFAULT 'auto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Voice Sessions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    persona_id VARCHAR(50) NOT NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('voice_live', 'interactive_tts')),
    primary_detected_language VARCHAR(20) DEFAULT 'Undetected',
    voice_name VARCHAR(50) DEFAULT 'Puck',
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed', 'failed', 'terminated')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ------------------------------------------------------------------------------
-- 3. Session Transcripts Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    speaker VARCHAR(10) NOT NULL CHECK (speaker IN ('user', 'model', 'system')),
    content TEXT NOT NULL,
    detected_language VARCHAR(20),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audio_offset_ms INTEGER DEFAULT 0
);

-- ------------------------------------------------------------------------------
-- 4. Tool Executions Audit Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    arguments JSONB NOT NULL,
    result JSONB,
    execution_status VARCHAR(20) CHECK (execution_status IN ('pending', 'success', 'error')),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. Session Analytics Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    executive_summary TEXT NOT NULL,
    sentiment_score NUMERIC(3,2), -- Scale: -1.00 to 1.00
    languages_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    collected_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Strategic Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.voice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_session ON public.session_transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_timestamp ON public.session_transcripts(timestamp);
CREATE INDEX IF NOT EXISTS idx_tool_exec_session ON public.tool_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON public.session_analytics(session_id);

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

    DROP POLICY IF EXISTS "Users can view own voice sessions" ON public.voice_sessions;
    DROP POLICY IF EXISTS "Users can insert own voice sessions" ON public.voice_sessions;
    DROP POLICY IF EXISTS "Users can update own voice sessions" ON public.voice_sessions;

    DROP POLICY IF EXISTS "Users can view transcripts from own sessions" ON public.session_transcripts;
    DROP POLICY IF EXISTS "Users can insert transcripts to own sessions" ON public.session_transcripts;

    DROP POLICY IF EXISTS "Users can view tool executions from own sessions" ON public.tool_executions;
    DROP POLICY IF EXISTS "Users can insert tool executions to own sessions" ON public.tool_executions;

    DROP POLICY IF EXISTS "Users can view analytics from own sessions" ON public.session_analytics;
    DROP POLICY IF EXISTS "Users can insert analytics to own sessions" ON public.session_analytics;
    DROP POLICY IF EXISTS "Users can update analytics from own sessions" ON public.session_analytics;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles 
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Voice Sessions Policies
CREATE POLICY "Users can view own voice sessions" ON public.voice_sessions 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice sessions" ON public.voice_sessions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice sessions" ON public.voice_sessions 
    FOR UPDATE USING (auth.uid() = user_id);

-- Session Transcripts Policies
CREATE POLICY "Users can view transcripts from own sessions" ON public.session_transcripts 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.voice_sessions WHERE public.voice_sessions.id = session_transcripts.session_id AND public.voice_sessions.user_id = auth.uid())
    );
CREATE POLICY "Users can insert transcripts to own sessions" ON public.session_transcripts 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.voice_sessions WHERE public.voice_sessions.id = session_transcripts.session_id AND public.voice_sessions.user_id = auth.uid())
    );

-- Tool Executions Policies
CREATE POLICY "Users can view tool executions from own sessions" ON public.tool_executions 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.voice_sessions WHERE public.voice_sessions.id = tool_executions.session_id AND public.voice_sessions.user_id = auth.uid())
    );
CREATE POLICY "Users can insert tool executions to own sessions" ON public.tool_executions 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.voice_sessions WHERE public.voice_sessions.id = tool_executions.session_id AND public.voice_sessions.user_id = auth.uid())
    );

-- Session Analytics Policies
CREATE POLICY "Users can view analytics from own sessions" ON public.session_analytics 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.voice_sessions WHERE public.voice_sessions.id = session_analytics.session_id AND public.voice_sessions.user_id = auth.uid())
    );
CREATE POLICY "Users can insert analytics to own sessions" ON public.session_analytics 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.voice_sessions WHERE public.voice_sessions.id = session_analytics.session_id AND public.voice_sessions.user_id = auth.uid())
    );
CREATE POLICY "Users can update analytics from own sessions" ON public.session_analytics 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.voice_sessions WHERE public.voice_sessions.id = session_analytics.session_id AND public.voice_sessions.user_id = auth.uid())
    );

-- ------------------------------------------------------------------------------
-- Automatic Profile Creation Trigger for Supabase Auth
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, preferred_language)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        'auto'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- Seed Information & Verification Comment
-- ------------------------------------------------------------------------------
COMMENT ON TABLE public.voice_sessions IS 'Stores multi-turn live voice and interactive TTS sessions with persona tracking';
COMMENT ON TABLE public.session_transcripts IS 'Bidirectional real-time transcribed audio segments with speaker identification and detected language';
COMMENT ON TABLE public.tool_executions IS 'Audit trail of all autonomous tool calls initiated by Gemini agentic models during calls';
COMMENT ON TABLE public.session_analytics IS 'Structured post-call intelligence generated by secondary gemini-2.5-flash evaluation';
