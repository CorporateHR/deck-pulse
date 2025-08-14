import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 [background:var(--gradient-surface)]" aria-hidden />
      <section className="relative container py-24 text-center grid gap-6">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          QR feedback for speakers & talks
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Register speakers, get unique QR codes, and collect anonymous ratings and comments in seconds.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/auth">
            <Button variant="hero" className="h-11 px-6">Get started free</Button>
          </a>
          <a href="#how-it-works" className="text-primary underline underline-offset-4">How it works</a>
        </div>
        <div id="how-it-works" className="grid md:grid-cols-3 gap-4 pt-8">
          <div className="rounded-lg border p-6 bg-card text-left">
            <div className="text-sm font-semibold mb-2">1. Register speaker</div>
            <p className="text-sm text-muted-foreground">Add speaker name, talk title, and event.</p>
          </div>
          <div className="rounded-lg border p-6 bg-card text-left">
            <div className="text-sm font-semibold mb-2">2. Share QR</div>
            <p className="text-sm text-muted-foreground">Download and display during the talk.</p>
          </div>
          <div className="rounded-lg border p-6 bg-card text-left">
            <div className="text-sm font-semibold mb-2">3. Get feedback</div>
            <p className="text-sm text-muted-foreground">View ratings and comments on your dashboard.</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Index;
