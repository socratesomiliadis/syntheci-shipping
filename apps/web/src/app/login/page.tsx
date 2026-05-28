"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [name, setName] = useState("Demo Analyst");
  const [email, setEmail] = useState("analyst@syntheci.local");
  const [password, setPassword] = useState("syntheci-demo-password");
  const [status, setStatus] = useState("Ready");

  async function submit(path: "sign-in" | "sign-up") {
    setStatus(path === "sign-in" ? "Signing in" : "Creating account");
    const body = path === "sign-in" ? { email, password } : { name, email, password };
    const response = await fetch(`/api/auth/${path}/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setStatus(response.ok ? "Authenticated" : `Failed with ${response.status}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Syntheci login</CardTitle>
          <CardDescription>Email/password auth backed by Better Auth and Drizzle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
          <Input value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <div className="flex gap-2">
            <Button type="button" onClick={() => submit("sign-in")}>
              Sign in
            </Button>
            <Button type="button" variant="secondary" onClick={() => submit("sign-up")}>
              Sign up
            </Button>
          </div>
          <div className="text-xs text-slate-500">{status}</div>
        </CardContent>
      </Card>
    </main>
  );
}
