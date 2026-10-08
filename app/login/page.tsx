"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gem, Loader2, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      if (mode === "signin") {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        router.replace("/");
        router.refresh();
      } else {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (result.error) throw result.error;
        setMessage("Account created. Check your email to confirm it, then sign in.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] px-5 py-10 text-[#18241d]">
      <section className="w-full max-w-md rounded-3xl border border-[#e0e3dd] bg-white p-7 shadow-[0_20px_60px_rgba(33,50,39,.10)] sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d6b3a] text-white"><Gem /></span>
          <div><h1 className="text-xl font-bold">ProfitLens</h1><p className="text-xs text-[#788178]">YOUR PRIVATE SALES TRACKER</p></div>
        </div>
        <div className="mb-6"><LockKeyhole className="mb-3 text-[#1d6b3a]" /><h2 className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h2><p className="mt-1 text-sm text-[#748078]">Your orders, costs and customer records stay private.</p></div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#657269]">Email</span><input className="w-full rounded-xl border border-[#dbe1da] px-3 py-3 outline-none focus:border-[#4a875e]" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#657269]">Password</span><input className="w-full rounded-xl border border-[#dbe1da] px-3 py-3 outline-none focus:border-[#4a875e]" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="rounded-xl bg-[#fff1ef] px-4 py-3 text-sm text-[#8b2c20]">{error}</p>}
          {message && <p className="rounded-xl bg-[#e7f5e8] px-4 py-3 text-sm text-[#1d6b3a]">{message}</p>}
          <button disabled={loading} className="primary w-full justify-center">{loading && <Loader2 className="animate-spin" />}{mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="mt-5 w-full text-sm font-semibold text-[#1d6b3a]" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>
          {mode === "signin" ? "First time? Create an account" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
