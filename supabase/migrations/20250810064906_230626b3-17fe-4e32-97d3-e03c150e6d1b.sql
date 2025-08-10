-- Create tables for Deck Pulse app
-- 1) Utility: function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Decks table
CREATE TABLE IF NOT EXISTS public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  industry TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

-- Policies for decks
DO $$
BEGIN
  -- Users can insert their own decks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'decks' AND policyname = 'Users can insert their own decks'
  ) THEN
    CREATE POLICY "Users can insert their own decks"
      ON public.decks
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can manage (view/update/delete) their own decks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'decks' AND policyname = 'Users can view their own decks'
  ) THEN
    CREATE POLICY "Users can view their own decks"
      ON public.decks
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'decks' AND policyname = 'Users can update their own decks'
  ) THEN
    CREATE POLICY "Users can update their own decks"
      ON public.decks
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'decks' AND policyname = 'Users can delete their own decks'
  ) THEN
    CREATE POLICY "Users can delete their own decks"
      ON public.decks
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  -- Public can read deck context (to show on anonymous feedback page)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'decks' AND policyname = 'Public can read deck context'
  ) THEN
    CREATE POLICY "Public can read deck context"
      ON public.decks
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Trigger for updated_at on decks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_decks_set_updated_at'
  ) THEN
    CREATE TRIGGER trigger_decks_set_updated_at
    BEFORE UPDATE ON public.decks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) Feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feedback_deck_id ON public.feedback(deck_id);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Validation trigger to ensure rating between 1 and 5 and comment length <= 500
CREATE OR REPLACE FUNCTION public.validate_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF NEW.comment IS NOT NULL AND length(NEW.comment) > 500 THEN
    RAISE EXCEPTION 'Comment must be 500 characters or less';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_feedback_validate'
  ) THEN
    CREATE TRIGGER trigger_feedback_validate
    BEFORE INSERT OR UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION public.validate_feedback();
  END IF;
END $$;

-- Policies for feedback
DO $$
BEGIN
  -- Anyone can submit feedback for an existing deck
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'Anyone can insert feedback'
  ) THEN
    CREATE POLICY "Anyone can insert feedback"
      ON public.feedback
      FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id));
  END IF;

  -- Deck owners can view feedback on their decks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'Deck owners can view feedback'
  ) THEN
    CREATE POLICY "Deck owners can view feedback"
      ON public.feedback
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.decks d
        WHERE d.id = feedback.deck_id AND d.user_id = auth.uid()
      ));
  END IF;

  -- Deck owners can delete feedback on their decks (optional)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'Deck owners can delete feedback'
  ) THEN
    CREATE POLICY "Deck owners can delete feedback"
      ON public.feedback
      FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.decks d
        WHERE d.id = feedback.deck_id AND d.user_id = auth.uid()
      ));
  END IF;
END $$;