-- ============================================================
-- MIGRATION: Database-Backed Persistent Rate Limiting
-- Guarantees atomic, synchronized rate limiting across Vercel
-- serverless cold-starts and multi-region Deno Edge Functions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_time
  ON public.api_rate_limits (bucket_key, created_at DESC);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomic sliding window rate-limiter function callable from Deno Edge Functions & Node
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key text,
  p_max_requests integer DEFAULT 10,
  p_window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;

  -- Count recent requests for this bucket key within the sliding window
  SELECT count(*)
  INTO v_count
  FROM public.api_rate_limits
  WHERE bucket_key = p_key
    AND created_at > v_window_start;

  -- If limit reached or exceeded, reject request
  IF v_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_count,
      'max_requests', p_max_requests,
      'remaining', 0,
      'retry_after', p_window_seconds
    );
  END IF;

  -- Otherwise record this request timestamp atomically
  INSERT INTO public.api_rate_limits (bucket_key, created_at)
  VALUES (p_key, now());

  -- Probabilistic cleanup: delete logs older than 2 hours (~5% of calls)
  IF random() < 0.05 THEN
    DELETE FROM public.api_rate_limits WHERE created_at < (now() - interval '2 hours');
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_count + 1,
    'max_requests', p_max_requests,
    'remaining', p_max_requests - (v_count + 1),
    'retry_after', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) TO anon, authenticated, service_role;
