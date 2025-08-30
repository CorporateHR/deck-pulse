-- Drop the existing rating column and add three new rating columns
ALTER TABLE public.feedback 
DROP COLUMN rating;

ALTER TABLE public.feedback 
ADD COLUMN originality_rating integer NOT NULL DEFAULT 1 CHECK (originality_rating >= 1 AND originality_rating <= 5),
ADD COLUMN usefulness_rating integer NOT NULL DEFAULT 1 CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
ADD COLUMN engagement_rating integer NOT NULL DEFAULT 1 CHECK (engagement_rating >= 1 AND engagement_rating <= 5);

-- Update the validation function to check all three ratings
CREATE OR REPLACE FUNCTION public.validate_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.originality_rating < 1 OR NEW.originality_rating > 5 THEN
    RAISE EXCEPTION 'Originality rating must be between 1 and 5';
  END IF;
  IF NEW.usefulness_rating < 1 OR NEW.usefulness_rating > 5 THEN
    RAISE EXCEPTION 'Usefulness rating must be between 1 and 5';
  END IF;
  IF NEW.engagement_rating < 1 OR NEW.engagement_rating > 5 THEN
    RAISE EXCEPTION 'Engagement rating must be between 1 and 5';
  END IF;
  IF NEW.comment IS NOT NULL AND length(NEW.comment) > 500 THEN
    RAISE EXCEPTION 'Comment must be 500 characters or less';
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_feedback_trigger ON public.feedback;
CREATE TRIGGER validate_feedback_trigger
  BEFORE INSERT OR UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_feedback();