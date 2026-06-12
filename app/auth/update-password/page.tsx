"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isInvalidLink, setIsInvalidLink] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            // Supabase automatically establishes session from URL hash when user lands from reset email
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsReady(true);
                return;
            }
            // If no hash in URL, user arrived directly (invalid/expired link)
            if (typeof window !== "undefined" && !window.location.hash) {
                setIsInvalidLink(true);
                setIsReady(true);
                return;
            }
            // Hash present but no session yet - give Supabase a moment to process
            await new Promise((r) => setTimeout(r, 500));
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
                setIsReady(true);
            } else {
                setIsInvalidLink(true);
                setIsReady(true);
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setMessage("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            setMessage("Password updated successfully. Redirecting to login...");
            setTimeout(() => router.push("/auth/login"), 1500);
        } catch (error: unknown) {
            const err = error as { message?: string };
            setMessage(err.message || "An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 text-gray-600">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    if (isInvalidLink) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Invalid or expired link
                    </h2>
                    <p className="text-gray-600">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link
                        href="/auth/reset"
                        className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
                    >
                        Request new reset link
                    </Link>
                    <div>
                        <Link href="/auth/login" className="text-sm text-brand-600 hover:text-brand-500">
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Set new password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your new password below.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="password" className="sr-only">
                                New password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                                placeholder="New password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="sr-only">
                                Confirm password
                            </label>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {isLoading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Updating...
                                </span>
                            ) : (
                                "Update password"
                            )}
                        </button>
                    </div>

                    {message && (
                        <p
                            className={`mt-2 text-center text-sm ${
                                message.includes("success") ? "text-green-600" : "text-red-600"
                            }`}
                        >
                            {message}
                        </p>
                    )}
                </form>

                <div className="text-center">
                    <button
                        onClick={() => router.push("/auth/login")}
                        className="text-sm text-brand-600 hover:text-brand-500"
                    >
                        Back to login
                    </button>
                </div>
            </div>
        </div>
    );
}
