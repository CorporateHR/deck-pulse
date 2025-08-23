import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingStars } from "@/components/RatingStars";
import { ArrowLeft, Users, MessageCircle, TrendingUp } from "lucide-react";

type Speaker = {
  id: string;
  speaker_name: string;
  email?: string;
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
        .select("id, speaker_name, email, talk_title, event_name, slug")
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container max-w-6xl py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading responses...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!speaker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container max-w-6xl py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-semibold mb-2">Speaker Not Found</h1>
            <p className="text-muted-foreground mb-6">The requested speaker could not be found or you don't have access to it.</p>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedback.forEach(f => {
      distribution[f.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const distribution = getRatingDistribution();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-6xl py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start gap-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/dashboard")}
            className="shrink-0 mt-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight mb-2">{speaker.talk_title}</h1>
            <p className="text-lg text-muted-foreground">
              <span className="font-medium">{speaker.speaker_name}</span>
              {speaker.email && <span className="text-sm"> ({speaker.email})</span>} • {speaker.event_name}
            </p>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.avg.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.count}</p>
                  <p className="text-sm text-muted-foreground">Total Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {feedback.filter(f => f.comment && f.comment.trim().length > 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">With Comments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rating Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>Rating Summary</span>
              <div className="flex items-center gap-2">
                <RatingStars value={Math.round(metrics.avg)} readOnly />
                <span className="text-lg font-semibold">{metrics.avg.toFixed(1)}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map(rating => (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <div className="text-yellow-500">★</div>
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ 
                        width: metrics.count > 0 
                          ? `${(distribution[rating as keyof typeof distribution] / metrics.count) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">
                    {distribution[rating as keyof typeof distribution]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Individual Responses */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Individual Responses</h2>
          
          {feedback.length > 0 ? (
            <div className="space-y-4">
              {feedback.map((f) => (
                <Card key={f.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <RatingStars value={f.rating} readOnly />
                      <span className="text-sm text-muted-foreground">
                        {new Date(f.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    {f.comment && f.comment.trim().length > 0 ? (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <p className="text-sm leading-relaxed">{f.comment}</p>
                      </div>
                    ) : (
                      <div className="bg-muted/20 rounded-lg p-4 border-dashed border border-muted-foreground/20">
                        <p className="text-sm text-muted-foreground italic">No comment provided</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Responses Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Share your feedback link to start collecting responses from your audience.
                  </p>
                  <Button onClick={() => navigate("/dashboard")} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeakerResponses;