import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SpeakerForm } from "@/components/SpeakerForm";
import { RatingStars } from "@/components/RatingStars";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import QRCode from "react-qr-code";

type Speaker = {
  id: string;
  speaker_name: string;
  talk_title: string;
  event_name: string;
  slug: string;
  qr_code_url?: string;
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
        .select("id, speaker_name, talk_title, event_name, slug, qr_code_url")
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Talk & Speaker</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Responses</TableHead>
            <TableHead>QR Code</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {speakers.map((s) => {
            const m = metrics[s.id] || { count: 0, avg: 0, lastComments: [] };
            const feedbackUrl = `${window.location.origin}/f/${s.slug}`;
            return (
              <TableRow key={s.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{s.talk_title}</div>
                    <div className="text-sm text-muted-foreground">by {s.speaker_name}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{s.event_name}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <RatingStars value={Math.round(m.avg)} readOnly />
                    <span className="text-sm text-muted-foreground">{m.avg.toFixed(1)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{m.count}</div>
                </TableCell>
                <TableCell>
                  <div className="p-1 rounded border bg-card text-foreground w-fit">
                    {s.qr_code_url ? (
                      <img src={s.qr_code_url} alt="QR Code" className="w-12 h-12" />
                    ) : (
                      <QRCode value={feedbackUrl} size={48} bgColor="transparent" fgColor="currentColor" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/speaker/${s.id}/responses`)}
                    >
                      View Responses
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={feedbackUrl} target="_blank" rel="noreferrer">
                        Share Link
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
