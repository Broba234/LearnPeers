"use client";
import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const role = searchParams.get("role") || "student";

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                console.error('[LOGIN] Sign in error:', signInError);
                throw signInError;
            }

            if (!data.user) {
                throw new Error('No user returned from sign in');
            }

            // Fetch user role from the database using email via API
            const profileRes = await fetch(`/api/profiles/get?email=${encodeURIComponent(email)}`);
            
            
            if (!profileRes.ok) {
                const errorData = await profileRes.json().catch(() => ({ error: 'Failed to parse error response' }));
                console.error('[LOGIN] Profile lookup failed:', errorData);
                throw new Error(errorData.error || 'Could not determine user role');
            }

            const userData = await profileRes.json();
            
            if (!userData?.role) {
                console.error('[LOGIN] No role found in profile data:', userData);
                throw new Error('Could not determine user role. Please ensure you have registered an account.');
            }

            let homePath = "/home";
            switch (userData.role.toLowerCase()) {
                case "student":
                    homePath = "/home/student";
                    break;
                case "tutor":
                    homePath = "/home/tutor";
                    break;
                case "admin":
                    homePath = "/home/admin";
                    break;
                default:
                    homePath = "/home";
            }

            router.push(homePath);
        } catch (err: any) {
            console.error('[LOGIN] Error:', err?.message || err, err);
            setError(err.message || "An error occurred during login");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-white via-brand-50/40 to-white">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-ink-100 shadow-xl shadow-ink-900/5">
        <div className="text-center">
  {/* Icon Header */}
  <div className="flex justify-center mb-5">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/25">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  </div>
  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 mb-1">Welcome back</h2>
  <p className="text-ink-500 text-sm mb-2">
   Enter your email and password to sign in.
  </p>
</div>

          <form onSubmit={handleSubmit} className="mt-6">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-mail"
              className="w-full bg-white border border-ink-200 px-4 py-3 rounded-xl mt-4 text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />

            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-white border border-ink-200 px-4 py-3 rounded-xl mt-4 text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />

            <div className="mt-2 ml-1">
              <Link
                href="/auth/reset"
                className="text-xs font-medium text-brand-600 hover:text-brand-700 transition"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="mt-4 text-red-600 text-sm text-center bg-red-50 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold text-white py-3.5 mt-5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 shadow-lg shadow-brand-600/25 ring-1 ring-white/20 transition hover:brightness-[1.04] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 flex gap-x-2 gap-y-1 items-center justify-center flex-wrap text-sm">
          <p className="text-ink-500">
    Don't have an account? Sign up as
  </p>

  <div className="flex gap-2 flex-row justify-center items-center">
    <Link
      href={`/auth/register?role=student`}
      className="font-semibold text-brand-600 hover:text-brand-700 transition"
    >
      Student
    </Link>
    <span className="text-ink-400">or</span>

    <Link
      href={`/auth/register?role=tutor`}
      className="font-semibold text-brand-600 hover:text-brand-700 transition"
    >
      Tutor
    </Link>
  </div>
          </div>
        </div>
      </main>
    );
}

export default function Login() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
