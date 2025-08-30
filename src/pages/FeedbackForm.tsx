import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/RatingStars";
import { useToast } from "@/hooks/use-toast";

const FeedbackFormPage: React.FC = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [speaker, setSpeaker] = useState<{ id: string; speaker_name: string; talk_title: string; event_name: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from("speakers")
        .select("id, speaker_name, talk_title, event_name")
        .eq("slug", slug)
        .maybeSingle();
      if (!error && data) setSpeaker(data);
      setLoading(false);
    };
    void load();
  }, [slug]);

  const canSubmit = useMemo(() => rating >= 1 && rating <= 5, [rating]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speaker) return;
    if (!canSubmit) {
      toast({ title: "Rating required", description: "Please select 1–5 stars." });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        speaker_id: speaker.id,
        rating,
        comment: comment.trim() ? comment.trim() : null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Thank you!", description: "Your feedback was submitted." });
      setComment("");
      setRating(0);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not submit feedback" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><p>Loading...</p></div>;
  if (!speaker) return <div className="min-h-screen grid place-items-center"><p>Speaker not found.</p></div>;

  return (
    <div className="min-h-screen container py-10 relative">
      <div className="pointer-events-none absolute inset-0 [background:var(--gradient-surface)]" aria-hidden />
      <div className="relative grid gap-6 max-w-2xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold">Rate this talk</h1>
          <p className="text-muted-foreground">Your feedback is anonymous.</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{speaker.talk_title}</CardTitle>
            <CardDescription>
              <span className="mr-2">by {speaker.speaker_name}</span> • <span className="ml-2">{speaker.event_name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-6">
                <p className="text-lg">Thanks for your feedback!</p>
                <p className="text-muted-foreground text-sm">You can close this page now.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Rating</label>
                  <RatingStars value={rating} onChange={setRating} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="comment" className="text-sm font-medium">Comment (optional)</label>
                  <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder="What stood out? What could be improved?" />
                  <div className="text-xs text-muted-foreground text-right">{comment.length}/500</div>
                </div>
                <Button type="submit" disabled={!canSubmit || submitting}>
                  {submitting ? "Submitting..." : "Submit feedback"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackFormPage;
