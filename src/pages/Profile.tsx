import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      setEmail(session.user.email ?? "");
      setUserId(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Your account information.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Basic details from Supabase Auth</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm"><span className="text-muted-foreground">Email:</span> {email || "-"}</div>
          <div className="text-sm"><span className="text-muted-foreground">User ID:</span> {userId || "-"}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
