-- Drop existing tables and recreate with speaker-focused schema
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.decks CASCADE;

-- Create speakers table
CREATE TABLE public.speakers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  speaker_name TEXT NOT NULL,
  talk_title TEXT NOT NULL,
  event_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  qr_code_url TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;

-- Create policies for speakers
CREATE POLICY "Users can view their own speakers" 
ON public.speakers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own speakers" 
ON public.speakers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own speakers" 
ON public.speakers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own speakers" 
ON public.speakers 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Public can view speakers by slug" 
ON public.speakers 
FOR SELECT 
USING (true);

-- Create feedback table for speakers
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  speaker_id UUID NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (speaker_id) REFERENCES public.speakers(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback
CREATE POLICY "Anyone can insert feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM speakers s WHERE s.id = feedback.speaker_id
));

CREATE POLICY "Speaker owners can view feedback" 
ON public.feedback 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM speakers s 
  WHERE s.id = feedback.speaker_id AND s.user_id = auth.uid()
));

CREATE POLICY "Speaker owners can delete feedback" 
ON public.feedback 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM speakers s 
  WHERE s.id = feedback.speaker_id AND s.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_speakers_updated_at
BEFORE UPDATE ON public.speakers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for feedback validation
CREATE TRIGGER validate_feedback_trigger
BEFORE INSERT OR UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.validate_feedback();