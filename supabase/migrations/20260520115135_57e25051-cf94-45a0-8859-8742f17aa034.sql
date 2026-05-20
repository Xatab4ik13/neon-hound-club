-- touch_updated_at doesn't need elevated privs — make it SECURITY INVOKER + fixed search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user must remain SECURITY DEFINER (writes profiles regardless of caller),
-- but it should only ever run via the auth trigger — revoke direct EXECUTE from all roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM authenticated;