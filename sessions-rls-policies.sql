-- Run this in Supabase SQL Editor to fix Sessions table permissions

-- Ensure RLS is enabled (keep security)
ALTER TABLE "Sessions" ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow service role to do everything (for API routes)
CREATE POLICY "Service role full access" ON "Sessions"
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Policy 2: Allow authenticated users to insert sessions they're part of
CREATE POLICY "Users can create sessions" ON "Sessions"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id OR auth.uid() = tutor_id
);

-- Policy 3: Allow users to read sessions they're involved in
CREATE POLICY "Users can read their sessions" ON "Sessions"
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id OR auth.uid() = tutor_id
);

-- Policy 4: Allow users to update sessions they're involved in
CREATE POLICY "Users can update their sessions" ON "Sessions"
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id OR auth.uid() = tutor_id)
WITH CHECK (auth.uid() = student_id OR auth.uid() = tutor_id);