-- Add webhook tracking to speakers table
ALTER TABLE public.speakers ADD COLUMN webhook_sent_at TIMESTAMP WITH TIME ZONE;