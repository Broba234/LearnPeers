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
                // new comments here
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
                case "admin":
                    homePath = "/dashboard";
                    break;
                default:
                    homePath = "/admin/login";
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
        <main className="min-h-screen w-full flex flex-col items-center justify-center px-4" style={{
            background: 'linear-gradient(to bottom, #2b3340, #23272f, #181a1b)'
        }}>
            <div className="max-w-sm w-full space-y-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20" style={{ boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)' }}>
                <div className="text-center">
                    <div className="mt-5 space-y-2">
                        <h3 className="text-gray-100 text-2xl font-bold sm:text-3xl">Log in to your account</h3>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="font-medium text-white">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full mt-2 px-3 py-2 text-white bg-transparent outline-none border border-white/30 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40 shadow-sm rounded-lg placeholder-gray-300"
                        />
                    </div>
                    <div>
                        <label className="font-medium text-white">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full mt-2 px-3 py-2 text-white bg-transparent outline-none border border-white/30 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40 shadow-sm rounded-lg placeholder-gray-300"
                        />
                    </div>
                    {error && <div className="text-red-400 text-sm">{error}</div>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-2 text-white font-medium bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 active:from-brand-600 active:to-brand-700 rounded-lg duration-150 shadow-lg"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>
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
