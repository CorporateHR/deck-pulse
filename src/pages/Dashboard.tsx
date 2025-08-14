import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpeakerForm } from "@/components/SpeakerForm";
import { RatingStars } from "@/components/RatingStars";
import QRCode from "react-qr-code";

type Speaker = {
  id: string;
  speaker_name: string;
  talk_title: string;
  event_name: string;
  slug: string;
};

type Feedback = {
  rating: number;
  comment: string | null;
  created_at: string;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, { count: number; avg: number; lastComments: Feedback[] }>>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth", { replace: true });
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      // fetch user speakers - only show speakers belonging to the authenticated user
      const userId = session.user?.id;
      if (!userId) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("speakers")
        .select("id, speaker_name, talk_title, event_name, slug")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) setSpeakers(data as Speaker[]);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const loadMetrics = async () => {
      const all: Record<string, { count: number; avg: number; lastComments: Feedback[] }> = {};
      for (const s of speakers) {
        const { data, error } = await supabase
          .from("feedback")
          .select("rating, comment, created_at")
          .eq("speaker_id", s.id)
          .order("created_at", { ascending: false });
        if (!error && data) {
          const list = data as Feedback[];
          const count = list.length;
          const avg = count ? list.reduce((s, f) => s + f.rating, 0) / count : 0;
          all[s.id] = { count, avg, lastComments: list.slice(0, 5) };
        } else {
          all[s.id] = { count: 0, avg: 0, lastComments: [] };
        }
      }
      setMetrics(all);
    };
    if (speakers.length) void loadMetrics();
  }, [speakers]);

  const content = useMemo(() => {
    if (loading) return <p className="text-muted-foreground">Loading...</p>;
    if (!speakers.length) return <p className="text-muted-foreground">No speakers yet. Add one above to get started.</p>;
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {speakers.map((s) => {
          const m = metrics[s.id] || { count: 0, avg: 0, lastComments: [] };
          const feedbackUrl = `${window.location.origin}/f/${s.slug}`;
          return (
            <Card key={s.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl">{s.talk_title}</CardTitle>
                <CardDescription>
                  <span className="mr-2">by {s.speaker_name}</span> • <span className="ml-2">{s.event_name}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RatingStars value={Math.round(m.avg)} readOnly />
                    <span className="text-sm text-muted-foreground">Avg {m.avg.toFixed(2)} • {m.count} responses</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded border bg-card text-foreground">
                    <QRCode value={feedbackUrl} size={96} bgColor="transparent" fgColor="currentColor" />
                  </div>
                  <div className="grid gap-1">
                    <a className="text-sm text-primary underline" href={feedbackUrl} target="_blank" rel="noreferrer">{feedbackUrl}</a>
                    <div className="text-sm text-muted-foreground">Share this QR or link to collect feedback.</div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Recent comments</div>
                  <div className="grid gap-2">
                    {m.lastComments.length ? (
                      m.lastComments.map((f, idx) => (
                        <div key={idx} className="rounded border p-2 bg-muted/30">
                          <div className="text-sm text-muted-foreground">{new Date(f.created_at).toLocaleString()}</div>
                          {f.comment ? <div className="text-sm">{f.comment}</div> : <div className="text-sm text-muted-foreground">No comment</div>}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No feedback yet.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }, [loading, speakers, metrics]);

  return (
    <div className="min-h-screen container py-10 grid gap-8">
      <header>
        <h1 className="text-3xl font-bold">Your Speakers & Feedback</h1>
        <p className="text-muted-foreground">Register speakers, generate QR codes, and review feedback in one place.</p>
      </header>
      <SpeakerForm />
      {content}
    </div>
  );
};

export default Dashboard;
