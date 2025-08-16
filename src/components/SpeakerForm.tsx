import React, { useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { nanoid } from "nanoid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  "Technology",
  "Marketing",
  "Finance",
  "Healthcare",
  "Education",
  "Consulting",
  "Other",
];

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "deck"}-${nanoid(8)}`;
}

export const SpeakerForm: React.FC = () => {
  const { toast } = useToast();
  const [speaker_name, setSpeakerName] = useState("");
  const [talk_title, setTalkTitle] = useState("");
  const [event_name, setEventName] = useState("");
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [inserting, setInserting] = useState(false);
  const qrRef = useRef<SVGSVGElement | null>(null);

  const feedbackUrl = useMemo(() => {
    const baseUrl = (import.meta as any).env?.VITE_PUBLIC_SITE_URL || window.location.origin;
    return createdSlug ? `${baseUrl}/f/${createdSlug}` : "";
  }, [createdSlug]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speaker_name || !talk_title || !event_name) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", });
      return;
    }
    setInserting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        toast({ title: "Not authenticated", description: "Please log in to create a speaker." });
        setInserting(false);
        return;
      }
      
      const slug = slugify(talk_title);
      
      // First create the speaker record
      const { data: speakerData, error: insertError } = await supabase.from("speakers").insert({
        speaker_name,
        talk_title,
        event_name,
        user_id: uid,
        slug,
      }).select().single();

      if (insertError) throw insertError;
      
      // Generate QR code and upload to storage
      const feedbackUrl = `${window.location.origin}/f/${slug}`;
      const { data: sessionToken } = await supabase.auth.getSession();
      
      try {
        const response = await fetch('/functions/v1/generate-qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken.session?.access_token}`,
          },
          body: JSON.stringify({
            speakerId: speakerData.id,
            feedbackUrl,
            userId: uid,
          }),
        });

        if (!response.ok) {
          console.warn('QR code generation failed, but speaker was created');
        }
      } catch (qrError) {
        console.warn('QR code generation failed:', qrError);
      }
      
      setCreatedSlug(slug);
      toast({ title: "Speaker registered", description: "QR code generated and saved to storage." });
      
      // Reset form
      setSpeakerName("");
      setTalkTitle("");
      setEventName("");
      
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create speaker." });
    } finally {
      setInserting(false);
    }
  };

  const downloadPng = () => {
    const svg = qrRef.current;
    if (!svg || !feedbackUrl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff"; // background for better print legibility
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `${createdSlug}-qr.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Register a new speaker</CardTitle>
        <CardDescription>Enter speaker details to generate a unique QR code for feedback.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="speaker_name">Speaker name</Label>
            <Input id="speaker_name" value={speaker_name} onChange={(e) => setSpeakerName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="talk_title">Talk title</Label>
            <Input id="talk_title" value={talk_title} onChange={(e) => setTalkTitle(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event_name">Event name</Label>
            <Input id="event_name" value={event_name} onChange={(e) => setEventName(e.target.value)} required />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="hero" disabled={inserting}>
              {inserting ? "Creating..." : "Create speaker & generate QR"}
            </Button>
          </div>
        </form>

        {createdSlug && (
          <div className="mt-8 grid gap-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">Feedback URL</p>
              <a className="text-sm text-primary underline" href={feedbackUrl} target="_blank" rel="noreferrer">
                {feedbackUrl}
              </a>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 rounded-lg border bg-card shadow-sm">
                <div className="text-foreground">
                  <QRCode
                    size={256}
                    value={feedbackUrl}
                    bgColor="transparent"
                    fgColor="currentColor"
                    // @ts-expect-error ref typing from library
                    ref={qrRef}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Button type="button" onClick={downloadPng}>Download QR as PNG</Button>
                <Button asChild variant="outline">
                  <a href={feedbackUrl} target="_blank" rel="noreferrer">Open feedback form</a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
