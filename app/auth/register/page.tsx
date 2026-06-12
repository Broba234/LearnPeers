"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { supabase } from '@/lib/supabaseClient' // correct

function RegisterContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const role = searchParams.get("role") || "student";
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Public sign-up may only create students or tutors. Admin is provisioned separately.
    const allowedRoles = ["student", "tutor"];
    const normalizedRole = allowedRoles.includes(role.toLowerCase()) ? role.toLowerCase() : "student";

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

            // 1. Create the auth user, attaching name + role as metadata in one call
            //    (no separate updateUser round-trip, which would fail without a session).
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name: fullName, role: normalizedRole },
                },
            });

            if (signUpError) {
                console.error('[REGISTER] Supabase signup error:', signUpError);
                throw signUpError;
            }

            if (!data.user?.id) {
                throw new Error('Failed to create user account');
            }

            // 2. Create the public profile row (profile_setup defaults to false → onboarding shows).
            const profileRes = await fetch("/api/profiles/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: data.user.id,
                    email,
                    name: fullName,
                    role: normalizedRole,
                }),
            });

            if (!profileRes.ok) {
                const errorData = await profileRes.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[REGISTER] Profile creation failed:', profileRes.status, errorData);
                throw new Error(errorData.error || errorData.details || `Failed to create user profile (${profileRes.status})`);
            }

            // 3. Get a session. When email confirmation is OFF, signUp already returns one.
            //    Otherwise fall back to an explicit password sign-in.
            let session = data.session;
            if (!session) {
                const { data: signInData, error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (loginError || !signInData.session) {
                    // No session means Supabase is requiring email confirmation. Surface that
                    // clearly rather than dumping the user back to the login screen.
                    console.error('[REGISTER] Auto sign-in failed:', loginError);
                    setError("Account created. Please check your email to confirm your address, then log in.");
                    setLoading(false);
                    return;
                }
                session = signInData.session;
            }

            // 4. Straight to onboarding — the role home renders the setup wizard until
            //    profile_setup flips true.
            router.push(`/home/${normalizedRole}`);
        } catch (err: any) {
            console.error('[REGISTER] Registration failed:', err);
            const message = /already registered|already exists|duplicate/i.test(err?.message || "")
                ? "An account with this email already exists. Try logging in instead."
                : err?.message || "An error occurred during registration. Please try again.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-white via-brand-50/40 to-white">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-ink-100 shadow-xl shadow-ink-900/5">
          <div className="text-center">
    <div className="flex justify-center mb-5">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/25">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      </div>
    </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 mb-1">Create your account</h2>

            <div className="text-ink-500 text-sm mb-2">
              Registering as {role.charAt(0).toUpperCase() + role.slice(1)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="First Name"
                className="flex-1 bg-white border border-ink-200 px-4 py-3 rounded-xl mt-1 text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
              />
              <input
                type="text"
                required
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Last Name"
                className="flex-1 bg-white border border-ink-200 px-4 py-3 rounded-xl mt-1 text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
              />
            </div>

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
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <div className="mt-6 flex gap-1 items-center justify-center text-sm">
        <p className="text-ink-500">
              Already have an account?{" "}
              <Link
                href={`/auth/login?role=${role}`}
                className="font-semibold text-brand-600 hover:text-brand-700 transition"
              >
                Log in
              </Link>
            </p>
        </div>
        </div>

      </main>
    );
}

export default function Register() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RegisterContent />
        </Suspense>
    );
}
