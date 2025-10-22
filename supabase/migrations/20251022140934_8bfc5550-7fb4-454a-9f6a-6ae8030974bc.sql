-- Prevent users from modifying their own role field in profiles
-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policy that excludes role from user updates
CREATE POLICY "Users can update own profile (except role)"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Ensure role hasn't changed from current value
    role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
  )
);