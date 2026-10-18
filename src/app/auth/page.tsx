"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Leaf, Mail } from "lucide-react";
import { browserSupabase, backendConfigured } from "@/lib/supabase/client";
export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const db = browserSupabase();
      if (mode === "reset") {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback`,
        });
        if (error) throw error;
        setMessage(
          "Check your email for a recovery link. After following it, set a new password in My loop.",
        );
        return;
      }
      const result =
        mode === "signup"
          ? await db.auth.signUp({
              email,
              password,
              options: {
                data: { display_name: name },
                emailRedirectTo: `${location.origin}/auth/callback`,
              },
            })
          : await db.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) {
        const next = new URLSearchParams(location.search).get("next");
        location.assign(
          next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/dashboard",
        );
      } else
        setMessage(
          "Check your email to confirm your account, then come back to log in.",
        );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="shell auth-layout">
      <div className="auth-story">
        <span className="eyebrow">YOUR NEXT GOOD THING STARTS HERE</span>
        <h1>
          A little less waste.
          <br />
          <em>A lot more community.</em>
        </h1>
        <p>
          Join your campus circle. Share what you have, find what you need, and
          keep good things going.
        </p>
        <div className="auth-art">
          <Leaf size={90} />
          <span>
            good things
            <br />
            come around.
          </span>
        </div>
      </div>
      <div className="panel auth-panel">
        <span className="mini-icon">
          <Mail />
        </span>
        <h2>
          {mode === "signup"
            ? "Welcome to the loop"
            : mode === "reset"
              ? "Forgot your password?"
              : "Good to see you again"}
        </h2>
        <p>
          {mode === "signup"
            ? "Just a few details. Then you’re in."
            : mode === "reset"
              ? "We’ll send you a recovery link."
              : "Log in to share, reserve, and make a difference."}
        </p>
        {!backendConfigured() && (
          <div className="notice">
            Accounts need Supabase configuration. Browsing and drafting work in
            preview mode.
          </div>
        )}
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Your name
              <input
                required
                maxLength={60}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
              />
            </label>
          )}
          <label>
            Email address
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {mode !== "reset" && (
            <label>
              Password
              <input
                required
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="notice success" role="status">
              {message}
            </div>
          )}
          <button
            className="button full"
            disabled={busy || !backendConfigured()}
          >
            {busy
              ? "One moment…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send recovery email"
                  : "Log in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? (
            <>
              New around here?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
              >
                Join the loop
              </button>
              <button className="forgot" onClick={() => setMode("reset")}>
                Forgot password?
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Back to log in
            </button>
          )}
        </div>
        <p className="fine">
          No university email required for the hackathon. Your email stays
          private.
        </p>
        <Link href="/" className="text-link">
          Just looking? Explore the marketplace →
        </Link>
      </div>
    </section>
  );
}
