import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingStars } from "@/components/RatingStars";
import { ArrowLeft } from "lucide-react";

type Speaker = {
  id: string;
  speaker_name: string;
  talk_title: string;
  event_name: string;
  slug: string;
};

type Feedback = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

const SpeakerResponses: React.FC = () => {
  const { speakerId } = useParams<{ speakerId: string }>();
  const navigate = useNavigate();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ count: 0, avg: 0 });

  useEffect(() => {
    const fetchData = async () => {
      if (!speakerId) return;

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }

      // Fetch speaker info
      const { data: speakerData, error: speakerError } = await supabase
        .from("speakers")
        .select("id, speaker_name, talk_title, event_name, slug")
        .eq("id", speakerId)
        .eq("user_id", session.user.id)
        .single();

      if (speakerError || !speakerData) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setSpeaker(speakerData);

      // Fetch feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("id, rating, comment, created_at")
        .eq("speaker_id", speakerId)
        .order("created_at", { ascending: false });

      if (!feedbackError && feedbackData) {
        setFeedback(feedbackData);
        const count = feedbackData.length;
        const avg = count ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / count : 0;
        setMetrics({ count, avg });
      }

      setLoading(false);
    };

    fetchData();
  }, [speakerId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen container py-10">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!speaker) {
    return (
      <div className="min-h-screen container py-10">
        <p className="text-muted-foreground">Speaker not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen container py-10 grid gap-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{speaker.talk_title}</h1>
          <p className="text-muted-foreground">
            by {speaker.speaker_name} • {speaker.event_name}
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <span>Response Summary</span>
            <div className="flex items-center gap-2">
              <RatingStars value={Math.round(metrics.avg)} readOnly />
              <span className="text-lg font-semibold">{metrics.avg.toFixed(1)}</span>
            </div>
          </CardTitle>
          <CardDescription>
            {metrics.count} total responses
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        <h2 className="text-xl font-semibold">All Responses</h2>
        {feedback.length > 0 ? (
          feedback.map((f) => (
            <Card key={f.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <RatingStars value={f.rating} readOnly />
                  <span className="text-sm text-muted-foreground">
                    {new Date(f.created_at).toLocaleString()}
                  </span>
                </div>
                {f.comment ? (
                  <p className="text-sm">{f.comment}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No comment provided</p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">No responses yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SpeakerResponses;