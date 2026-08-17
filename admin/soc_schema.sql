-- 1. Create the custom ENUM types
CREATE TYPE security_event_type AS ENUM (
    'login_success', 
    'login_failed', 
    'brute_force_detected', 
    'suspicious_activity',
    'password_reset'
);

CREATE TYPE security_severity AS ENUM (
    'INFO', 
    'LOW', 
    'MEDIUM', 
    'HIGH', 
    'CRITICAL'
);

-- 2. Create the security_events table
CREATE TABLE IF NOT EXISTS public.security_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type security_event_type NOT NULL,
    username text,
    ip_address text,
    user_agent text,
    severity security_severity NOT NULL DEFAULT 'INFO',
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Enable RLS but allow Service Role full access
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Service Role full access on security_events"
    ON public.security_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Create an index on created_at and event_type for faster dashboard queries
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events (event_type);

-- 5. RPC function to safely insert logs without exposing table to anon
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type text,
    p_username text,
    p_ip text,
    p_user_agent text,
    p_severity text,
    p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as the definer (creator) of the function
AS $$
BEGIN
    INSERT INTO public.security_events (event_type, username, ip_address, user_agent, severity, details)
    VALUES (
        p_event_type::security_event_type, 
        p_username, 
        p_ip, 
        p_user_agent, 
        p_severity::security_severity, 
        COALESCE(p_details, '{}'::jsonb)
    );
END;
$$;
