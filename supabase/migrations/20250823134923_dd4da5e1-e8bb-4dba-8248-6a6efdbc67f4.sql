-- Add RLS policy to allow public viewing of feedback for any speaker
CREATE POLICY "Public can view all feedback"
ON feedback
FOR SELECT
USING (true);