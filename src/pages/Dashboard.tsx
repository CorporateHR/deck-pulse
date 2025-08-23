import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SpeakerForm } from "@/components/SpeakerForm";
import { RatingStars } from "@/components/RatingStars";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";
import { Download, Eye } from "lucide-react";

type Speaker = {
  id: string;
  speaker_name: string;
  email?: string;
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
        .select("id, speaker_name, email, talk_title, event_name, slug, qr_code_url")
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
        const qrElement = document.querySelector(`[data-qr-id="${speaker.id}"] svg`) as SVGElement;
        if (qrElement) {
          const svgData = new XMLSerializer().serializeToString(qrElement);
          const img = new Image();
          img.onload = async () => {
            // White background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, size, size);
            // Draw QR code
            ctx.drawImage(img, 0, 0, size, size);
            const pngDataUrl = canvas.toDataURL('image/png');
            // Extract base64 string from data URL
            const base64String = pngDataUrl.split(',')[1];
            
            // Send structured payload to webhook
            await fetch('https://n8n.quickly4u.com/webhook/ad2f28be-c5b6-4de8-b8f7-3aee0479c218', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              mode: 'no-cors',
              body: JSON.stringify({
                qr_code: { png_base64: base64String },
                speaker: {
                  name: speaker.speaker_name,
                  email: speaker.email ?? null
                },
                event: {
                  name: speaker.event_name
                },
                links: {
                  public_feedback_url: feedbackUrl
                }
              })
            });

            toast({
              title: "Shared Successfully",
              description: "Feedback link and QR code have been shared via webhook."
            });
          };
          img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share feedback link.",
        variant: "destructive"
      });
    }
  };

  const downloadQRCode = (speaker: Speaker) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const size = 400; // Higher resolution for download
    canvas.width = size;
    canvas.height = size;
    
    // Get the QR code SVG element
    const qrElement = document.querySelector(`[data-qr-id="${speaker.id}"] svg`) as SVGElement;
    if (!qrElement) {
      toast({
        title: "Error",
        description: "QR code not found. Please wait for it to load.",
        variant: "destructive",
      });
      return;
    }

    // Convert SVG to image and draw on canvas
    const svgData = new XMLSerializer().serializeToString(qrElement);
    const img = new Image();
    img.onload = () => {
      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);
      
      // Draw QR code in center with some padding
      const padding = 40;
      const qrSize = size - (padding * 2);
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      
      // Add text below QR code
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${speaker.speaker_name}`, size / 2, size - 20);
      
      // Download the image
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `qr-code-${speaker.slug}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          
          toast({
            title: "QR Code Downloaded",
            description: `QR code for ${speaker.speaker_name} has been downloaded.`,
          });
        }
      }, 'image/png');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
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
                    <span className="font-medium">Speaker:</span> {s.speaker_name}
                    {s.email && <span className="text-sm"> ({s.email})</span>} • 
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
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      <a href={`/feedback/${s.slug}`} target="_blank" rel="noreferrer">
                        <Eye className="w-4 h-4 mr-2" />
                        Public View
                      </a>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 sm:flex-none"
                      onClick={() => handleShareFeedback(s, feedbackUrl)}
                    >
                      Share QR Code
                    </Button>
                  </div>
                </div>
                
                {/* QR Code Section */}
                <div className="lg:w-48 flex flex-col items-center">
                  <div className="p-3 rounded-lg border bg-background mb-3" data-qr-id={s.id}>
                    {s.qr_code_url ? (
                      <img src={s.qr_code_url} alt="QR Code" className="w-32 h-32" />
                    ) : (
                      <QRCode value={feedbackUrl} size={128} bgColor="transparent" fgColor="currentColor" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRCode(s)}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
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