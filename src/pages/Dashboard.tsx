import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SpeakerForm } from "@/components/SpeakerForm";
import { RatingStars } from "@/components/RatingStars";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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

  const handleShareFeedback = async (speaker: Speaker, feedbackUrl: string) => {
    try {
      // Generate QR code as PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      
      if (ctx) {
        // Create QR code SVG
        const qrSvg = document.createElement('div');
        qrSvg.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:white;"><div style="padding:20px;">${document.querySelector('.qr-code-container')?.innerHTML || ''}</div></div></foreignObject></svg>`;
        
        // Convert to base64
        const svgData = new XMLSerializer().serializeToString(qrSvg.firstChild as Element);
        const img = new Image();
        img.onload = async () => {
          ctx.drawImage(img, 0, 0, size, size);
          const pngData = canvas.toDataURL('image/png');
          
          // Send only QR code PNG to webhook
          await fetch('https://n8n.quickly4u.com/webhook/ad2f28be-c5b6-4de8-b8f7-3aee0479c218', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors',
            body: JSON.stringify({ qr_code_png: pngData })
          });

          toast({
            title: "Shared Successfully",
            description: "Feedback link and QR code have been shared via webhook."
          });
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share feedback link.",
        variant: "destructive"
      });
    }
  };

  const content = useMemo(() => {
    if (loading) return <p className="text-muted-foreground">Loading...</p>;
    if (!speakers.length) return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No speakers yet. Add your first speaker above to get started!</p>
        <p className="text-sm text-muted-foreground">Once you add a speaker, you'll see their QR code and can track feedback responses.</p>
      </div>
    );
    
    return (
      <div className="grid gap-6">
        {speakers.map((s) => {
          const m = metrics[s.id] || { count: 0, avg: 0, lastComments: [] };
          const feedbackUrl = `${window.location.origin}/f/${s.slug}`;
          return (
            <div key={s.id} className="border rounded-lg p-6 bg-card">
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Main Info */}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{s.talk_title}</h3>
                  <p className="text-muted-foreground mb-4">
                    <span className="font-medium">Speaker:</span> {s.speaker_name} • 
                    <span className="font-medium ml-2">Event:</span> {s.event_name}
                  </p>
                  
                  {/* Rating & Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <RatingStars value={Math.round(m.avg)} readOnly />
                      <span className="font-semibold">{m.avg.toFixed(1)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {m.count} response{m.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => navigate(`/speaker/${s.id}/responses`)}
                      className="flex-1 sm:flex-none"
                    >
                      View All Responses
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 sm:flex-none"
                      onClick={() => handleShareFeedback(s, feedbackUrl)}
                    >
                      Share Feedback Link
                    </Button>
                  </div>
                </div>
                
                {/* QR Code Section */}
                <div className="lg:w-48 flex flex-col items-center">
                  <div className="p-3 rounded-lg border bg-background mb-3 qr-code-container">
                    {s.qr_code_url ? (
                      <img src={s.qr_code_url} alt="QR Code" className="w-32 h-32" />
                    ) : (
                      <QRCode value={feedbackUrl} size={128} bgColor="transparent" fgColor="currentColor" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Scan to leave feedback
                  </p>
                </div>
              </div>
              
              {/* Recent Comments Preview */}
              {m.lastComments.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-3">Recent Feedback</h4>
                  <div className="grid gap-3">
                    {m.lastComments.slice(0, 2).map((f, idx) => (
                      <div key={idx} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <RatingStars value={f.rating} readOnly />
                          <span className="text-xs text-muted-foreground">
                            {new Date(f.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {f.comment ? (
                          <p className="text-sm line-clamp-2">{f.comment}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No comment</p>
                        )}
                      </div>
                    ))}
                    {m.lastComments.length > 2 && (
                      <button 
                        onClick={() => navigate(`/speaker/${s.id}/responses`)}
                        className="text-sm text-primary hover:underline text-left"
                      >
                        View all {m.count} responses →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [loading, speakers, metrics, navigate]);

  return (
    <div className="min-h-screen container max-w-6xl py-10 grid gap-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold mb-2">Speaker Feedback Dashboard</h1>
        <p className="text-muted-foreground">Manage your speakers, generate QR codes, and track feedback responses</p>
      </header>
      
      <div className="bg-muted/30 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Add New Speaker</h2>
        <SpeakerForm />
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold mb-6">Your Speakers</h2>
        {content}
      </div>
    </div>
  );
};

export default Dashboard;