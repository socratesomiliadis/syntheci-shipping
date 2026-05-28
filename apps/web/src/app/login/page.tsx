"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Anchor, ArrowRight, CheckCircle2, Loader2, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const demoAccount = {
  name: "Demo Analyst",
  email: "analyst@syntheci.local",
  password: "syntheci-demo-password",
};

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState(demoAccount.name);
  const [email, setEmail] = useState(demoAccount.email);
  const [password, setPassword] = useState(demoAccount.password);
  const [status, setStatus] = useState("Use the demo account to enter the workspace.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function postAuth(path: "sign-in" | "sign-up") {
    const body = path === "sign-in" ? { email, password } : { name, email, password };

    return fetch(`/api/auth/${path}/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("Signing in with the demo account...");

    try {
      const signInResponse = await postAuth("sign-in");
      if (signInResponse.ok) {
        router.replace("/workspace");
        router.refresh();
        return;
      }

      setStatus("Creating the demo account for this environment...");
      const signUpResponse = await postAuth("sign-up");
      if (signUpResponse.ok) {
        router.replace("/workspace");
        router.refresh();
        return;
      }

      setStatus(`Demo login failed with status ${signUpResponse.status}.`);
    } catch {
      setStatus("Demo login failed. Check that the app and auth service are available.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Syntheci home">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1447e5] text-white">
              <Anchor className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">Syntheci</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-950">
            Back to site
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#1447e5]/20 bg-[#1447e5]/5 px-3 py-1 text-sm font-medium text-[#1447e5]">
            <CheckCircle2 className="h-4 w-4" />
            Demo access
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            Log in and open the Syntheci operations workspace.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The demo account opens the workspace dashboard with source ingestion, cited chat, automations, run history,
            and maritime risk workflows.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["Dashboard overview", "Cited maritime chat", "Sources and documents", "Automation runs"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-[#1447e5]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="w-full rounded-lg border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-normal text-slate-950">Demo login</CardTitle>
            <CardDescription>Use the seeded credentials below. The account is created automatically if needed.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  className="h-11 rounded-lg border-slate-200 bg-white px-3"
                />
              </label>
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Mail className="h-4 w-4 text-[#1447e5]" />
                  Email
                </span>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="h-11 rounded-lg border-slate-200 bg-white px-3"
                />
              </label>
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <LockKeyhole className="h-4 w-4 text-[#1447e5]" />
                  Password
                </span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-11 rounded-lg border-slate-200 bg-white px-3"
                />
              </label>
              <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-[#1447e5] text-white hover:bg-[#1447e5]/90">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Enter workspace
              </Button>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                {status}
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
