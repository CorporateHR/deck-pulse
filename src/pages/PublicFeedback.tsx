import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RatingStars } from "@/components/RatingStars";

type Speaker = {
  id: string;
  speaker_name: string;
  talk_title: string;
  event_name: string;
  slug: string;
};

type Feedback = {
  id: string;
  originality_rating: number;
  usefulness_rating: number;
  engagement_rating: number;
  comment: string | null;
  created_at: string;
};

const PublicFeedback = () => {
  const { slug } = useParams<{ slug: string }>();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    count: 0,
    avgOriginality: 0,
    avgUsefulness: 0,
    avgEngagement: 0,
    commentCount: 0
  });

  useEffect(() => {
    if (slug) {
      fetchSpeakerAndFeedback();
    }
  }, [slug]);

  const fetchSpeakerAndFeedback = async () => {
    try {
      // Fetch speaker by slug
      const { data: speakerData, error: speakerError } = await supabase
        .from('speakers')
        .select('*')
        .eq('slug', slug)
        .single();

      if (speakerError) throw speakerError;

      setSpeaker(speakerData);

      // Fetch feedback for this speaker
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('speaker_id', speakerData.id)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      setFeedback(feedbackData || []);

      // Calculate metrics
      if (feedbackData && feedbackData.length > 0) {
        const totalResponses = feedbackData.length;
        const avgOriginality = feedbackData.reduce((sum, item) => sum + item.originality_rating, 0) / totalResponses;
        const avgUsefulness = feedbackData.reduce((sum, item) => sum + item.usefulness_rating, 0) / totalResponses;
        const avgEngagement = feedbackData.reduce((sum, item) => sum + item.engagement_rating, 0) / totalResponses;
        const commentsCount = feedbackData.filter(item => item.comment && item.comment.trim()).length;

        setMetrics({
          count: totalResponses,
          avgOriginality,
          avgUsefulness,
          avgEngagement,
          commentCount: commentsCount
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingDistribution = () => {
    const distribution = [0, 0, 0, 0, 0];
    feedback.forEach((item) => {
      // Calculate average of three ratings for distribution
      const avgRating = Math.round((item.originality_rating + item.usefulness_rating + item.engagement_rating) / 3);
      if (avgRating >= 1 && avgRating <= 5) {
        distribution[avgRating - 1]++;
      }
    });
    return distribution;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading feedback...</p>
        </div>
      </div>
    );
  }

  if (!speaker) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Speaker Not Found</h1>
          <p className="text-muted-foreground mb-6">The speaker you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const distribution = getRatingDistribution();
  const maxCount = Math.max(...distribution);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{speaker.talk_title}</h1>
            <p className="text-xl text-muted-foreground mb-1">by {speaker.speaker_name}</p>
            <p className="text-lg text-muted-foreground">{speaker.event_name}</p>
          </div>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Feedback Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {metrics.avgOriginality.toFixed(1)}
                  </div>
                  <div className="mb-2">
                    <RatingStars value={Math.round(metrics.avgOriginality)} readOnly />
                  </div>
                  <div className="text-sm text-muted-foreground">Originality</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {metrics.avgUsefulness.toFixed(1)}
                  </div>
                  <div className="mb-2">
                    <RatingStars value={Math.round(metrics.avgUsefulness)} readOnly />
                  </div>
                  <div className="text-sm text-muted-foreground">Usefulness</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {metrics.avgEngagement.toFixed(1)}
                  </div>
                  <div className="mb-2">
                    <RatingStars value={Math.round(metrics.avgEngagement)} readOnly />
                  </div>
                  <div className="text-sm text-muted-foreground">Engagement</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">{metrics.count}</div>
                  <div className="text-sm text-muted-foreground">Total Responses</div>
                  <div className="text-2xl font-bold text-primary mt-2">{metrics.commentCount}</div>
                  <div className="text-sm text-muted-foreground">With Comments</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {feedback.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {distribution.map((count, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12">
                        <span className="text-sm">{index + 1}</span>
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{
                            width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%'
                          }}
                        ></div>
                      </div>
                      <span className="text-sm w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Individual Feedback</h2>
          {feedback.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">No Feedback Yet</h3>
                <p className="text-muted-foreground">This speaker hasn't received any feedback yet.</p>
              </CardContent>
            </Card>
          ) : (
            feedback.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="grid gap-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Originality:</span>
                      <RatingStars value={item.originality_rating} readOnly />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Usefulness:</span>
                      <RatingStars value={item.usefulness_rating} readOnly />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Engagement:</span>
                      <RatingStars value={item.engagement_rating} readOnly />
                    </div>
                  </div>
                  <div className="flex justify-end mb-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()} at{' '}
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {item.comment && (
                    <div className="border-t pt-3">
                      <p className="text-foreground leading-relaxed">{item.comment}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicFeedback;