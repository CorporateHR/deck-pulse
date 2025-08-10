import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const title = useMemo(() => (mode === "login" ? "Welcome back" : "Create your account"), [mode]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Logged in", description: "Redirecting to dashboard..." });
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      toast({ title: "Check your inbox", description: "Confirm your email to finish signup." });
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleSignup();
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 relative">
      <div className="pointer-events-none absolute inset-0 [background:var(--gradient-surface)]" aria-hidden />
      <Card className="w-full max-w-md relative">
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>Use email and password to {mode}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} variant="hero">
              {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            {mode === "login" ? (
              <button className="underline text-primary" onClick={() => setMode("signup")}>Need an account? Create one</button>
            ) : (
              <button className="underline text-primary" onClick={() => setMode("login")}>Already have an account? Log in</button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
