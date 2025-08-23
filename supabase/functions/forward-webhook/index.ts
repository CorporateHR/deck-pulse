import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const resp = await fetch(
      "https://n8n.quickly4u.com/webhook/ad2f28be-c5b6-4de8-b8f7-3aee0479c218",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    // Try to forward n8n response text, but don't block success if blank
    const text = await resp.text().catch(() => "");

    return new Response(text || "ok", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
